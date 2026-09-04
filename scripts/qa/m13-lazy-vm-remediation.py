from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()
runtime = replace_once(
    runtime,
    "const exported = {\n  isProxy,",
    "const exported = {\n  objectFreeze: pristineObjectFreeze,\n  isProxy,",
    "runtime authority export",
)
runtime_path.write_text(runtime)

core_path = Path("src/contract-attacks-core.js")
core = core_path.read_text()
core = replace_once(
    core,
    'const {\n  runInNewContext\n} = require("node:vm");\n\n',
    "",
    "remove mutable node:vm import",
)
core = replace_once(
    core,
    "// The M8 core owns the experiment authority. It is created from the same\n"
    "// util.types instance observed by this core plus pristine VM operations at\n"
    "// core initialization, then retained on the cached core export. No separately\n"
    "// cacheable dependency can predate or outlive this authority.\n"
    "const experimentFreeze =\n"
    '  runInNewContext("Object.freeze");',
    "// The M8 core owns the experiment authority. It is created from the same\n"
    "// authenticated runtime generation used by the package root and retained on\n"
    "// the cached core export. No separately mutable builtin authority is invoked\n"
    "// when this legacy core is loaded lazily.\n"
    "const experimentFreeze =\n"
    "  runtimeAuthority.objectFreeze;",
    "route M8 freeze through authenticated runtime authority",
)
core_path.write_text(core)

test_path = Path("test/m13-review-remediation.test.js")
test_text = test_path.read_text()
marker = 'test("round9 preloaded vm replacement never executes through lazy runContractAttacks load", () => {'
if marker not in test_text:
    test_text += r'''


test("round9 preloaded vm replacement never executes through lazy runContractAttacks load", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const original = Object.getOwnPropertyDescriptor(vm, "runInNewContext");
    let poisonCalls = 0;
    Object.defineProperty(vm, "runInNewContext", {
      value: function runInNewContext() {
        poisonCalls += 1;
        throw new Error("poisoned lazy vm authority executed");
      },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    let publicFn;
    try {
      api = require(${JSON.stringify(indexPath)});
      if (poisonCalls !== 0) process.exitCode = 81;
      try { publicFn = api.runContractAttacks; }
      catch (error) {
        console.error(error && error.stack || error);
        process.exitCode = 82;
      }
      if (poisonCalls !== 0) process.exitCode = 83;
      if (typeof publicFn !== "function") process.exitCode = 84;
    } finally {
      Object.defineProperty(vm, "runInNewContext", original);
    }
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
'''
test_path.write_text(test_text)

print("Applied M13 lazy-VM authority remediation and permanent regression.")
