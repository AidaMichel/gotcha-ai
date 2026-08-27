from pathlib import Path

core = Path('src/contract-attacks-core.js')
text = core.read_text()
old = '''    jsonParse:\n      JSON.parse,\n    ArrayConstructor:\n      Array\n  });'''
new = '''    jsonParse:\n      JSON.parse,\n    ArrayConstructor:\n      Array,\n    ArrayPrototype:\n      Array.prototype,\n    ObjectPrototype:\n      Object.prototype\n  });'''
if old not in text:
    raise SystemExit('core authority block not found')
text = text.replace(old, new, 1)
old_export = '''module.exports = {\n  runContractAttacks,\n  experimentIntrinsics\n};'''
new_export = '''module.exports = {\n  runContractAttacks\n};\n\nexperimentIntrinsics.defineProperty(\n  module.exports,\n  "experimentIntrinsics",\n  {\n    value: experimentIntrinsics,\n    enumerable: true,\n    writable: false,\n    configurable: false\n  }\n);'''
if old_export not in text:
    raise SystemExit('core export block not found')
text = text.replace(old_export, new_export, 1)
core.write_text(text)

experiment = Path('src/contract-experiment.js')
text = experiment.read_text()
old_destructure = '''  jsonStringify,\n  jsonParse,\n  ArrayConstructor\n} = experimentIntrinsics;'''
new_destructure = '''  jsonStringify,\n  jsonParse,\n  ArrayConstructor,\n  ArrayPrototype,\n  ObjectPrototype\n} = experimentIntrinsics;'''
if old_destructure not in text:
    raise SystemExit('experiment destructure not found')
text = text.replace(old_destructure, new_destructure, 1)
old_proto = '''const objectPrototype = Object.prototype;\nconst arrayPrototype = Array.prototype;'''
new_proto = '''const objectPrototype = ObjectPrototype;\nconst arrayPrototype = ArrayPrototype;'''
if old_proto not in text:
    raise SystemExit('ambient prototype captures not found')
text = text.replace(old_proto, new_proto, 1)
experiment.write_text(text)

reg = Path('test/contract-experiment-prototype-authority-regressions.test.js')
reg.write_text(r'''"use strict";

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
''')
