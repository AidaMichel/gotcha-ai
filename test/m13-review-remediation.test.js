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

test("M13 capture and request projection stay stack-safe for deep replayable evidence", { timeout: 90000 }, async () => {
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


test("round4 rejects foreign-realm Promise.then authority across M13 and M12", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativePromise = Promise;
    const localThen = NativePromise.prototype.then;
    const foreignThen = vm.runInNewContext("Promise.prototype.then");
    Object.defineProperty(NativePromise.prototype, "then", {
      value: foreignThen, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(NativePromise.prototype, "then", {
      value: localThen, writable: true, enumerable: false, configurable: true
    });
    let generatorCalls = 0;
    const p1 = api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return {}; }
    });
    const p2 = api.prepareContractQualityLoop(null);
    Promise.allSettled([p1, p2]).then((results) => {
      if (generatorCalls !== 0) process.exit(21);
      if (results.some((r) => r.status !== "rejected" || !(r.reason instanceof TypeError))) process.exit(22);
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round4 ignores poisoned mutable isPromise probe without trap execution", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isPromise;
    let trapCalls = 0;
    util.types.isPromise = new Proxy(original, { apply(target, thisArg, args) { trapCalls += 1; return Reflect.apply(target, thisArg, args); } });
    const api = require(${JSON.stringify(modulePath)});
    util.types.isPromise = original;
    let generatorCalls = 0;
    api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return {}; }
    }).then(() => process.exit(23), (error) => {
      if (!(error instanceof TypeError)) process.exit(24);
      if (generatorCalls !== 0 || trapCalls !== 0) process.exit(25);
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round4 consumes non-extensible changed-prototype rejected generator Promise", async () => {
  const experiment = await makeExperiment();
  const reason = { code: "round4-generator" };
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.once("unhandledRejection", listener);
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() {
        const promise = Promise.reject(reason);
        Object.setPrototypeOf(promise, {});
        Object.preventExtensions(promise);
        return promise;
      }
    }),
    TypeError
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});

