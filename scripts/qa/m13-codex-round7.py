from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    text = text.replace(old, new, 1)
    path.write_text(text)


# 1) Export descriptor authority captured before runtime-authority touches mutable builtin exports.
package_path = ROOT / "src" / "package-authority.js"
replace_once(
    package_path,
    'module.exports = Object.freeze({\n  PromiseConstructor,',
    'module.exports = Object.freeze({\n  GetOwnPropertyDescriptor: getOwnPropertyDescriptor,\n  PromiseConstructor,',
    "package descriptor authority export",
)


# 2) Make node:vm/node:buffer export capture descriptor-safe.
runtime_path = ROOT / "src" / "runtime-authority.js"
replace_once(
    runtime_path,
    '''const packageAuthority = require("./package-authority");
const { Buffer: BufferConstructor } = require("node:buffer");
const { runInNewContext } = require("node:vm");
''',
    '''const packageAuthority = require("./package-authority");
const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;

function bootstrapDataValue(modulePath, key) {
  if (typeof bootstrapGetOwnPropertyDescriptor !== "function") return null;
  try {
    const moduleObject = require(modulePath);
    const descriptor = bootstrapGetOwnPropertyDescriptor(moduleObject, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

const BufferConstructor = bootstrapDataValue("node:buffer", "Buffer");
const runInNewContext = bootstrapDataValue("node:vm", "runInNewContext");

if (
  typeof BufferConstructor !== "function" ||
  typeof runInNewContext !== "function"
) {
  null.gotchaRuntimeBootstrapAuthority;
}
''',
    "descriptor-safe vm/buffer bootstrap",
)

# 3) Authenticate the V8 flag setter by its exact supported-runtime implementation,
# without touching candidate properties/prototype before trap-free isProxy exists.
old_v8 = '''function captureSetFlagsFromString() {
  try {
    const v8Module = require("node:v8");
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [v8Module, "setFlagsFromString"]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      typeof candidate === "function" &&
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      typeof source === "string" &&
      pristineReflectApply(
        pristineStringStartsWith,
        source,
        ["function setFlagsFromString("]
      ) === true
    ) {
      return candidate;
    }
  } catch {}
  return null;
}
'''
new_v8 = '''const supportedSetFlagsFromStringSource =
  "function setFlagsFromString(flags) {\\n" +
  "  validateString(flags, 'flags');\\n" +
  "  _setFlagsFromString(flags);\\n" +
  "}";

function captureSetFlagsFromString() {
  try {
    const v8Module = require("node:v8");
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [v8Module, "setFlagsFromString"]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      descriptor !== undefined &&
      descriptor.writable === true &&
      descriptor.enumerable === true &&
      descriptor.configurable === true &&
      typeof candidate === "function" &&
      source === supportedSetFlagsFromStringSource
    ) {
      return candidate;
    }
  } catch {}
  return null;
}
'''
replace_once(runtime_path, old_v8, new_v8, "exact v8 setter authentication")

# 4) Brand probes must really be V8 native probes; ordinary local replacements are never retained.
old_probe = '''function nativeProbe(name) {
  if (
    utilTypesAuthority === null ||
    typeof utilTypesAuthority !== "object"
  ) return null;
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilTypesAuthority, name]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    if (typeof candidate !== "function" || isProxy(candidate)) return null;
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    if (
      typeof source !== "string" ||
      (
        !pristineReflectApply(
          pristineStringStartsWith,
          source,
          ["function "]
        ) &&
        !pristineReflectApply(
          pristineStringStartsWith,
          source,
          ["("]
        )
      )
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}
'''
new_probe = '''function nativeProbe(name) {
  if (
    utilTypesAuthority === null ||
    typeof utilTypesAuthority !== "object"
  ) return null;
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilTypesAuthority, name]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    if (
      descriptor === undefined ||
      descriptor.writable !== true ||
      descriptor.enumerable !== true ||
      descriptor.configurable !== true ||
      typeof candidate !== "function" ||
      isProxy(candidate)
    ) return null;
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    const namedNativeSource =
      "function " + name + "() { [native code] }";
    if (
      source !== namedNativeSource &&
      source !== "function () { [native code] }"
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}
'''
replace_once(runtime_path, old_probe, new_probe, "native-only util.types probes")

