from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# Centralize vm.isContext and vm.Script private-brand probes in runtime-authority.
runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()
old = '''const freshVmIsContext = hasFreshVmAuthority\n  ? bootstrapOwnDataValue(vmModule, "isContext")\n  : null;\nfunction isVmContext(value) {\n  if (typeof freshVmIsContext !== "function") return false;\n  try {\n    return pristineReflectApply(freshVmIsContext, vmModule, [value]) === true;\n  } catch {\n    return true;\n  }\n}\n'''
new = '''const freshVmIsContext = hasFreshVmAuthority\n  ? bootstrapOwnDataValue(vmModule, "isContext")\n  : null;\n\nlet freshVmScriptCreateCachedData = null;\nif (hasFreshVmAuthority) {\n  try {\n    const scriptConstructor = bootstrapOwnDataValue(vmModule, "Script");\n    const scriptPrototype = bootstrapOwnDataValue(scriptConstructor, "prototype");\n    const scriptBasePrototype = pristineReflectApply(\n      pristineGetPrototypeOf,\n      undefined,\n      [scriptPrototype]\n    );\n    freshVmScriptCreateCachedData = bootstrapOwnDataValue(\n      scriptBasePrototype,\n      "createCachedData"\n    );\n  } catch {\n    freshVmScriptCreateCachedData = null;\n  }\n}\n\nconst vmRuntimeBrandAuthorityAvailable = (\n  typeof freshVmIsContext === "function" &&\n  typeof freshVmScriptCreateCachedData === "function"\n);\n\nfunction isVmContext(value) {\n  if (vmRuntimeBrandAuthorityAvailable !== true) return true;\n  if (isProxy(value)) return true;\n  try {\n    return pristineReflectApply(freshVmIsContext, vmModule, [value]) === true;\n  } catch {\n    return true;\n  }\n}\n\nfunction isVmScript(value) {\n  if (vmRuntimeBrandAuthorityAvailable !== true) return true;\n  if (isProxy(value)) return true;\n  try {\n    pristineReflectApply(freshVmScriptCreateCachedData, value, []);\n    return true;\n  } catch {\n    return false;\n  }\n}\n'''
runtime = replace_once(runtime, old, new, "runtime vm brand authority")
old = '''const consumerPrimordialsAvailable = (\n  consumerPrimordialsBundleAvailable === true &&\n  typeof arrayIsArray === "function" &&'''
new = '''const consumerPrimordialsAvailable = (\n  consumerPrimordialsBundleAvailable === true &&\n  vmRuntimeBrandAuthorityAvailable === true &&\n  typeof arrayIsArray === "function" &&'''
runtime = replace_once(runtime, old, new, "gate consumer authority on vm brands")
old = '''  finalizationRegistryConstructor: consumerFinalizationRegistryConstructor,\n  isVmContext,\n  isProxy,'''
new = '''  finalizationRegistryConstructor: consumerFinalizationRegistryConstructor,\n  vmRuntimeBrandAuthorityAvailable,\n  isVmContext,\n  isVmScript,\n  isProxy,'''
runtime = replace_once(runtime, old, new, "export vm brand authority")
runtime_path.write_text(runtime)


