from pathlib import Path

path = Path("src/contract-protection-proposal.js")
text = path.read_text()

text = text.replace(
    '"use strict";\n\nconst {\n  experimentIntrinsics: authority\n} = require("./contract-attacks-core");',
    '"use strict";\n\nconst { runInNewContext } = require("node:vm");\n\nconst {\n  experimentIntrinsics: authority\n} = require("./contract-attacks-core");',
    1,
)

text = text.replace(
    'const promisePrototype = PromiseConstructor.prototype;\nconst promiseBrandProbe = forbiddenProbes[6];',
    'const promisePrototype =\n  typeof PromiseConstructor === "function"\n    ? PromiseConstructor.prototype\n    : null;\nconst promiseBrandProbe =\n  forbiddenProbes !== null &&\n  typeof forbiddenProbes === "object"\n    ? forbiddenProbes[6]\n    : undefined;',
    1,
)

old_authority = '''if (!arrayIsArray(forbiddenProbes)) {
  boundaryAuthorityAvailable = false;
} else {
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (typeof forbiddenProbes[index] !== "function") {
      boundaryAuthorityAvailable = false;
      break;
    }
  }
}

function boundaryError() {
  return new TypeErrorConstructor("Invalid M13 protection-proposal boundary.");
}

const safePromiseSpeciesContainer = {};
defineProperty(safePromiseSpeciesContainer, promiseSpecies, {
  value: PromiseConstructor,
  writable: false,
  enumerable: false,
  configurable: false
});'''

new_authority = '''if (
  typeof arrayIsArray !== "function" ||
  arrayIsArray(forbiddenProbes) !== true
) {
  boundaryAuthorityAvailable = false;
} else {
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (typeof forbiddenProbes[index] !== "function") {
      boundaryAuthorityAvailable = false;
      break;
    }
  }
}

let promiseThenAuthorityVerified = false;
try {
  const pristineReflectApply = runInNewContext("Reflect.apply");
  const pristineFunctionToString = runInNewContext("Function.prototype.toString");
  const pristineGetOwnPropertyDescriptor = runInNewContext(
    "Object.getOwnPropertyDescriptor"
  );
  const pristinePromiseThenSource = runInNewContext(
    "Function.prototype.toString.call(Promise.prototype.then)"
  );
  const promiseThenDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [promisePrototype, "then"]
  );
  const capturedPromiseThenSource = pristineReflectApply(
    pristineFunctionToString,
    promiseThen,
    []
  );
  promiseThenAuthorityVerified = (
    promiseThenDescriptor !== undefined &&
    promiseThenDescriptor.value === promiseThen &&
    promiseThenDescriptor.writable === true &&
    promiseThenDescriptor.enumerable === false &&
    promiseThenDescriptor.configurable === true &&
    capturedPromiseThenSource === pristinePromiseThenSource
  );
} catch {
  promiseThenAuthorityVerified = false;
}

if (!promiseThenAuthorityVerified || typeof promiseSpecies !== "symbol") {
  boundaryAuthorityAvailable = false;
}

function boundaryError() {
  return new TypeErrorConstructor("Invalid M13 protection-proposal boundary.");
}

let safePromiseSpeciesContainer = null;
if (boundaryAuthorityAvailable) {
  try {
    safePromiseSpeciesContainer = {};
    defineProperty(safePromiseSpeciesContainer, promiseSpecies, {
      value: PromiseConstructor,
      writable: false,
      enumerable: false,
      configurable: false
    });
  } catch {
    safePromiseSpeciesContainer = null;
    boundaryAuthorityAvailable = false;
  }
}'''

if old_authority not in text:
    raise SystemExit("authority block not found")
text = text.replace(old_authority, new_authority, 1)

