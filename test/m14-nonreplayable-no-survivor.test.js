"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cliPath = path.join(__dirname, "..", "bin", "gotcha.js");

test(
  "non-replayable M8 result with zero survivors remains a successful no-survivor outcome",
  () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "gotcha-m14-nonreplayable-no-survivor-")
    );

    try {
      const transportLog = path.join(directory, "transport.log");
      const configPath = path.join(directory, "gotcha.config.js");
      const configSource = `"use strict";
const fs = require("node:fs");
const transportLog = ${JSON.stringify(transportLog)};

module.exports = {
  task: "Return the approved meeting time.",
  examples: [{
    id: "example-1",
    type: "judgment",
    input: "Schedule at 3 PM.",
    output: "Scheduled at 4 PM.",
    judgment: "bad",
    note: "The time changed."
  }],
  case: {
    input: { request: "Schedule at 3 PM." },
    expectedOutput: Object.freeze({ time: "3 PM" })
  },
  evaluator(output) {
    return output.time !== "5 PM";
  },
  provider: {
    model: "fake-model",
    transport(request) {
      fs.appendFileSync(transportLog, request.mode + "\\n");
      let output;
      if (request.mode === "quality-contract") {
        output = {
          version: 1,
          task: "Return the approved meeting time.",
          rules: [{
            id: "time-rule",
            statement: "The meeting time must be 3 PM.",
            kind: "required",
            severity: "major",
            confidence: "high",
            rationale: "The example rejects changed time.",
            evidence: [{ type: "example", exampleId: "example-1" }]
          }]
        };
      } else if (request.mode === "contract-attacks") {
        output = {
          version: 1,
          task: "Return the approved meeting time.",
          attacks: [{
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "Exercise the no-survivor product path.",
            mutatedOutput: { time: "5 PM" },
            scores: {
              realism: 0.9,
              subtlety: 0.9,
              novelty: 0.8,
              fixability: 1
            }
          }]
        };
      } else {
        throw new Error("protection transport must not run");
      }
      return {
        version: 1,
        kind: "gotcha-provider-response",
        output
      };
    }
  }
};
`;

      fs.writeFileSync(configPath, configSource);
      const result = spawnSync(
        process.execPath,
        [cliPath, "run", "--config", configPath],
        {
          cwd: directory,
          input: "accept\n",
          encoding: "utf8"
        }
      );

      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        result.stdout.includes("NO SURVIVING BLIND SPOT FOUND"),
        true
      );
      assert.equal(result.stdout.includes("PROPOSED PROTECTION"), false);
      assert.equal(result.stdout.includes("SESSION SAVED:"), false);
      assert.deepEqual(
        fs.readFileSync(transportLog, "utf8").trim().split("\n"),
        ["quality-contract", "contract-attacks"]
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
);
