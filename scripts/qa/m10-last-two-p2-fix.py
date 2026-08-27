from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# Cache-stable authorities are loaded with the M8 core, before the public
# wrapper/experiment layer can observe a later temporarily-tampered realm.
Path("src/contract-experiment-intrinsics.js").write_text('''"use strict";\n\nconst {\n  types: utilTypes\n} = require("node:util");\nconst {\n  Buffer: BufferConstructor\n} = require("node:buffer");\nconst {\n  runInNewContext\n} = require("node:vm");\n\nconst pristineFreeze =\n  runInNewContext("Object.freeze");\nconst pristineString =\n  runInNewContext("String");\n\nconst forbiddenProbes = pristineFreeze([\n  utilTypes.isDate,\n  utilTypes.isRegExp,\n  utilTypes.isMap,\n  utilTypes.isSet,\n  utilTypes.isWeakMap,\n  utilTypes.isWeakSet,\n  utilTypes.isPromise,\n  utilTypes.isNativeError,\n  utilTypes.isAnyArrayBuffer,\n  utilTypes.isDataView,\n  utilTypes.isTypedArray,\n  utilTypes.isBoxedPrimitive,\n  utilTypes.isArgumentsObject,\n  utilTypes.isGeneratorObject,\n  utilTypes.isModuleNamespaceObject,\n  utilTypes.isMapIterator,\n  utilTypes.isSetIterator,\n  utilTypes.isExternal,\n  BufferConstructor.isBuffer\n]);\n\nmodule.exports = pristineFreeze({\n  isProxy: utilTypes.isProxy,\n  forbiddenProbes,\n  stringConstructor: pristineString\n});\n''')

replace_once(
    "src/contract-attacks-core.js",
    'const {\n  types: utilTypes\n} = require("node:util");\n',
    'const {\n  types: utilTypes\n} = require("node:util");\n\n// Initialize cache-stable experiment authorities alongside the M8 core.\nrequire("./contract-experiment-intrinsics");\n'
)

replace_once(
    "src/contract-attacks.js",
    '''const {\n  buildExperiment,\n  createExperimentCapture,\n  createGeneratorEvidenceRecorder\n} = require("./contract-experiment-safe");\n\nconst {\n  runContractAttacks:\n    runContractAttacksCore\n} = require("./contract-attacks-core");''',
    '''const {\n  runContractAttacks:\n    runContractAttacksCore\n} = require("./contract-attacks-core");\n\nconst {\n  buildExperiment,\n  createExperimentCapture,\n  createGeneratorEvidenceRecorder\n} = require("./contract-experiment-safe");'''
)

replace_once(
    "src/contract-experiment.js",
    '''const {\n  types: utilTypes\n} = require("node:util");\nconst {\n  runInNewContext\n} = require("node:vm");\nconst {\n  Buffer: BufferConstructor\n} = require("node:buffer");\n\nconst isProxy = utilTypes.isProxy;\nconst forbiddenProbes = [\n  utilTypes.isDate,\n  utilTypes.isRegExp,\n  utilTypes.isMap,\n  utilTypes.isSet,\n  utilTypes.isWeakMap,\n  utilTypes.isWeakSet,\n  utilTypes.isPromise,\n  utilTypes.isNativeError,\n  utilTypes.isAnyArrayBuffer,\n  utilTypes.isDataView,\n  utilTypes.isTypedArray,\n  utilTypes.isBoxedPrimitive,\n  utilTypes.isArgumentsObject,\n  utilTypes.isGeneratorObject,\n  utilTypes.isModuleNamespaceObject,\n  utilTypes.isMapIterator,\n  utilTypes.isSetIterator,\n  utilTypes.isExternal,\n  BufferConstructor.isBuffer\n];''',
    '''const {\n  runInNewContext\n} = require("node:vm");\nconst {\n  isProxy,\n  forbiddenProbes,\n  stringConstructor\n} = require("./contract-experiment-intrinsics");'''
)

# Remove every remaining dynamic global String(index) lookup in the experiment
# layer. Index-to-key conversion now uses the cache-stable captured authority.
p = Path("src/contract-experiment.js")
text = p.read_text()
text = text.replace("String(index)", "stringConstructor(index)")
p.write_text(text)

replace_once(
    "src/contract-experiment-safe.js",
    '''const {\n  types: utilTypes\n} = require("node:util");\nconst {\n  runInNewContext\n} = require("node:vm");''',
    '''const {\n  runInNewContext\n} = require("node:vm");\nconst {\n  isProxy,\n  stringConstructor\n} = require("./contract-experiment-intrinsics");'''
)

replace_once(
    "src/contract-experiment-safe.js",
    "const isProxy = utilTypes.isProxy;\n",
    ""
)

p = Path("src/contract-experiment-safe.js")
text = p.read_text()
text = text.replace("String(index)", "stringConstructor(index)")
p.write_text(text)

# Focused regressions for the two exact Codex findings.
test_path = Path("test/contract-experiment-last-p2-regressions.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

function runChild(script) {
  const child = spawnSync(
    process.execPath,
    ["-e", script],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(
    child.status,
    0,
    child.stderr || child.stdout
  );
}

test("generator evidence ignores a callback-time global String replacement", () => {
  runChild(String.raw`
    "use strict";
    const { runContractAttacks } = require("./src/contract-attacks");
    const originalString = globalThis.String;
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

    (async () => {
      try {
        const result = await runContractAttacks({
          contract,
          input: { request: "schedule" },
          expectedOutput: { time: "3 PM" },
          evaluator(output) {
            return output.time === "3 PM";
          },
          generator() {
            globalThis.String = function poisonedString() {
              throw new Error("mutable global String must not be used");
            };
            return {
              version: 1,
              task: contract.task,
              attacks: [{
                id: "a1",
                ruleId: "r1",
                type: "wrong-time",
                description: "wrong time",
                rationale: "violates rule",
                mutatedOutput: { time: "4 PM" },
                scores: {
                  realism: 0.5,
                  subtlety: 0.5,
                  novelty: 0.5,
                  fixability: 0.5
                }
              }]
            };
          }
        });
        if (result.experiment.replayable !== true) process.exit(2);
      } finally {
        globalThis.String = originalString;
      }
    })().catch(error => {
      globalThis.String = originalString;
      console.error(error);
      process.exit(1);
    });
  `);
});

test("experiment brand probes stay aligned when the core was initialized first", () => {
  runChild(String.raw`
    "use strict";
    require("./src/contract-attacks-core");
    const util = require("node:util");
    const originalIsDate = util.types.isDate;
    util.types.isDate = () => true;
    const { runContractAttacks } = require("./src/contract-attacks");
    util.types.isDate = originalIsDate;

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

    runContractAttacks({
      contract,
      input: { request: "schedule" },
      expectedOutput: { time: "3 PM" },
      evaluator(output) {
        return output.time === "3 PM";
      },
      generator() {
        return {
          version: 1,
          task: contract.task,
          attacks: []
        };
      }
    }).then(result => {
      if (result.experiment.replayable !== true) process.exit(2);
    }).catch(error => {
      console.error(error);
      process.exit(1);
    });
  `);
});
''')
