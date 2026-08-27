"use strict";

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
