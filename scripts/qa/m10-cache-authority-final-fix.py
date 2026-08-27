from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# Make the initialized M8 core the durable owner of the experiment authority.
replace_once(
    "src/contract-attacks-core.js",
    '// Initialize cache-stable experiment authorities alongside the M8 core.\nrequire("./contract-experiment-intrinsics");',
    '// Initialize and retain experiment authorities on the M8 core instance.\n// Consumers must retrieve this exact object from the cached core rather than\n// re-requiring the dependency, so selective dependency-cache eviction cannot\n// create a divergent authority.\nconst experimentIntrinsics =\n  require("./contract-experiment-intrinsics");'
)

replace_once(
    "src/contract-attacks-core.js",
    'module.exports = {\n  runContractAttacks\n};',
    'module.exports = {\n  runContractAttacks,\n  experimentIntrinsics\n};'
)

replace_once(
    "src/contract-experiment.js",
    '''const {\n  isProxy,\n  forbiddenProbes,\n  stringConstructor\n} = require("./contract-experiment-intrinsics");''',
    '''const {\n  experimentIntrinsics\n} = require("./contract-attacks-core");\nconst {\n  isProxy,\n  forbiddenProbes,\n  stringConstructor\n} = experimentIntrinsics;'''
)

replace_once(
    "src/contract-experiment-safe.js",
    '''const {\n  isProxy,\n  stringConstructor\n} = require("./contract-experiment-intrinsics");''',
    '''const {\n  experimentIntrinsics\n} = require("./contract-attacks-core");\nconst {\n  isProxy,\n  stringConstructor\n} = experimentIntrinsics;'''
)

# Add the exact selective-cache-eviction regression from Codex.
test_path = Path("test/contract-experiment-cache-authority-regression.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

test("selective intrinsics cache eviction cannot diverge from cached M8 core", () => {
  const script = String.raw`
    "use strict";
    const corePath = require.resolve("./src/contract-attacks-core");
    const intrinsicsPath = require.resolve("./src/contract-experiment-intrinsics");
    const core = require(corePath);
    const originalAuthority = core.experimentIntrinsics;

    delete require.cache[intrinsicsPath];

    const util = require("node:util");
    const originalIsDate = util.types.isDate;
    util.types.isDate = () => true;

    const { runContractAttacks } = require("./src/contract-attacks");
    util.types.isDate = originalIsDate;

    if (require(corePath).experimentIntrinsics !== originalAuthority) {
      process.exit(3);
    }

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
  `;

  const child = spawnSync(
    process.execPath,
    ["-e", script],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(
    child.status,
    0,
    child.stderr || child.stdout
  );
});
''')