# Harden BufferConstructor itself before descriptor operations can reach a Proxy trap.
replace_once(
    runtime_path,
    '''let bufferIsBuffer = unavailableBrandProbe;
try {
  const descriptor = pristineReflectApply(
''',
    '''let bufferIsBuffer = unavailableBrandProbe;
try {
  if (isProxy(BufferConstructor)) throw new Error("untrusted Buffer constructor");
  const descriptor = pristineReflectApply(
''',
    "buffer constructor proxy guard",
)


# 5) Safe-to-consume but unshieldable generator Promises are still outside the accepted
# Architecture Revision 2 async-candidate boundary. Consume rejection safety, then reject.
proposal_path = ROOT / "src" / "contract-protection-proposal.js"
replace_once(
    proposal_path,
    '''  if (
    previousConstructor !== undefined &&
    previousConstructor.configurable !== true
  ) {
    if (trustedPromiseConstructorDescriptor(previousConstructor)) {
      reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
      return;
    }
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
  if (
    previousConstructor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) throw boundaryError();
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
''',
    '''  if (
    previousConstructor !== undefined &&
    previousConstructor.configurable !== true
  ) {
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
  if (
    previousConstructor === undefined &&
    isExtensible(promise) !== true
  ) {
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
''',
    "reject unshieldable accepted promises",
)


# 6) Keep one coherent authority generation if internal consumers were preloaded.
index_path = ROOT / "src" / "index.js"
old_index = '''const packageAuthorityModules = [
  "./package-authority",
  "./runtime-authority",
  "./ai-data-core",
  "./provider-adapter"
];
for (const modulePath of packageAuthorityModules) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {}
}

const packageAuthority = require("./package-authority");
'''
new_index = '''const authorityRootModulePaths = [
  "./package-authority",
  "./runtime-authority",
  "./provider-adapter"
];
const authorityRootIds = new Set();
for (const modulePath of authorityRootModulePaths) {
  try {
    authorityRootIds.add(require.resolve(modulePath));
  } catch {}
}

function cachedModuleReachesAuthority(moduleRecord, seen) {
  if (moduleRecord === undefined || moduleRecord === null) return false;
  if (authorityRootIds.has(moduleRecord.id)) return true;
  if (seen.has(moduleRecord.id)) return false;
  seen.add(moduleRecord.id);
  const children = Array.isArray(moduleRecord.children)
    ? moduleRecord.children
    : [];
  for (let index = 0; index < children.length; index += 1) {
    if (cachedModuleReachesAuthority(children[index], seen)) return true;
  }
  return false;
}

for (const id of Object.keys(require.cache)) {
  const moduleRecord = require.cache[id];
  if (moduleRecord === module) continue;
  if (
    id !== __dirname &&
    !id.startsWith(__dirname + "/") &&
    !id.startsWith(__dirname + "\\\\")
  ) continue;
  if (cachedModuleReachesAuthority(moduleRecord, new Set())) {
    delete require.cache[id];
  }
}
for (const id of authorityRootIds) {
  delete require.cache[id];
}

const packageAuthority = require("./package-authority");
'''
replace_once(index_path, old_index, new_index, "transitive authority cache reset")


