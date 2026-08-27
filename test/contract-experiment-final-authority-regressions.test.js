"use strict";

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
