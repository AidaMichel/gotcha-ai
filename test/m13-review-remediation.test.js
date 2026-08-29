"use strict";

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

async function makeExperiment(mutatedOutput = { time: "4 PM" }) {
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
          mutatedOutput,
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
  const experiment = await makeExperiment(deepWire(12000));

  const result = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator(request) {
      let value = request.attack.output;
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
    poisonedCalls = 0;
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

test("callable pre-load Promise constructor poisoning fails closed without constructor authority", () => {
  const modulePath = path.join(repoRoot, "src", "contract-protection-proposal.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    let poisonedConstructorCalls = 0;
    function PoisonPromise(executor) {
      poisonedConstructorCalls += 1;
      return new NativePromise(executor);
    }
    PoisonPromise.prototype = NativePromise.prototype;
    global.Promise = PoisonPromise;
    const { generateContractProtectionProposal } = require(${JSON.stringify(modulePath)});
    global.Promise = NativePromise;
    poisonedConstructorCalls = 0;
    let generatorCalls = 0;
    (async () => {
      const returned = generateContractProtectionProposal({
        experiment: null,
        sourceAttackId: "wrong-time",
        generator() {
          generatorCalls += 1;
          return {};
        }
      });
      if (!(returned instanceof NativePromise)) process.exitCode = 6;
      try {
        await returned;
        process.exitCode = 2;
      } catch (error) {
        if (!(error instanceof TypeError)) process.exitCode = 3;
        if (generatorCalls !== 0) process.exitCode = 4;
        if (poisonedConstructorCalls !== 0) process.exitCode = 5;
      }
    })();
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});

test("missing global Promise keeps package loadable and M13 fails closed through a native Promise", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    delete global.Promise;
    let generatorCalls = 0;
    let api;
    try {
      api = require(${JSON.stringify(modulePath)});
    } catch (error) {
      console.error(error);
      process.exit(7);
    }
    global.Promise = NativePromise;
    const returned = api.generateContractProtectionProposal({
      experiment: null,
      sourceAttackId: "wrong-time",
      generator() {
        generatorCalls += 1;
        return {};
      }
    });
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => { process.exitCode = 3; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 4;
        if (generatorCalls !== 0) process.exitCode = 5;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});

test("contract-protection adapter rejects pre-load Promise constructor poisoning without executing it", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    let poisonedConstructorCalls = 0;
    function PoisonPromise(executor) {
      poisonedConstructorCalls += 1;
      return new NativePromise(executor);
    }
    PoisonPromise.prototype = NativePromise.prototype;
    global.Promise = PoisonPromise;
    const { createStructuredProviderAdapter } = require(${JSON.stringify(modulePath)});
    global.Promise = NativePromise;
    poisonedConstructorCalls = 0;
    let transportCalls = 0;
    const generator = createStructuredProviderAdapter({
      transport() {
        transportCalls += 1;
        return { version: 1, kind: "gotcha-provider-response", output: {} };
      },
      model: "test-model",
      mode: "contract-protection"
    });
    const returned = generator({});
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => { process.exitCode = 3; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 4;
        if (poisonedConstructorCalls !== 0) process.exitCode = 5;
        if (transportCalls !== 0) process.exitCode = 6;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});
