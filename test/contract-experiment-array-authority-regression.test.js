"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

test("experiment array construction stays aligned with an already-cached M8 core", () => {
  const script = String.raw`
    "use strict";
    require("./src/contract-attacks-core");

    const OriginalArray = globalThis.Array;
    function PoisonedArray() {
      throw new Error("late Array capture must not run");
    }
    PoisonedArray.isArray = OriginalArray.isArray;
    PoisonedArray.prototype = OriginalArray.prototype;

    globalThis.Array = PoisonedArray;
    const { runContractAttacks } = require("./src/contract-attacks");
    globalThis.Array = OriginalArray;

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
      evaluator(output) { return output.time === "3 PM"; },
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

  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(child.status, 0, child.stderr || child.stdout);
});