test("round4 rejects same-prototype fake TypeError and pre-cached poisoned legacy adapter", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const legacyPath = path.join(repoRoot, "src", "provider-adapter.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const NativeTypeError = TypeError;
    let promiseCalls = 0;
    let typeErrorCalls = 0;
    function PoisonPromise(executor) { promiseCalls += 1; return new NativePromise(executor); }
    PoisonPromise.prototype = NativePromise.prototype;
    function PoisonTypeError(message) { typeErrorCalls += 1; return new Error(message); }
    PoisonTypeError.prototype = NativeTypeError.prototype;
    global.Promise = PoisonPromise;
    global.TypeError = PoisonTypeError;
    require(${JSON.stringify(legacyPath)});
    global.Promise = NativePromise;
    global.TypeError = NativeTypeError;
    const api = require(${JSON.stringify(modulePath)});
    const adapter = api.createStructuredProviderAdapter({ mode: "quality-contract", transport() { return {}; }, model: "x" });
    adapter({}).then(() => process.exit(26), () => {
      if (promiseCalls !== 0 || typeErrorCalls !== 0) process.exit(27);
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});


// ROUND5_CODEX_AUTHORITY_REGRESSIONS

test("round5 pre-load Proxy isProxy authority never executes its apply trap", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isProxy;
    let trapCalls = 0;
    util.types.isProxy = new Proxy(original, {
      apply() { trapCalls += 1; throw new Error("isProxy trap executed"); }
    });
    let api;
    try { api = require(${JSON.stringify(modulePath)}); }
    catch (error) { console.error(error); process.exit(71); }
    util.types.isProxy = original;
    const returned = api.generateContractProtectionProposal({});
    returned.then(
      () => { process.exitCode = 72; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 73;
        if (trapCalls !== 0) process.exitCode = 74;
      }
    );
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round5 ignores poisoned mutable forbidden-brand probe without trap execution", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isDate;
    let trapCalls = 0;
    util.types.isDate = new Proxy(original, {
      apply() { trapCalls += 1; throw new Error("isDate trap executed"); }
    });
    const api = require(${JSON.stringify(modulePath)});
    util.types.isDate = original;
    let generatorCalls = 0;
    api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return {}; }
    }).then(
      () => { process.exitCode = 75; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 76;
        if (generatorCalls !== 0 || trapCalls !== 0) process.exitCode = 77;
      }
    );
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round5 foreign Promise.then plus foreign Function fails closed across M13 and M12", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativeFunction = Function;
    const NativePromise = Promise;
    const localThen = NativePromise.prototype.then;
    const foreignFunction = vm.runInNewContext("Function");
    const foreignThen = vm.runInNewContext("Promise.prototype.then");
    Object.defineProperty(NativePromise.prototype, "then", {
      value: foreignThen, writable: true, enumerable: false, configurable: true
    });
    global.Function = foreignFunction;
    const api = require(${JSON.stringify(modulePath)});
    global.Function = NativeFunction;
    Object.defineProperty(NativePromise.prototype, "then", {
      value: localThen, writable: true, enumerable: false, configurable: true
    });
    let generatorCalls = 0;
    const p1 = api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return {}; }
    });
    const p2 = api.prepareContractQualityLoop(null);
    Promise.allSettled([p1, p2]).then((results) => {
      if (generatorCalls !== 0) process.exitCode = 78;
      if (results.some((r) => r.status !== "rejected" || !(r.reason instanceof TypeError))) {
        process.exitCode = 79;
      }
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round5 provider rejects foreign Promise.then plus foreign Function before transport", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativeFunction = Function;
    const NativePromise = Promise;
    const localThen = NativePromise.prototype.then;
    const foreignFunction = vm.runInNewContext("Function");
    const foreignThen = vm.runInNewContext("Promise.prototype.then");
    Object.defineProperty(NativePromise.prototype, "then", {
      value: foreignThen, writable: true, enumerable: false, configurable: true
    });
    global.Function = foreignFunction;
    const api = require(${JSON.stringify(modulePath)});
    global.Function = NativeFunction;
    Object.defineProperty(NativePromise.prototype, "then", {
      value: localThen, writable: true, enumerable: false, configurable: true
    });
    let transportCalls = 0;
    try {
      const adapter = api.createStructuredProviderAdapter({
        mode: "contract-protection",
        model: "x",
        transport() { transportCalls += 1; return {}; }
      });
      Promise.resolve(adapter({})).catch(() => {});
    } catch (error) {
      if (!(error instanceof TypeError)) process.exitCode = 80;
    }
    setImmediate(() => {
      if (transportCalls !== 0) process.exitCode = 81;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round5 Mutation Pack rejects coordinated foreign Promise and Function authority before callbacks", () => {
  const modulePath = path.join(repoRoot, "src", "mutation-pack.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativePromise = Promise;
    const NativeFunction = Function;
    const localCtor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    const localThen = Object.getOwnPropertyDescriptor(NativePromise.prototype, "then");
    const ForeignPromise = vm.runInNewContext("Promise");
    const ForeignFunction = vm.runInNewContext("Function");
    const foreignThen = vm.runInNewContext("Promise.prototype.then");
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: ForeignPromise, writable: true, enumerable: false, configurable: true
    });
    Object.defineProperty(NativePromise.prototype, "then", {
      value: foreignThen, writable: true, enumerable: false, configurable: true
    });
    global.Promise = ForeignPromise;
    global.Function = ForeignFunction;
    const { compileMutationPack } = require(${JSON.stringify(modulePath)});
    global.Promise = NativePromise;
    global.Function = NativeFunction;
    Object.defineProperty(NativePromise.prototype, "constructor", localCtor);
    Object.defineProperty(NativePromise.prototype, "then", localThen);
    let callbackCalls = 0;
    const pack = [{
      id: "wrong-value",
      type: "value-substitution",
      description: "Changes the expected value.",
      mutate(output) { callbackCalls += 1; return output; },
      scores: { severity: 1, realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.6 },
      protection: {
        description: "The value must remain correct.",
        check() { callbackCalls += 1; return true; }
      }
    }];
    try { compileMutationPack({ output: { value: "good" }, pack }); }
    catch {}
    if (callbackCalls !== 0) process.exitCode = 82;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round5 consumes inherited trusted-constructor rejected generator and transport Promises", async () => {
  const experiment = await makeExperiment();
  const generatorReason = { code: "round5-inherited-generator" };
  const generatorPromise = Promise.reject(generatorReason);
  const generatorPrototype = {};
  Object.defineProperty(generatorPrototype, "constructor", {
    value: Promise, writable: true, enumerable: false, configurable: true
  });
  Object.setPrototypeOf(generatorPromise, generatorPrototype);
  Object.preventExtensions(generatorPromise);

  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.on("unhandledRejection", listener);
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return generatorPromise; }
    }),
    TypeError
  );

  const { createStructuredProviderAdapter } = require("../src");
  const transportReason = { code: "round5-inherited-transport" };
  const transportPromise = Promise.reject(transportReason);
  const transportPrototype = {};
  Object.defineProperty(transportPrototype, "constructor", {
    value: Promise, writable: true, enumerable: false, configurable: true
  });
  Object.setPrototypeOf(transportPromise, transportPrototype);
  Object.preventExtensions(transportPromise);
  const adapter = createStructuredProviderAdapter({
    mode: "contract-protection",
    model: "x",
    transport() { return transportPromise; }
  });
  await assert.rejects(adapter({
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: {
      id: "time-rule",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    },
    attack: {
      id: "wrong-time",
      ruleId: "time-rule",
      type: "wrong-time",
      description: "Changes the approved time.",
      rationale: "Violates the confirmed rule.",
      output: {}
    },
    instructions:
      "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
      "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
      "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
      "The protection statement must describe what the quality system should enforce.\n" +
      "The rationale must explain why this protection addresses the selected survivor."
  }), TypeError);
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});

