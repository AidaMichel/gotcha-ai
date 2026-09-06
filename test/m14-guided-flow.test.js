"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const { spawnSync } = require("node:child_process");

const {
  createExplicitPromptSession
} = require("../src/guided-cli-foundation");
const {
  readSession
} = require("../src/guided-session");
const {
  displayedSurvivors
} = require("../src/guided-run");
const {
  parseVerifyArguments,
  collectProtectionDecision
} = require("../src/guided-verify");

const cliPath = path.join(__dirname, "..", "bin", "gotcha.js");

function withTempDirectory(prefix, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function runCli(cwd, args, input, extraEnv) {
  return spawnSync(
    process.execPath,
    [cliPath, ...args],
    {
      cwd,
      input: input === undefined ? "" : input,
      encoding: "utf8",
      env: {
        ...process.env,
        ...(extraEnv || {})
      }
    }
  );
}

function writeRunConfig(directory, logPath) {
  const configPath = path.join(directory, "gotcha.config.js");
  const source = `"use strict";
const fs = require("node:fs");
const logPath = ${JSON.stringify(logPath)};

module.exports = {
  task: "Return the approved meeting time.",
  examples: [
    {
      id: "example-1",
      type: "judgment",
      input: "Schedule the meeting at 3 PM.",
      output: "Meeting scheduled at 4 PM.",
      judgment: "bad",
      note: "The scheduled time changed."
    }
  ],
  case: {
    input: { request: "Schedule the meeting at 3 PM." },
    expectedOutput: { time: "3 PM" }
  },
  evaluator(output) {
    return output.time !== "5 PM";
  },
  provider: {
    model: "fake-model",
    transport(request) {
      fs.appendFileSync(logPath, request.mode + "\\n");
      let output;
      if (request.mode === "quality-contract") {
        output = {
          version: 1,
          task: "Return the approved meeting time.",
          rules: [
            {
              id: "time-rule",
              statement: "The meeting time must be 3 PM.",
              kind: "required",
              severity: "major",
              confidence: "high",
              rationale: "The teaching evidence rejects a changed meeting time.",
              evidence: [
                { type: "example", exampleId: "example-1" }
              ]
            }
          ]
        };
      } else if (request.mode === "contract-attacks") {
        output = {
          version: 1,
          task: "Return the approved meeting time.",
          attacks: [
            {
              id: "wrong-time",
              ruleId: "time-rule",
              type: "wrong-time",
              description: "Changes the approved meeting time.",
              rationale: "The current evaluator may accept the changed time.",
              mutatedOutput: {
                time: process.env.GOTCHA_TEST_ATTACK_TIME || "4 PM"
              },
              scores: {
                realism: 0.9,
                subtlety: 0.9,
                novelty: 0.8,
                fixability: 1
              }
            }
          ]
        };
      } else if (request.mode === "contract-protection") {
        output = {
          version: 1,
          task: "Return the approved meeting time.",
          sourceAttackId: "wrong-time",
          ruleId: "time-rule",
          protection: {
            statement: "Reject outputs whose meeting time is not 3 PM.",
            rationale: "The selected surviving attack changed the meeting time."
          }
        };
      } else {
        throw new Error("unexpected provider mode");
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
  fs.writeFileSync(configPath, source);
  return configPath;
}

function writeVerifyConfig(directory, fileName, source) {
  const configPath = path.join(directory, fileName);
  fs.writeFileSync(configPath, source);
  return configPath;
}

function produceSession(directory) {
  const transportLog = path.join(directory, "transport.log");
  const configPath = writeRunConfig(directory, transportLog);
  const sessionPath = path.join(directory, ".gotcha", "guided.json");
  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  const result = runCli(
    directory,
    ["run", "--config", configPath, "--session", sessionPath],
    "accept\n\n999\n1\n"
  );
  assert.equal(result.status, 0, result.stderr);
  return { configPath, sessionPath, transportLog, result };
}

test(
  "queued explicit prompt session preserves future piped answers across prompts",
  async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const session = createExplicitPromptSession({ input, output });
    input.end("accept\nsecond\n");

    try {
      const first = await session.prompt({
        message: "one: ",
        parse(answer) {
          return answer === "accept" ? answer : null;
        }
      });
      const second = await session.prompt({
        message: "two: ",
        parse(answer) {
          return answer === "second" ? answer : null;
        }
      });
      assert.equal(first, "accept");
      assert.equal(second, "second");
    } finally {
      session.close();
    }
  }
);

test(
  "guided run uses all three structured modes and writes the explicitly selected session",
  () => withTempDirectory("gotcha-m14-run-", (directory) => {
    const produced = produceSession(directory);
    const output = produced.result.stdout;

    assert.equal(output.includes("GOTCHA FINDINGS"), true);
    assert.equal(output.includes("Select one displayed finding explicitly."), true);
    assert.equal(output.includes("SELECTED FINDING: wrong-time"), true);
    assert.equal(output.includes("PROPOSED PROTECTION"), true);
    assert.equal(output.includes("has not been applied or verified"), true);

    const session = readSession(produced.sessionPath);
    assert.equal(session.sourceAttackId, "wrong-time");
    assert.equal(
      session.proposal.protection.statement,
      "Reject outputs whose meeting time is not 3 PM."
    );
    assert.deepEqual(
      fs.readFileSync(produced.transportLog, "utf8").trim().split("\n"),
      ["quality-contract", "contract-attacks", "contract-protection"]
    );
  })
);

test(
  "guided run stops successfully when every proposed rule is rejected",
  () => withTempDirectory("gotcha-m14-no-rules-", (directory) => {
    const logPath = path.join(directory, "transport.log");
    const configPath = writeRunConfig(directory, logPath);
    const result = runCli(directory, ["run", "--config", configPath], "reject\n");

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("NO ACTIVE RULES"), true);
    assert.equal(fs.readFileSync(logPath, "utf8").trim(), "quality-contract");
  })
);

test(
  "guided run stops successfully with no survivor and never asks for protection",
  () => withTempDirectory("gotcha-m14-no-survivor-", (directory) => {
    const logPath = path.join(directory, "transport.log");
    const configPath = writeRunConfig(directory, logPath);
    const result = runCli(
      directory,
      ["run", "--config", configPath],
      "accept\n",
      { GOTCHA_TEST_ATTACK_TIME: "5 PM" }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("NO SURVIVING BLIND SPOT FOUND"), true);
    assert.deepEqual(
      fs.readFileSync(logPath, "utf8").trim().split("\n"),
      ["quality-contract", "contract-attacks"]
    );
  })
);

test(
  "displayed findings are the first five exact bound survivor IDs without M14 reranking",
  () => {
    const ids = ["z", "y", "x", "w", "v", "u"];
    const attacks = ids.map((id) => ({ id }));
    const result = {
      experiment: {
        replayable: true,
        attacks,
        baseline: { survivorOrderIds: ids }
      }
    };
    const displayed = displayedSurvivors(result);
    assert.deepEqual(
      displayed.displayed.map((item) => item.id),
      ["z", "y", "x", "w", "v"]
    );
    assert.equal(displayed.total, 6);
  }
);

test(
  "verify accepts a verify-only config, performs no provider work, and reaches verified",
  () => withTempDirectory("gotcha-m14-verify-", (directory) => {
    const produced = produceSession(directory);
    const evaluatorLog = path.join(directory, "evaluator.log");
    const verifyConfig = writeVerifyConfig(
      directory,
      "verify.config.js",
      `"use strict";
const fs = require("node:fs");
const logPath = ${JSON.stringify(evaluatorLog)};
module.exports = {
  evaluator(output) {
    fs.appendFileSync(logPath, "baseline\\n");
    return output.time !== "5 PM";
  },
  improvedEvaluator(output) {
    fs.appendFileSync(logPath, "improved\\n");
    return output.time === "3 PM";
  }
};
`
    );
    const beforeTransport = fs.readFileSync(produced.transportLog, "utf8");
    const result = runCli(
      directory,
      ["verify", produced.sessionPath, "--config", verifyConfig],
      "accept\n"
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("CURRENT PROTECTION DRAFT"), true);
    assert.equal(result.stdout.includes("State: verified"), true);
    assert.equal(result.stdout.includes("Source finding caught: true"), true);
    assert.equal(result.stdout.includes("Eliminated attacks: wrong-time"), true);
    assert.equal(
      fs.readFileSync(produced.transportLog, "utf8"),
      beforeTransport
    );
    const evaluatorCalls = fs.readFileSync(evaluatorLog, "utf8");
    assert.equal(evaluatorCalls.includes("baseline"), true);
    assert.equal(evaluatorCalls.includes("improved"), true);
  })
);

test(
  "fresh verify rejection is a successful terminal state and executes neither evaluator",
  () => withTempDirectory("gotcha-m14-reject-", (directory) => {
    const produced = produceSession(directory);
    const marker = path.join(directory, "evaluator-called.log");
    const verifyConfig = writeVerifyConfig(
      directory,
      "reject.config.js",
      `"use strict";
const fs = require("node:fs");
const marker = ${JSON.stringify(marker)};
module.exports = {
  evaluator() { fs.appendFileSync(marker, "baseline\\n"); return true; },
  improvedEvaluator() { fs.appendFileSync(marker, "improved\\n"); return true; }
};
`
    );
    const result = runCli(
      directory,
      ["verify", produced.sessionPath, "--config", verifyConfig],
      "reject\n"
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("State: rejected"), true);
    assert.equal(result.stdout.includes("No verification or re-attack was run."), true);
    assert.equal(fs.existsSync(marker), false);
  })
);

test(
  "baseline mismatch is preserved and prevents improved evaluator execution",
  () => withTempDirectory("gotcha-m14-mismatch-", (directory) => {
    const produced = produceSession(directory);
    const marker = path.join(directory, "improved-called.log");
    const verifyConfig = writeVerifyConfig(
      directory,
      "mismatch.config.js",
      `"use strict";
const fs = require("node:fs");
const marker = ${JSON.stringify(marker)};
module.exports = {
  evaluator(output) { return output.time === "3 PM"; },
  improvedEvaluator() { fs.appendFileSync(marker, "called\\n"); return true; }
};
`
    );
    const result = runCli(
      directory,
      ["verify", produced.sessionPath, "--config", verifyConfig],
      "accept\n"
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes("State: baseline-mismatch"), true);
    assert.equal(result.stdout.includes("NOT VERIFIED"), true);
    assert.equal(fs.existsSync(marker), false);
  })
);

test(
  "mutating saved source evidence cannot bypass fresh M12/M10 preparation",
  () => withTempDirectory("gotcha-m14-mutate-", (directory) => {
    const produced = produceSession(directory);
    const raw = JSON.parse(fs.readFileSync(produced.sessionPath, "utf8"));
    raw.sourceAttackId = "not-a-survivor";
    fs.writeFileSync(produced.sessionPath, JSON.stringify(raw));
    const verifyConfig = writeVerifyConfig(
      directory,
      "verify.config.js",
      `module.exports = {
  evaluator(output) { return output.time !== "5 PM"; },
  improvedEvaluator(output) { return output.time === "3 PM"; }
};
`
    );
    const result = runCli(
      directory,
      ["verify", produced.sessionPath, "--config", verifyConfig],
      "accept\n"
    );

    assert.notEqual(result.status, 0);
    assert.equal(result.stderr.length > 0, true);
  })
);

test(
  "verify argument and edit-decision convenience surfaces stay exact",
  async () => {
    assert.deepEqual(
      parseVerifyArguments(["session.json", "--config", "verify.js"]),
      { sessionPath: "session.json", configPath: "verify.js" }
    );
    assert.throws(
      () => parseVerifyArguments(["--config", "verify.js"]),
      /Usage: gotcha-ai verify/
    );

    const answers = ["edit", "Stronger exact statement"];
    const decision = await collectProtectionDecision({
      output: new PassThrough(),
      async prompt(options) {
        return options.parse(answers.shift());
      }
    });
    assert.deepEqual(
      decision,
      { type: "edit", statement: "Stronger exact statement" }
    );
  }
);
