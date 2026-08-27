from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# Build the experiment authority directly inside the M8 core at core-init time.
replace_once(
    "src/contract-attacks-core.js",
    '''const {\n  types: utilTypes\n} = require("node:util");\n\n// Initialize and retain experiment authorities on the M8 core instance.\n// Consumers must retrieve this exact object from the cached core rather than\n// re-requiring the dependency, so selective dependency-cache eviction cannot\n// create a divergent authority.\nconst experimentIntrinsics =\n  require("./contract-experiment-intrinsics");\n''',
    '''const {\n  types: utilTypes\n} = require("node:util");\nconst {\n  Buffer: BufferConstructor\n} = require("node:buffer");\nconst {\n  runInNewContext\n} = require("node:vm");\n\n// The M8 core owns the experiment authority. It is created from the same\n// util.types instance observed by this core plus pristine VM operations at\n// core initialization, then retained on the cached core export. No separately\n// cacheable dependency can predate or outlive this authority.\nconst experimentPristine =\n  runInNewContext(`({\n    freeze: Object.freeze,\n    stringConstructor: String,\n    defineProperty: Object.defineProperty,\n    jsonStringify: JSON.stringify,\n    jsonParse: JSON.parse\n  })`);\n\nconst experimentForbiddenProbes =\n  experimentPristine.freeze([\n    utilTypes.isDate,\n    utilTypes.isRegExp,\n    utilTypes.isMap,\n    utilTypes.isSet,\n    utilTypes.isWeakMap,\n    utilTypes.isWeakSet,\n    utilTypes.isPromise,\n    utilTypes.isNativeError,\n    utilTypes.isAnyArrayBuffer,\n    utilTypes.isDataView,\n    utilTypes.isTypedArray,\n    utilTypes.isBoxedPrimitive,\n    utilTypes.isArgumentsObject,\n    utilTypes.isGeneratorObject,\n    utilTypes.isModuleNamespaceObject,\n    utilTypes.isMapIterator,\n    utilTypes.isSetIterator,\n    utilTypes.isExternal,\n    BufferConstructor.isBuffer\n  ]);\n\nconst experimentIntrinsics =\n  experimentPristine.freeze({\n    isProxy: utilTypes.isProxy,\n    forbiddenProbes: experimentForbiddenProbes,\n    stringConstructor:\n      experimentPristine.stringConstructor,\n    defineProperty:\n      experimentPristine.defineProperty,\n    jsonStringify:\n      experimentPristine.jsonStringify,\n    jsonParse:\n      experimentPristine.jsonParse\n  });\n'''
)

replace_once(
    "src/contract-attacks.js",
    '''const {\n  runContractAttacks:\n    runContractAttacksCore\n} = require("./contract-attacks-core");''',
    '''const {\n  runContractAttacks:\n    runContractAttacksCore,\n  experimentIntrinsics\n} = require("./contract-attacks-core");'''
)
replace_once(
    "src/contract-attacks.js",
    '''const defineProperty =\n  Object.defineProperty;''',
    '''const defineProperty =\n  experimentIntrinsics.defineProperty;'''
)

replace_once(
    "src/contract-experiment.js",
    '''const {\n  isProxy,\n  forbiddenProbes,\n  stringConstructor\n} = experimentIntrinsics;''',
    '''const {\n  isProxy,\n  forbiddenProbes,\n  stringConstructor,\n  jsonStringify,\n  jsonParse\n} = experimentIntrinsics;'''
)
replace_once(
    "src/contract-experiment.js",
    '''const jsonStringify = JSON.stringify;\nconst jsonParse = JSON.parse;\n''',
    ''''''
)

# The former authority module is now dead code and, more importantly, would
# reintroduce a separately-cacheable initialization surface if retained.
Path("src/contract-experiment-intrinsics.js").unlink()

# Focused regressions for all three exact Codex findings.
Path("test/contract-experiment-final-authority-regressions.test.js").write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

function runChild(script) {
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
}

const runCase = String.raw`
  const contract = {
    version: 1,
    status: "confirmed",
    task: "Return approved time.",
    rules: [{
      id: "r1",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    }]
  };
  return runContractAttacks({
    contract,
    input: { request: "schedule" },
    expectedOutput: { time: "3 PM" },
    evaluator(output) { return output.time === "3 PM"; },
    generator() {
      return { version: 1, task: contract.task, attacks: [] };
    }
  }).then(result => {
    if (result.experiment.replayable !== true) process.exit(2);
  });
`;

test("wrapper append uses the core-owned defineProperty authority", () => {
  runChild(String.raw`
    "use strict";
    require("./src/contract-attacks-core");
    const original = Object.defineProperty;
    Object.defineProperty = function poisonedDefineProperty() {
      throw new Error("late wrapper capture must not run");
    };
    const { runContractAttacks } = require("./src/contract-attacks");
    Object.defineProperty = original;
    (async () => { ${runCase} })().catch(error => {
      console.error(error);
      process.exit(1);
    });
  `);
});

test("wire probing uses core-owned JSON authorities", () => {
  runChild(String.raw`
    "use strict";
    require("./src/contract-attacks-core");
    const originalStringify = JSON.stringify;
    const originalParse = JSON.parse;
    JSON.stringify = function poisonedStringify() {
      throw new Error("late JSON stringify capture must not run");
    };
    JSON.parse = function poisonedParse() {
      throw new Error("late JSON parse capture must not run");
    };
    const { runContractAttacks } = require("./src/contract-attacks");
    JSON.stringify = originalStringify;
    JSON.parse = originalParse;
    (async () => { ${runCase} })().catch(error => {
      console.error(error);
      process.exit(1);
    });
  `);
});

test("core authority does not depend on a preloaded experiment-intrinsics module", () => {
  runChild(String.raw`
    "use strict";
    const fs = require("node:fs");
    const oldPath = require("node:path").resolve(
      process.cwd(),
      "src/contract-experiment-intrinsics.js"
    );
    if (fs.existsSync(oldPath)) process.exit(3);

    const util = require("node:util");
    const originalIsDate = util.types.isDate;
    util.types.isDate = () => true;
    util.types.isDate = originalIsDate;

    const { runContractAttacks } = require("./src/contract-attacks");
    (async () => { ${runCase} })().catch(error => {
      console.error(error);
      process.exit(1);
    });
  `);
});
''')