test("round5 coordinated TypeError constructor poisoning cannot authorize legacy delegation", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeTypeError = TypeError;
    const globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "TypeError");
    const constructorDescriptor = Object.getOwnPropertyDescriptor(NativeTypeError.prototype, "constructor");
    let poisonCalls = 0;
    function PoisonTypeError(message) { poisonCalls += 1; return new Error(message); }
    Object.defineProperty(NativeTypeError.prototype, "constructor", {
      value: PoisonTypeError, writable: true, enumerable: false, configurable: true
    });
    Object.defineProperty(globalThis, "TypeError", {
      value: PoisonTypeError, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(globalThis, "TypeError", globalDescriptor);
    Object.defineProperty(NativeTypeError.prototype, "constructor", constructorDescriptor);
    try {
      const adapter = api.createStructuredProviderAdapter({
        mode: "quality-contract",
        model: "x",
        transport() { return {}; }
      });
      Promise.resolve(adapter({})).catch(() => {});
    } catch (error) {
      if (!(error instanceof NativeTypeError)) process.exitCode = 83;
    }
    setImmediate(() => {
      if (poisonCalls !== 0) process.exitCode = 84;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});


// ROUND6_CODEX_AUTHORITY_REGRESSIONS

test("round6 AI-data never invokes retained Proxy forbidden-brand probes", () => {
  const modulePath = path.join(repoRoot, "src", "ai-data-core.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isDate;
    let trapCalls = 0;
    util.types.isDate = new Proxy(original, {
      apply() { trapCalls += 1; throw new Error("isDate trap executed"); }
    });
    const api = require(${JSON.stringify(modulePath)});
    util.types.isDate = original;
    try { api.cloneAiData({}); } catch {}
    if (trapCalls !== 0) process.exitCode = 90;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 util.inspect accessor is never invoked during package bootstrap", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const util = require("node:util");
    require("node:buffer");
    require("node:vm");
    const descriptor = Object.getOwnPropertyDescriptor(util, "inspect");
    let getterCalls = 0;
    Object.defineProperty(util, "inspect", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() { getterCalls += 1; throw new Error("inspect getter executed"); }
    });
    try { require(${JSON.stringify(modulePath)}); }
    catch (error) { console.error(error); process.exitCode = 91; }
    Object.defineProperty(util, "inspect", descriptor);
    if (getterCalls !== 0) process.exitCode = 92;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 Buffer.isBuffer accessor is never invoked during package bootstrap", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const { Buffer } = require("node:buffer");
  const code = `
    "use strict";
    const { Buffer } = require("node:buffer");
    const descriptor = Object.getOwnPropertyDescriptor(Buffer, "isBuffer");
    let getterCalls = 0;
    Object.defineProperty(Buffer, "isBuffer", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() { getterCalls += 1; throw new Error("Buffer.isBuffer getter executed"); }
    });
    try { require(${JSON.stringify(modulePath)}); }
    catch (error) { console.error(error); process.exitCode = 93; }
    Object.defineProperty(Buffer, "isBuffer", descriptor);
    if (getterCalls !== 0) process.exitCode = 94;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 pre-load Proxy Array.isArray fails closed without trap execution", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const descriptor = Object.getOwnPropertyDescriptor(Array, "isArray");
    let trapCalls = 0;
    Object.defineProperty(Array, "isArray", {
      ...descriptor,
      value: new Proxy(descriptor.value, {
        apply() { trapCalls += 1; throw new Error("Array.isArray trap executed"); }
      })
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(Array, "isArray", descriptor);
    const returned = api.generateContractProtectionProposal({});
    returned.then(
      () => { process.exitCode = 95; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 96;
        if (trapCalls !== 0) process.exitCode = 97;
      }
    );
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 M8 rejects poisoned Promise constructor and then before callbacks", () => {
  const modulePath = path.join(repoRoot, "src", "contract-attacks-core.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const constructorDescriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    const thenDescriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "then");
    let poisonCalls = 0;
    function PoisonPromise(executor) { poisonCalls += 1; return new NativePromise(executor); }
    function poisonThen(onFulfilled, onRejected) {
      poisonCalls += 1;
      return Reflect.apply(thenDescriptor.value, this, [onFulfilled, onRejected]);
    }
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: PoisonPromise, writable: true, enumerable: false, configurable: true
    });
    Object.defineProperty(NativePromise.prototype, "then", {
      value: poisonThen, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    let callbackCalls = 0;
    let returned;
    try {
      returned = api.runContractAttacks({
        contract: {
          version: 1,
          status: "confirmed",
          task: "Return approved time.",
          rules: [{ id: "time-rule", statement: "Time is 3 PM.", kind: "required", severity: "major" }]
        },
        input: {},
        expectedOutput: {},
        evaluator() { callbackCalls += 1; return true; },
        generator() { callbackCalls += 1; return { version: 1, task: "Return approved time.", attacks: [] }; }
      });
    } catch {}
    Object.defineProperty(NativePromise.prototype, "constructor", constructorDescriptor);
    Object.defineProperty(NativePromise.prototype, "then", thenDescriptor);
    if (returned && typeof returned.then === "function") returned.then(() => {}, () => {});
    setImmediate(() => {
      if (callbackCalls !== 0 || poisonCalls !== 0) { console.error(JSON.stringify({ callbackCalls, poisonCalls })); process.exitCode = 98; }
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 consumes non-configurable undefined-constructor rejected generator and transport Promises", async () => {
  const experiment = await makeExperiment();
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.on("unhandledRejection", listener);

  const generatorPromise = Promise.reject({ code: "round6-generator-undefined-constructor" });
  Object.defineProperty(generatorPromise, "constructor", {
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() { return generatorPromise; }
  }), TypeError);

  const { createStructuredProviderAdapter } = require("../src");
  const transportPromise = Promise.reject({ code: "round6-transport-undefined-constructor" });
  Object.defineProperty(transportPromise, "constructor", {
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false
  });
  const adapter = createStructuredProviderAdapter({
    mode: "contract-protection",
    model: "x",
    transport() { return transportPromise; }
  });
  await assert.rejects(adapter({
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: { id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" },
    attack: {
      id: "wrong-time", ruleId: "time-rule", type: "wrong-time",
      description: "Changes the approved time.", rationale: "Violates the confirmed rule.", output: {}
    },
    instructions:
      "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
      "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
      "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
      "The protection statement must describe what the quality system should enforce.\n" +
      "The rationale must explain why this protection addresses the selected survivor."
  }), TypeError);

  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});

test("round6 Mutation Pack never executes inherited Proxy species traps", async () => {
  const { compileMutationPack } = require("../src/mutation-pack");
  let trapCalls = 0;
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.on("unhandledRejection", listener);

  const rejected = Promise.reject({ code: "round6-mutation-hostile-species" });
  const hostileConstructor = new Proxy(function HostilePromiseConstructor() {}, {
    get(target, property, receiver) {
      if (property === Symbol.species) {
        trapCalls += 1;
        throw new Error("species trap executed");
      }
      return Reflect.get(target, property, receiver);
    }
  });
  const prototype = {};
  Object.defineProperty(prototype, "constructor", {
    value: hostileConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.setPrototypeOf(rejected, prototype);
  Object.preventExtensions(rejected);

  const pack = [{
    id: "wrong-value",
    type: "value-substitution",
    description: "Changes the expected value.",
    mutate() { return rejected; },
    scores: { severity: 1, realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.6 },
    protection: { description: "Keep value correct.", check() { return true; } }
  }];
  assert.throws(
    () => compileMutationPack({ output: { value: "good" }, pack }),
    /Async mutation(?:s| functions) are not supported|runtime authority is unavailable/i
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(trapCalls, 0);
  assert.equal(unhandled, null);
});

test("round6 poisoned Promise species fails closed before M13 generator or transport", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const speciesDescriptor = Object.getOwnPropertyDescriptor(NativePromise, Symbol.species);
    let speciesCalls = 0;
    Object.defineProperty(NativePromise, Symbol.species, {
      configurable: true,
      enumerable: false,
      get() { speciesCalls += 1; throw new Error("species getter executed"); }
    });
    const api = require(${JSON.stringify(modulePath)});
    let generatorCalls = 0;
    let transportCalls = 0;
    const p1 = api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return NativePromise.reject(new Error("generator")); }
    });
    let p2;
    try {
      const adapter = api.createStructuredProviderAdapter({
        mode: "contract-protection",
        model: "x",
        transport() { transportCalls += 1; return NativePromise.reject(new Error("transport")); }
      });
      p2 = adapter({
        task: "Return the approved time.",
        case: { input: {}, expectedOutput: {} },
        source: { attackId: "wrong-time", ruleId: "time-rule" },
        rule: {
          id: "time-rule",
          statement: "Time must be 3 PM.",
          kind: "required",
          severity: "major"
        },
        attack: {
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the approved time.",
          rationale: "Violates the confirmed rule.",
          output: {}
        },
        instructions: [
          "Propose one specific, testable declarative quality protection for the selected surviving attack.",
          "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.",
          "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.",
          "The protection statement must describe what the quality system should enforce.",
          "The rationale must explain why this protection addresses the selected survivor."
        ].join(String.fromCharCode(10))
      });
    } catch (error) { p2 = NativePromise.reject(error); }
    Object.defineProperty(NativePromise, Symbol.species, speciesDescriptor);
    NativePromise.allSettled([p1, p2]).then(() => {
      if (speciesCalls !== 0 || generatorCalls !== 0 || transportCalls !== 0) process.exitCode = 99;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});


test("round7 V8 setter replacement is never executed during bootstrap", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const v8 = require("node:v8");
    const original = Object.getOwnPropertyDescriptor(v8, "setFlagsFromString");
    let calls = 0;
    function setFlagsFromString(flags) { calls += 1; }
    Object.defineProperty(v8, "setFlagsFromString", {
      value: setFlagsFromString,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(v8, "setFlagsFromString", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 2;
    if (calls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round7 ordinary util.types brand replacement is never retained", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    let types;
    try { types = require("node:util/types"); }
    catch { types = require("node:util").types; }
    const original = Object.getOwnPropertyDescriptor(types, "isDate");
    let calls = 0;
    function isDate(value) { calls += 1; return false; }
    Object.defineProperty(types, "isDate", {
      value: isDate,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(types, "isDate", original); }
    Promise.resolve(api.generateContractProtectionProposal({})).catch(() => {}).then(() => {
      if (calls !== 0) process.exitCode = 4;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round7 node vm and buffer bootstrap accessors are never invoked", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  for (const scenario of [
    ["node:vm", "runInNewContext"],
    ["node:buffer", "Buffer"]
  ]) {
    const code = `
      "use strict";
      const moduleObject = require(${JSON.stringify(scenario[0])});
      const key = ${JSON.stringify(scenario[1])};
      const original = Object.getOwnPropertyDescriptor(moduleObject, key);
      let calls = 0;
      Object.defineProperty(moduleObject, key, {
        get() { calls += 1; return original.value; },
        enumerable: original.enumerable,
        configurable: true
      });
      let loaded = false;
      try { require(${JSON.stringify(indexPath)}); loaded = true; }
      catch {}
      finally { Object.defineProperty(moduleObject, key, original); }
      if (calls !== 0) process.exitCode = 5;
      if (!loaded) process.exitCode = 6;
    `;
    const run = spawnSync(process.execPath, ["-e", code], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    assert.equal(run.status, 0, `${scenario.join(".")}: ${run.stderr || run.stdout}`);
  }
});

test("round7 unshieldable fulfilled generator promises are consumed then rejected", async () => {
  const experiment = await makeExperiment();

  const nonConfigurable = Promise.resolve(proposal());
  Object.defineProperty(nonConfigurable, "constructor", {
    value: Promise,
    writable: false,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return nonConfigurable; }
    }),
    TypeError
  );

  const nonExtensible = Promise.resolve(proposal());
  Object.preventExtensions(nonExtensible);
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return nonExtensible; }
    }),
    TypeError
  );
});

test("round7 package root reloads preloaded authority consumers coherently", () => {
  const corePath = path.join(repoRoot, "src", "contract-attacks-core.js");
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    require(${JSON.stringify(corePath)});
    const api = require(${JSON.stringify(indexPath)});
    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved time.",
      rules: [{ id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" }]
    };
    (async () => {
      const result = await api.runContractAttacks({
        contract,
        input: { request: "Schedule it." },
        expectedOutput: { time: "3 PM" },
        evaluator() { return true; },
        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [{
              id: "wrong-time",
              ruleId: "time-rule",
              type: "wrong-time",
              description: "Changes the time.",
              rationale: "Violates the rule.",
              mutatedOutput: { time: "4 PM" },
              scores: { realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.9 }
            }]
          };
        }
      });
      const generated = await api.generateContractProtectionProposal({
        experiment: result.experiment,
        sourceAttackId: "wrong-time",
        generator() {
          return {
            version: 1,
            task: contract.task,
            sourceAttackId: "wrong-time",
            ruleId: "time-rule",
            protection: {
              statement: "Require exactly 3 PM.",
              rationale: "The survivor changed the approved time."
            }
          };
        }
      });
      if (generated.state !== "proposal-ready") process.exitCode = 7;
    })().catch((error) => {
      console.error(error && error.stack || error);
      process.exitCode = 8;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});



test("round8 source-identical V8 setter replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const v8 = require("node:v8");
    const original = Object.getOwnPropertyDescriptor(v8, "setFlagsFromString");
    let calls = 0;
    const replacement = Function(
      "validateString",
      "_setFlagsFromString",
      "return function setFlagsFromString(flags) {\\n" +
      "  validateString(flags, 'flags');\\n" +
      "  _setFlagsFromString(flags);\\n" +
      "}"
    )(
      function validateString() {},
      function _setFlagsFromString() { calls += 1; }
    );
    Object.defineProperty(v8, "setFlagsFromString", {
      value: replacement,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(v8, "setFlagsFromString", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 2;
    if (calls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 process.getBuiltinModule replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Object.getOwnPropertyDescriptor(process, "getBuiltinModule");
    if (!original || typeof original.value !== "function") process.exit(0);
    let calls = 0;
    Object.defineProperty(process, "getBuiltinModule", {
      value: function getBuiltinModule() { calls += 1; return null; },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(process, "getBuiltinModule", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 4;
    if (calls !== 0) process.exitCode = 5;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 preloaded vm data replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const original = Object.getOwnPropertyDescriptor(vm, "runInNewContext");
    let calls = 0;
    Object.defineProperty(vm, "runInNewContext", {
      value: function runInNewContext() { calls += 1; throw new Error("poison vm"); },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(vm, "runInNewContext", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 6;
    if (calls !== 0) process.exitCode = 7;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 fallback brand checks never invoke Symbol.toStringTag getters", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    let types;
    try { types = require("node:util/types"); }
    catch { types = require("node:util").types; }
    const original = Object.getOwnPropertyDescriptor(types, "isDate");
    Object.defineProperty(types, "isDate", {
      value: function isDate() { return false; },
      writable: true,
      enumerable: true,
      configurable: true
    });
    const api = require(${JSON.stringify(indexPath)});
    Object.defineProperty(types, "isDate", original);
    let tagCalls = 0;
    const value = {};
    Object.defineProperty(value, Symbol.toStringTag, {
      get() { tagCalls += 1; throw new Error("toStringTag getter executed"); },
      configurable: true
    });
    Promise.resolve(api.generateContractProtectionProposal(value)).catch(() => {}).then(() => {
      if (tagCalls !== 0) process.exitCode = 8;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 package bootstrap never invokes ambient Set replacement", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeSet = Set;
    let calls = 0;
    function PoisonSet(iterable) { calls += 1; return new NativeSet(iterable); }
    PoisonSet.prototype = NativeSet.prototype;
    globalThis.Set = PoisonSet;
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { globalThis.Set = NativeSet; }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 9;
    if (calls !== 0) process.exitCode = 10;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 provider consumes then rejects unshieldable fulfilled transport Promises", async () => {
  const { createStructuredProviderAdapter } = require("../src");
  const instructions =
    "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
    "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
    "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
    "The protection statement must describe what the quality system should enforce.\n" +
    "The rationale must explain why this protection addresses the selected survivor.";
  const request = {
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: { id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" },
    attack: {
      id: "wrong-time", ruleId: "time-rule", type: "wrong-time",
      description: "Changes the approved time.", rationale: "Violates the confirmed rule.", output: {}
    },
    instructions
  };

  for (const mode of ["non-configurable", "non-extensible"]) {
    const adapter = createStructuredProviderAdapter({
      mode: "contract-protection",
      model: "x",
      transport() {
        const promise = Promise.resolve({
          version: 1,
          kind: "gotcha-provider-response",
          output: proposal()
        });
        if (mode === "non-configurable") {
          Object.defineProperty(promise, "constructor", {
            value: Promise,
            writable: false,
            enumerable: false,
            configurable: false
          });
        } else {
          Object.preventExtensions(promise);
        }
        return promise;
      }
    });
    await assert.rejects(adapter(request), TypeError, mode);
  }
});



test("round9 preloaded vm replacement never executes through lazy runContractAttacks load", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const original = Object.getOwnPropertyDescriptor(vm, "runInNewContext");
    let poisonCalls = 0;
    Object.defineProperty(vm, "runInNewContext", {
      value: function runInNewContext() {
        poisonCalls += 1;
        throw new Error("poisoned lazy vm authority executed");
      },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    let publicFn;
    try {
      api = require(${JSON.stringify(indexPath)});
      if (poisonCalls !== 0) process.exitCode = 81;
      try { publicFn = api.runContractAttacks; }
      catch (error) {
        console.error(error && error.stack || error);
        process.exitCode = 82;
      }
      if (poisonCalls !== 0) process.exitCode = 83;
      if (typeof publicFn !== "function") process.exitCode = 84;
    } finally {
      Object.defineProperty(vm, "runInNewContext", original);
    }
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 runtime-authority is the sole runInNewContext authority consumer", () => {
  const fs = require("node:fs");
  const sourceDir = path.join(repoRoot, "src");
  const allowed = "runtime-authority.js";
  const offenders = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".js") || name === allowed) continue;
    const source = fs.readFileSync(path.join(sourceDir, name), "utf8");
    if (source.includes("runInNewContext")) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, []);
});
