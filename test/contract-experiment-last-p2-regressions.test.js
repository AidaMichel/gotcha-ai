"use strict";

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
            globalThis.String = function poisonedString(value) {
    const stack = new Error().stack || "";
    if (stack.includes("generatorSurfaceIsSafe")) {
      throw new Error("mutable global String must not be used by experiment capture");
    }
    return originalString(value);
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