# AI-data must never read mutable node:vm exports directly.
ai_path = Path("src/ai-data-core.js")
ai = ai_path.read_text()
ai = replace_once(
    ai,
    'const vm =\n  require("node:vm");\n\n',
    '',
    "remove ai-data node:vm import",
)
ai = replace_once(
    ai,
    'const vmIsContext =\n  typeof vm.isContext === "function"\n    ? vm.isContext\n    : null;\n\n',
    '',
    "remove ai-data vm.isContext capture",
)
ai = replace_once(
    ai,
    '''const vmScriptBasePrototype =\n  typeof vm.Script === "function" &&\n  vm.Script.prototype !== null &&\n  typeof vm.Script.prototype ===\n    "object"\n    ? getPrototypeOf(\n        vm.Script.prototype\n      )\n    : null;\n\nconst vmScriptCreateCachedData =\n  captureMethodFromPrototype(\n    vmScriptBasePrototype,\n    "createCachedData"\n  );\n\n''',
    '',
    "remove ai-data vm.Script authority",
)
ai = replace_once(
    ai,
    '''  if (vmScriptCreateCachedData !== null) {\n    try {\n      reflectApply(\n        vmScriptCreateCachedData,\n        value,\n        []\n      );\n\n      return true;\n    } catch {}\n  }\n''',
    '''  if (runtimeAuthority.isVmScript(value)) {\n    return true;\n  }\n''',
    "route vm.Script brand through runtime authority",
)
ai = replace_once(
    ai,
    '''    (\n      vmIsContext !== null &&\n      reflectApply(\n        vmIsContext,\n        vm,\n        [value]\n      )\n    ) ||''',
    '''    runtimeAuthority.isVmContext(value) ||''',
    "route vm context brand through runtime authority",
)
ai_path.write_text(ai)


# Permanent regression: neither vm.isContext nor vm.Script may execute after preload.
test_path = Path("test/m13-review-remediation.test.js")
test = test_path.read_text()
marker = 'test("round10 preloaded vm brand replacements never execute through AI-data", () => {'
if marker not in test:
    test += r'''


test("round10 preloaded vm brand replacements never execute through AI-data", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const aiDataPath = path.join(repoRoot, "src", "ai-data.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const isContextDescriptor = Object.getOwnPropertyDescriptor(vm, "isContext");
    const scriptDescriptor = Object.getOwnPropertyDescriptor(vm, "Script");
    let calls = 0;
    Object.defineProperty(vm, "isContext", {
      value: function isContext() {
        calls += 1;
        throw new Error("poisoned vm.isContext executed");
      },
      writable: true,
      enumerable: isContextDescriptor.enumerable,
      configurable: true
    });
    Object.defineProperty(vm, "Script", {
      get() {
        calls += 1;
        throw new Error("poisoned vm.Script accessor executed");
      },
      set: undefined,
      enumerable: scriptDescriptor.enumerable,
      configurable: true
    });

    (async () => {
      try {
        const api = require(${JSON.stringify(indexPath)});
        const contract = {
          version: 1,
          status: "confirmed",
          task: "Return the approved time.",
          rules: [{
            id: "time-rule",
            statement: "Time must be 3 PM.",
            kind: "required",
            severity: "major"
          }]
        };
        try {
          await api.runContractAttacks({
            contract,
            input: { request: "Schedule the meeting." },
            expectedOutput: { time: "3 PM" },
            evaluator(output) { return output.time === "3 PM"; },
            generator() { return { version: 1, task: contract.task, attacks: [] }; }
          });
        } catch {}
        if (calls !== 0) process.exitCode = 91;

        delete require.cache[require.resolve(${JSON.stringify(aiDataPath)})];
        try {
          const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
          cloneAiData({ safe: true });
          process.exitCode = 92;
        } catch {}
        if (calls !== 0) process.exitCode = 93;
      } finally {
        Object.defineProperty(vm, "isContext", isContextDescriptor);
        Object.defineProperty(vm, "Script", scriptDescriptor);
      }
    })().catch((error) => {
      console.error(error && error.stack || error);
      process.exitCode = 94;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round10 runtime-authority is the sole node:vm consumer", () => {
  const fs = require("node:fs");
  const sourceDir = path.join(repoRoot, "src");
  const offenders = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".js") || name === "runtime-authority.js") continue;
    const source = fs.readFileSync(path.join(sourceDir, name), "utf8");
    if (source.includes('require("node:vm")') || source.includes("runInNewContext")) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, []);
});
'''
test_path.write_text(test)

print("Applied fail-closed centralized node:vm brand authority remediation.")