start = text.index("function cloneCapturedValue(value, seen) {")
end = text.index("\nfunction captureInvocation(options) {", start)
iterative_capture = '''function prepareCapturedNode(value, seen) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return makeRecord([["value", value], ["entries", null]]);
  }
  if (typeof value === "number") {
    if (!isWireNumber(value)) throw boundaryError();
    return makeRecord([["value", value], ["entries", null]]);
  }
  if (typeof value !== "object" || isProxy(value) === true) {
    throw boundaryError();
  }
  if (setHasValue(seen, value)) throw boundaryError();
  setAddValue(seen, value);

  const entries = new ArrayConstructor();
  let target;

  if (arrayIsArray(value) === true) {
    if (!exactArray(value)) throw boundaryError();
    const descriptors = getOwnPropertyDescriptors(value);
    const length = descriptors.length.value;
    target = new ArrayConstructor();
    for (let index = 0; index < length; index += 1) {
      append(entries, makeRecord([
        ["key", stringConstructor(index)],
        ["value", descriptors[stringConstructor(index)].value]
      ]));
    }
  } else {
    if (
      hasForbiddenBrand(value) ||
      getPrototypeOf(value) !== objectPrototype ||
      isExtensible(value) !== true
    ) {
      throw boundaryError();
    }
    const descriptors = getOwnPropertyDescriptors(value);
    const keys = ownKeys(descriptors);
    target = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (typeof key !== "string" || !ordinaryDescriptor(descriptor)) {
        throw boundaryError();
      }
      append(entries, makeRecord([
        ["key", key],
        ["value", descriptor.value]
      ]));
    }
  }

  return makeRecord([["value", target], ["entries", entries]]);
}

function cloneCapturedValue(value, seen) {
  const root = prepareCapturedNode(value, seen);
  if (root.entries === null) return root.value;

  const frames = new ArrayConstructor();
  append(frames, makeRecord([
    ["target", root.value],
    ["entries", root.entries]
  ]));

  for (let cursor = 0; cursor < frames.length; cursor += 1) {
    const frame = frames[cursor];
    for (let index = 0; index < frame.entries.length; index += 1) {
      const entry = frame.entries[index];
      const child = prepareCapturedNode(entry.value, seen);
      defineOrdinary(frame.target, entry.key, child.value);
      if (child.entries !== null) {
        append(frames, makeRecord([
          ["target", child.value],
          ["entries", child.entries]
        ]));
      }
    }
  }

  return root.value;
}
'''
text = text[:start] + iterative_capture + text[end:]

start = text.index("function cloneWireValue(value, seen) {")
end = text.index("\nfunction cloneRule(rule) {", start)
text = (
    text[:start]
    + 'function cloneWireValue(value, seen) {\n  return cloneCapturedValue(value, seen);\n}\n'
    + text[end:]
)

path.write_text(text)

test_path = Path("test/m13-review-remediation.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  runContractAttacks,
  generateContractProtectionProposal
} = require("../src");

const repoRoot = path.join(__dirname, "..");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [{
      id: "time-rule",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    }]
  };
}

async function makeExperiment() {
  const confirmed = contract();
  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "Schedule it." },
    expectedOutput: { time: "3 PM" },
    evaluator() { return true; },
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [{
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the time.",
          rationale: "Violates the rule.",
          mutatedOutput: { time: "4 PM" },
          scores: {
            realism: 0.9,
            subtlety: 0.8,
            novelty: 0.7,
            fixability: 0.9
          }
        }]
      };
    }
  });
  assert.equal(result.experiment.replayable, true);
  return result.experiment;
}

function proposal() {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId: "wrong-time",
    ruleId: "time-rule",
    protection: {
      statement: "Require exactly 3 PM.",
      rationale: "The survivor changed the approved time."
    }
  };
}

function deepWire(depth) {
  let value = { leaf: "ok" };
  for (let index = 0; index < depth; index += 1) {
    value = { next: value };
  }
  return value;
}

test("M13 capture and request projection stay stack-safe for deep replayable evidence", async () => {
  const experiment = await makeExperiment();
  experiment.case.input = deepWire(12000);

  const result = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator(request) {
      let value = request.case.input;
      for (let index = 0; index < 12000; index += 1) {
        value = value.next;
      }
      assert.equal(value.leaf, "ok");
      return proposal();
    }
  });

  assert.equal(result.state, "proposal-ready");
});

test("missing pre-load Array.isArray keeps M13 loadable and rejects through the public Promise", () => {
  const modulePath = path.join(repoRoot, "src", "contract-protection-proposal.js");
  const code = `
    "use strict";
    Array.isArray = undefined;
    const { generateContractProtectionProposal } = require(${JSON.stringify(modulePath)});
    (async () => {
      try {
        await generateContractProtectionProposal({});
        process.exitCode = 2;
      } catch (error) {
        if (!(error instanceof TypeError)) process.exitCode = 3;
      }
    })();
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});

test("callable pre-load Promise.then poisoning fails closed before generator execution", () => {
  const modulePath = path.join(repoRoot, "src", "contract-protection-proposal.js");
  const code = `
    "use strict";
    const originalThen = Promise.prototype.then;
    let poisonedCalls = 0;
    Promise.prototype.then = function then(onFulfilled, onRejected) {
      poisonedCalls += 1;
      return Reflect.apply(originalThen, this, [onFulfilled, onRejected]);
    };
    const { generateContractProtectionProposal } = require(${JSON.stringify(modulePath)});
    Promise.prototype.then = originalThen;
    let generatorCalls = 0;
    (async () => {
      try {
        await generateContractProtectionProposal({
          experiment: null,
          sourceAttackId: "wrong-time",
          generator() {
            generatorCalls += 1;
            return {};
          }
        });
        process.exitCode = 2;
      } catch (error) {
        if (!(error instanceof TypeError)) process.exitCode = 3;
        if (generatorCalls !== 0) process.exitCode = 4;
        if (poisonedCalls !== 0) process.exitCode = 5;
      }
    })();
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});
''')