# 7) Permanent regressions for every unique fresh Codex finding.
test_path = ROOT / "test" / "m13-review-remediation.test.js"
test_text = test_path.read_text()
marker = 'test("round7 V8 setter replacement is never executed during bootstrap"'
if marker not in test_text:
    test_text += r'''

test("round7 V8 setter replacement is never executed during bootstrap", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const v8 = require("node:v8");
    const original = Object.getOwnPropertyDescriptor(v8, "setFlagsFromString");
    let calls = 0;
    function setFlagsFromString(flags) { calls += 1; }
    Object.defineProperty(v8, "setFlagsFromString", {
      value: setFlagsFromString,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(v8, "setFlagsFromString", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 2;
    if (calls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round7 ordinary util.types brand replacement is never retained", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    let types;
    try { types = require("node:util/types"); }
    catch { types = require("node:util").types; }
    const original = Object.getOwnPropertyDescriptor(types, "isDate");
    let calls = 0;
    function isDate(value) { calls += 1; return false; }
    Object.defineProperty(types, "isDate", {
      value: isDate,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(types, "isDate", original); }
    Promise.resolve(api.generateContractProtectionProposal({})).catch(() => {}).then(() => {
      if (calls !== 0) process.exitCode = 4;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round7 node vm and buffer bootstrap accessors are never invoked", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  for (const scenario of [
    ["node:vm", "runInNewContext"],
    ["node:buffer", "Buffer"]
  ]) {
    const code = `
      "use strict";
      const moduleObject = require(${JSON.stringify(scenario[0])});
      const key = ${JSON.stringify(scenario[1])};
      const original = Object.getOwnPropertyDescriptor(moduleObject, key);
      let calls = 0;
      Object.defineProperty(moduleObject, key, {
        get() { calls += 1; return original.value; },
        enumerable: original.enumerable,
        configurable: true
      });
      let loaded = false;
      try { require(${JSON.stringify(indexPath)}); loaded = true; }
      catch {}
      finally { Object.defineProperty(moduleObject, key, original); }
      if (calls !== 0) process.exitCode = 5;
      if (!loaded) process.exitCode = 6;
    `;
    const run = spawnSync(process.execPath, ["-e", code], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    assert.equal(run.status, 0, `${scenario.join(".")}: ${run.stderr || run.stdout}`);
  }
});

test("round7 unshieldable fulfilled generator promises are consumed then rejected", async () => {
  const experiment = await makeExperiment();

  const nonConfigurable = Promise.resolve(proposal());
  Object.defineProperty(nonConfigurable, "constructor", {
    value: Promise,
    writable: false,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return nonConfigurable; }
    }),
    TypeError
  );

  const nonExtensible = Promise.resolve(proposal());
  Object.preventExtensions(nonExtensible);
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return nonExtensible; }
    }),
    TypeError
  );
});

test("round7 package root reloads preloaded authority consumers coherently", () => {
  const corePath = path.join(repoRoot, "src", "contract-attacks-core.js");
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    require(${JSON.stringify(corePath)});
    const api = require(${JSON.stringify(indexPath)});
    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved time.",
      rules: [{ id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" }]
    };
    (async () => {
      const result = await api.runContractAttacks({
        contract,
        input: { request: "Schedule it." },
        expectedOutput: { time: "3 PM" },
        evaluator() { return true; },
        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [{
              id: "wrong-time",
              ruleId: "time-rule",
              type: "wrong-time",
              description: "Changes the time.",
              rationale: "Violates the rule.",
              mutatedOutput: { time: "4 PM" },
              scores: { realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.9 }
            }]
          };
        }
      });
      const generated = await api.generateContractProtectionProposal({
        experiment: result.experiment,
        sourceAttackId: "wrong-time",
        generator() {
          return {
            version: 1,
            task: contract.task,
            sourceAttackId: "wrong-time",
            ruleId: "time-rule",
            protection: {
              statement: "Require exactly 3 PM.",
              rationale: "The survivor changed the approved time."
            }
          };
        }
      });
      if (generated.state !== "proposal-ready") process.exitCode = 7;
    })().catch((error) => {
      console.error(error && error.stack || error);
      process.exitCode = 8;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
'''
    test_path.write_text(test_text)

print("round7 remediation applied")
