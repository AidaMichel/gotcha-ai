"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function run(script) {
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

const baseRun = `
const contract = {
  version: 1,
  status: "confirmed",
  task: "Return the approved time.",
  rules: [{ id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" }]
};
const options = {
  contract,
  input: { request: "Schedule the meeting." },
  expectedOutput: { time: "3 PM" },
  evaluator(output) { return output.time === "3 PM"; },
  generator() { return { version: 1, task: contract.task, attacks: [] }; }
};
`;

test("cached core owns Array prototype authority across wrapper load tampering", () => {
  run(`
    require("./src/contract-attacks-core");
    const RealArray = globalThis.Array;
    function FakeArray() {}
    FakeArray.prototype = Object.create(null);
    globalThis.Array = FakeArray;
    const publicApi = require("./src/contract-attacks");
    globalThis.Array = RealArray;
    ${baseRun}
    publicApi.runContractAttacks(options).then((result) => {
      if (!result.experiment || result.experiment.replayable !== true) process.exit(2);
    }).catch((error) => { console.error(error); process.exit(3); });
  `);
});

test("cached core owns Object prototype authority across wrapper load tampering", () => {
  run(`
    require("./src/contract-attacks-core");
    const RealObject = globalThis.Object;
    function FakeObject() {}
    FakeObject.prototype = Object.create(null);
    globalThis.Object = FakeObject;
    const publicApi = require("./src/contract-attacks");
    globalThis.Object = RealObject;
    ${baseRun}
    publicApi.runContractAttacks(options).then((result) => {
      if (!result.experiment || result.experiment.replayable !== true) process.exit(2);
    }).catch((error) => { console.error(error); process.exit(3); });
  `);
});

test("core experiment authority export is immutable", () => {
  run(`
    "use strict";
    const core = require("./src/contract-attacks-core");
    const original = core.experimentIntrinsics;
    const descriptor = Object.getOwnPropertyDescriptor(core, "experimentIntrinsics");
    if (!descriptor || descriptor.writable !== false || descriptor.configurable !== false) process.exit(2);
    let threw = false;
    try { core.experimentIntrinsics = { ArrayConstructor: function Fake() {} }; } catch { threw = true; }
    if (!threw || core.experimentIntrinsics !== original) process.exit(3);
    const publicApi = require("./src/contract-attacks");
    ${baseRun}
    publicApi.runContractAttacks(options).then((result) => {
      if (!result.experiment || result.experiment.replayable !== true) process.exit(4);
    }).catch((error) => { console.error(error); process.exit(5); });
  `);
});
