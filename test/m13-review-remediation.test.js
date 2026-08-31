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


test("poisoned Promise prototype constructor keeps package loadable and M13 fails closed", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const nativeDescriptor = Object.getOwnPropertyDescriptor(
      NativePromise.prototype,
      "constructor"
    );
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: null,
      writable: true,
      enumerable: false,
      configurable: true
    });
    let api;
    try {
      api = require(${JSON.stringify(modulePath)});
    } catch (error) {
      console.error(error);
      process.exit(7);
    }
    Object.defineProperty(
      NativePromise.prototype,
      "constructor",
      nativeDescriptor
    );
    let generatorCalls = 0;
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

test("legacy adapter Promise authority is captured at package initialization", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const api = require(${JSON.stringify(modulePath)});
    let poisonedConstructorCalls = 0;
    function PoisonPromise(executor) {
      poisonedConstructorCalls += 1;
      return new NativePromise(executor);
    }
    PoisonPromise.prototype = NativePromise.prototype;
    global.Promise = PoisonPromise;
    const generator = api.createStructuredProviderAdapter({
      transport() {
        return {
          version: 1,
          kind: "gotcha-provider-response",
          output: {
            version: 1,
            task: "x",
            rules: []
          }
        };
      },
      model: "test-model",
      mode: "quality-contract"
    });
    const returned = generator({ task: "x", examples: [], instructions: "x" });
    global.Promise = NativePromise;
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => {
        if (poisonedConstructorCalls !== 0) process.exitCode = 3;
      },
      () => {
        if (poisonedConstructorCalls !== 0) process.exitCode = 4;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});

test("poisoned global TypeError is never used for M13 boundary failures", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const NativeTypeError = TypeError;
    let poisonedTypeErrorCalls = 0;
    global.TypeError = function PoisonTypeError() {
      poisonedTypeErrorCalls += 1;
      return new Error("poisoned TypeError executed");
    };
    let api;
    try {
      api = require(${JSON.stringify(modulePath)});
    } catch (error) {
      console.error(error);
      process.exit(7);
    }
    global.TypeError = NativeTypeError;
    const returned = api.generateContractProtectionProposal({});
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => { process.exitCode = 3; },
      (error) => {
        if (!(error instanceof NativeTypeError)) process.exitCode = 4;
        if (poisonedTypeErrorCalls !== 0) process.exitCode = 5;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
});


test("accessor-backed global Promise is rejected without getter execution", () => {
  const modulePath = path.join(repoRoot, "src", "provider-adapter-m13.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const original = Object.getOwnPropertyDescriptor(globalThis, "Promise");
    let getterCalls = 0;
    Object.defineProperty(globalThis, "Promise", {
      get() { getterCalls += 1; return NativePromise; }, configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(modulePath)}); } catch (error) {
      console.error(error); process.exit(7);
    }
    Object.defineProperty(globalThis, "Promise", original);
    if (getterCalls !== 0) process.exitCode = 2;
    try { api.createStructuredProviderAdapter({}); } catch (error) {
      if (!(error instanceof TypeError)) process.exitCode = 3;
    }
    if (getterCalls !== 0) process.exitCode = 4;
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("poisoned global TypeError is never used by M13 provider adapter boundaries", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeTypeError = TypeError;
    let poisonCalls = 0;
    global.TypeError = function PoisonTypeError() { poisonCalls += 1; return new Error("poison"); };
    const api = require(${JSON.stringify(modulePath)});
    global.TypeError = NativeTypeError;
    try { api.createStructuredProviderAdapter({}); } catch (error) {
      if (!(error instanceof NativeTypeError)) process.exitCode = 2;
    }
    if (poisonCalls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("M12 rejects pre-load Promise constructor Proxy authority without executing it", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const descriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    let proxyCalls = 0;
    const ProxyPromise = new Proxy(NativePromise, {
      construct(target, args, newTarget) { proxyCalls += 1; return Reflect.construct(target, args, newTarget); }
    });
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: ProxyPromise, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(NativePromise.prototype, "constructor", descriptor);
    proxyCalls = 0;
    const returned = api.prepareContractQualityLoop({});
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => { process.exitCode = 3; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 4;
        if (proxyCalls !== 0) process.exitCode = 5;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});


test("round3 rejects accessor-backed core Promise authority without invoking the getter", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Object.getOwnPropertyDescriptor(globalThis, "Promise");
    let getterCalls = 0;
    Object.defineProperty(globalThis, "Promise", {
      get() { getterCalls += 1; return original.value; },
      configurable: true
    });
    try { require(${JSON.stringify(modulePath)}); } catch (error) {
      console.error(error); process.exit(7);
    }
    Object.defineProperty(globalThis, "Promise", original);
    if (getterCalls !== 0) process.exit(8);
  `;
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round3 M12 rejects foreign-realm Promise constructor authority", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativePromise = Promise;
    const descriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    const ForeignPromise = vm.runInNewContext("Promise");
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: ForeignPromise, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(NativePromise.prototype, "constructor", descriptor);
    const returned = api.prepareContractQualityLoop(null);
    if (Object.getPrototypeOf(returned) !== NativePromise.prototype) process.exit(9);
    returned.catch((error) => {
      if (!(error instanceof TypeError)) process.exit(10);
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round3 proposal consumes rejected changed-prototype native Promise", async () => {
  const { generateContractProtectionProposal } = require("../src");
  const reason = { code: "changed-prototype-generator-rejection" };
  const promise = Promise.reject(reason);
  Object.setPrototypeOf(promise, {});
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.once("unhandledRejection", listener);
  await assert.rejects(
    generateContractProtectionProposal({
      experiment: await makeExperiment(),
      sourceAttackId: "wrong-time",
      generator() { return promise; }
    }),
    TypeError
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});

test("round3 legacy adapter does not retain poisoned pre-load TypeError authority", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeTypeError = TypeError;
    const original = Object.getOwnPropertyDescriptor(globalThis, "TypeError");
    let poisonCalls = 0;
    function PoisonedTypeError() { poisonCalls += 1; return new Error("poison"); }
    PoisonedTypeError.prototype = NativeTypeError.prototype;
    Object.defineProperty(globalThis, "TypeError", {
      value: PoisonedTypeError, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(globalThis, "TypeError", original);
    try { api.createStructuredProviderAdapter({ mode: "quality-contract" }); } catch {}
    if (poisonCalls !== 0) process.exit(11);
  `;
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
