from pathlib import Path

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
marker = '// ROUND5_CODEX_AUTHORITY_REGRESSIONS\n'
if marker in text:
    print("round5 regressions already present")
    raise SystemExit(0)

addition = r'''

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

test("round5 pre-load Proxy forbidden-brand probe fails closed without trap execution", async () => {
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
  await assert.rejects(adapter({}), TypeError);
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
'''

path.write_text(text + addition)
print("round5 permanent Codex regressions prepared")
