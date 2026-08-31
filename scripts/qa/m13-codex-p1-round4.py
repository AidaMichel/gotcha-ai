from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing target: {label}")
    p.write_text(s.replace(old, new, 1))

# Proposal: authenticate isPromise probe before any use.
replace_once(
    "src/contract-protection-proposal.js",
    '''for (let index = 0; index < requiredFunctions.length; index += 1) {\n  if (typeof requiredFunctions[index] !== "function") {\n    boundaryAuthorityAvailable = false;\n    break;\n  }\n}\n\nif (\n  typeof arrayIsArray !== "function" ||''',
    '''for (let index = 0; index < requiredFunctions.length; index += 1) {\n  if (typeof requiredFunctions[index] !== "function") {\n    boundaryAuthorityAvailable = false;\n    break;\n  }\n}\n\ntry {\n  const pristineReflectApply = runInNewContext("Reflect.apply");\n  const pristineFunctionToString = runInNewContext("Function.prototype.toString");\n  const promiseBrandProbeSource = pristineReflectApply(\n    pristineFunctionToString,\n    promiseBrandProbe,\n    []\n  );\n  if (promiseBrandProbeSource !== "function isPromise() { [native code] }") {\n    boundaryAuthorityAvailable = false;\n  }\n} catch {\n  boundaryAuthorityAvailable = false;\n}\n\nif (\n  typeof arrayIsArray !== "function" ||''',
    "proposal isPromise probe authentication"
)

# Proposal: foreign-realm Promise.prototype.then must fail authority.
replace_once(
    "src/contract-protection-proposal.js",
    '''    promiseThenDescriptor.configurable === true &&\n    capturedPromiseThenSource === pristinePromiseThenSource\n  );''',
    '''    promiseThenDescriptor.configurable === true &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [promiseThen]) === Function.prototype &&\n    capturedPromiseThenSource === pristinePromiseThenSource\n  );''',
    "proposal local-realm then identity"
)

# Proposal: consume genuine rejected Promise via engine await, independent of prototype/extensibility/species.
start = '''function consumeRejectedRecognizedPromise(promise) {\n  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");'''
end = '''  return consumed;\n}\n\nfunction observeAcceptedPromise'''
p = Path("src/contract-protection-proposal.js")
s = p.read_text()
i = s.find(start)
j = s.find(end, i)
if i < 0 or j < 0:
    raise SystemExit("missing target: proposal rejection consumer")
replacement = '''function consumeRejectedRecognizedPromise(promise) {\n  (async function consumeM13RejectedPromise() {\n    try {\n      await promise;\n    } catch {\n      // Rejection is intentionally consumed before the public boundary fails closed.\n    }\n  })();\n  return true;\n}\n\nfunction observeAcceptedPromise'''
s = s[:i] + replacement + s[j + len(end):]
p.write_text(s)

# Provider: authenticate util.types probes without invoking a Proxy wrapper.
replace_once(
    "src/provider-adapter-m13.js",
    '''const weakSetDelete = WeakSet.prototype.delete;\n\nconst CONTRACT_PROTECTION_INSTRUCTIONS_V1 =''',
    '''const weakSetDelete = WeakSet.prototype.delete;\n\nlet providerBrandAuthorityAvailable = false;\ntry {\n  const pristineReflectApply = runInNewContext("Reflect.apply");\n  const pristineFunctionToString = runInNewContext("Function.prototype.toString");\n  providerBrandAuthorityAvailable = (\n    pristineReflectApply(pristineFunctionToString, isPromise, []) ===\n      "function isPromise() { [native code] }" &&\n    pristineReflectApply(pristineFunctionToString, isProxy, []) ===\n      "function isProxy() { [native code] }"\n  );\n} catch {\n  providerBrandAuthorityAvailable = false;\n}\n\nconst CONTRACT_PROTECTION_INSTRUCTIONS_V1 =''',
    "provider util.types authentication"
)

# Provider: exact local realm for Promise.then and require authenticated brand probes.
replace_once(
    "src/provider-adapter-m13.js",
    '''    !isProxy(thenDescriptor.value) &&\n    intrinsicThenSource === pristinePromiseThenSource\n  );''',
    '''    !isProxy(thenDescriptor.value) &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenDescriptor.value]) === Function.prototype &&\n    intrinsicThenSource === pristinePromiseThenSource\n  );''',
    "provider local-realm then identity"
)
replace_once(
    "src/provider-adapter-m13.js",
    '''  promiseAuthorityAvailable =\n    intrinsicAuthorityValid && ambientPrototypeMatches;''',
    '''  promiseAuthorityAvailable =\n    providerBrandAuthorityAvailable &&\n    intrinsicAuthorityValid &&\n    ambientPrototypeMatches;''',
    "provider brand authority gate"
)

# Provider: exact current-realm TypeError constructor identity, not prototype-only equivalence.
replace_once(
    "src/provider-adapter-m13.js",
    '''  const ambientTypeErrorPrototypeDescriptor =\n    typeof ambientTypeErrorCandidate === "function" &&\n    !isProxy(ambientTypeErrorCandidate)\n      ? getOwnPropertyDescriptor(ambientTypeErrorCandidate, "prototype")\n      : undefined;\n  legacyTypeErrorAuthorityAvailable = (\n    localTypeErrorPrototype !== null &&\n    typeof ambientTypeErrorCandidate === "function" &&\n    !isProxy(ambientTypeErrorCandidate) &&\n    ambientTypeErrorPrototypeDescriptor !== undefined &&\n    !("get" in ambientTypeErrorPrototypeDescriptor) &&\n    !("set" in ambientTypeErrorPrototypeDescriptor) &&\n    ambientTypeErrorPrototypeDescriptor.value === localTypeErrorPrototype\n  );''',
    '''  const localTypeErrorConstructorDescriptor =\n    localTypeErrorPrototype !== null\n      ? getOwnPropertyDescriptor(localTypeErrorPrototype, "constructor")\n      : undefined;\n  const localTypeErrorConstructor =\n    localTypeErrorConstructorDescriptor !== undefined &&\n    !("get" in localTypeErrorConstructorDescriptor) &&\n    !("set" in localTypeErrorConstructorDescriptor) &&\n    typeof localTypeErrorConstructorDescriptor.value === "function"\n      ? localTypeErrorConstructorDescriptor.value\n      : null;\n  const ambientTypeErrorPrototypeDescriptor =\n    typeof ambientTypeErrorCandidate === "function" &&\n    !isProxy(ambientTypeErrorCandidate)\n      ? getOwnPropertyDescriptor(ambientTypeErrorCandidate, "prototype")\n      : undefined;\n  legacyTypeErrorAuthorityAvailable = (\n    localTypeErrorPrototype !== null &&\n    localTypeErrorConstructor !== null &&\n    ambientTypeErrorCandidate === localTypeErrorConstructor &&\n    !isProxy(ambientTypeErrorCandidate) &&\n    ambientTypeErrorPrototypeDescriptor !== undefined &&\n    !("get" in ambientTypeErrorPrototypeDescriptor) &&\n    !("set" in ambientTypeErrorPrototypeDescriptor) &&\n    ambientTypeErrorPrototypeDescriptor.value === localTypeErrorPrototype\n  );''',
    "provider exact TypeError identity"
)

# Provider: discard any pre-cached legacy module before retaining authority under authenticated globals.
replace_once(
    "src/provider-adapter-m13.js",
    '''let createLegacyStructuredProviderAdapter = null;\nif (promiseAuthorityAvailable && legacyTypeErrorAuthorityAvailable) {\n  const legacyAdapter = require("./provider-adapter");''',
    '''let createLegacyStructuredProviderAdapter = null;\nif (promiseAuthorityAvailable && legacyTypeErrorAuthorityAvailable) {\n  const legacyAdapterPath = require.resolve("./provider-adapter");\n  delete require.cache[legacyAdapterPath];\n  const legacyAdapter = require(legacyAdapterPath);''',
    "provider pre-cached legacy invalidation"
)

# Provider: consume rejected recognized Promise via engine await.
p = Path("src/provider-adapter-m13.js")
s = p.read_text()
start = '''function consumeRejectedRecognizedPromise(promise) {\n  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");'''
end = '''  return consumed;\n}\n\nfunction observeAcceptedPromise'''
i = s.find(start)
j = s.find(end, i)
if i < 0 or j < 0:
    raise SystemExit("missing target: provider rejection consumer")
replacement = '''function consumeRejectedRecognizedPromise(promise) {\n  (async function consumeM13TransportRejection() {\n    try {\n      await promise;\n    } catch {\n      // Rejection is intentionally consumed before reporting the boundary failure.\n    }\n  })();\n  return true;\n}\n\nfunction observeAcceptedPromise'''
s = s[:i] + replacement + s[j + len(end):]
p.write_text(s)

# M12: a genuine Promise.then from another realm is not local authority.
replace_once(
    "src/contract-quality-loop.js",
    '''    typeof thenCandidate === "function" &&\n    isProxy(thenCandidate) !== true &&\n    reflectApply(functionToString, thenCandidate, []) === pristinePromiseThenSource''',
    '''    typeof thenCandidate === "function" &&\n    isProxy(thenCandidate) !== true &&\n    getPrototypeOf(thenCandidate) === Function.prototype &&\n    reflectApply(functionToString, thenCandidate, []) === pristinePromiseThenSource''',
    "M12 local-realm then identity"
)

# Mutation Pack: authenticate constructor + ambient identity + local-realm then before callbacks.
p = Path("src/mutation-pack.js")
s = p.read_text()
old = '''let promiseThen = null;\ntry {\n  const thenCandidate =\n    mutationPromiseThenDescriptor !== undefined &&\n    !("get" in mutationPromiseThenDescriptor) &&\n    !("set" in mutationPromiseThenDescriptor)\n      ? mutationPromiseThenDescriptor.value\n      : null;\n  const pristinePromiseThenSource = runInNewContext(\n    "Function.prototype.toString.call(Promise.prototype.then)"\n  );\n  if (\n    typeof thenCandidate === "function" &&\n    utilTypes.isProxy(thenCandidate) !== true &&\n    Reflect.apply(functionToString, thenCandidate, []) === pristinePromiseThenSource\n  ) {\n    promiseThen = thenCandidate;\n  }\n} catch {\n  promiseThen = null;\n}\n'''
new = '''let promiseThen = null;\ntry {\n  const constructorCandidate =\n    mutationPromiseConstructorDescriptor !== undefined &&\n    !("get" in mutationPromiseConstructorDescriptor) &&\n    !("set" in mutationPromiseConstructorDescriptor)\n      ? mutationPromiseConstructorDescriptor.value\n      : null;\n  const thenCandidate =\n    mutationPromiseThenDescriptor !== undefined &&\n    !("get" in mutationPromiseThenDescriptor) &&\n    !("set" in mutationPromiseThenDescriptor)\n      ? mutationPromiseThenDescriptor.value\n      : null;\n  const ambientPromiseDescriptor = getOwnPropertyDescriptor(globalThis, "Promise");\n  const ambientPromiseCandidate =\n    ambientPromiseDescriptor !== undefined &&\n    !("get" in ambientPromiseDescriptor) &&\n    !("set" in ambientPromiseDescriptor)\n      ? ambientPromiseDescriptor.value\n      : null;\n  const pristinePromiseConstructorSource = runInNewContext(\n    "Function.prototype.toString.call(Promise)"\n  );\n  const pristinePromiseThenSource = runInNewContext(\n    "Function.prototype.toString.call(Promise.prototype.then)"\n  );\n  if (\n    typeof constructorCandidate === "function" &&\n    utilTypes.isProxy(constructorCandidate) !== true &&\n    constructorCandidate === ambientPromiseCandidate &&\n    getPrototypeOf(constructorCandidate) === Function.prototype &&\n    Reflect.apply(functionToString, constructorCandidate, []) === pristinePromiseConstructorSource &&\n    typeof thenCandidate === "function" &&\n    utilTypes.isProxy(thenCandidate) !== true &&\n    getPrototypeOf(thenCandidate) === Function.prototype &&\n    Reflect.apply(functionToString, thenCandidate, []) === pristinePromiseThenSource\n  ) {\n    promiseThen = thenCandidate;\n  }\n} catch {\n  promiseThen = null;\n}\n'''
if old not in s:
    raise SystemExit("missing target: Mutation Pack Promise authority")
s = s.replace(old, new, 1)
p.write_text(s)

# Permanent regressions.
p = Path("test/m13-review-remediation.test.js")
s = p.read_text()
marker = 'test("round4 rejects foreign-realm Promise.then authority across M13 and M12"'
if marker not in s:
    s += r'''

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

test("round4 rejects Proxy isPromise probe before proposal generator execution", async () => {
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
'''
    p.write_text(s)

p = Path("test/provider-adapter-m13.test.js")
s = p.read_text()
marker = 'test("contract-protection adapter consumes non-extensible changed-prototype rejected Promise"'
if marker not in s:
    s += r'''

test("contract-protection adapter consumes non-extensible changed-prototype rejected Promise", async () => {
  const reason = { code: "round4-transport" };
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport() {
      const promise = Promise.reject(reason);
      Object.setPrototypeOf(promise, {});
      Object.preventExtensions(promise);
      return promise;
    }
  });
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.once("unhandledRejection", listener);
  await assert.rejects(
    generator({
      task: "Return the approved time.",
      case: { input: {}, expectedOutput: {} },
      source: { attackId: "wrong-time", ruleId: "time-rule" },
      rule: { id: "time-rule", statement: "x", kind: "required", severity: "major" },
      attack: { id: "wrong-time", ruleId: "time-rule", type: "x", description: "x", rationale: "x", output: {} },
      instructions: INSTRUCTIONS
    }),
    TypeError
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});
'''
    p.write_text(s)

p = Path("test/mutation-pack.test.js")
s = p.read_text()
marker = 'test("foreign Promise.then and poisoned Promise constructor fail before Mutation Pack callbacks"'
if marker not in s:
    s += r'''

test("foreign Promise.then and poisoned Promise constructor fail before Mutation Pack callbacks", () => {
  const { spawnSync } = require("node:child_process");
  const path = require("node:path");
  const modulePath = path.join(__dirname, "..", "src", "mutation-pack.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const NativePromise = Promise;
    const localThen = NativePromise.prototype.then;
    const constructorDescriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    const foreignThen = vm.runInNewContext("Promise.prototype.then");
    let constructorTraps = 0;
    const proxyConstructor = new Proxy(NativePromise, { construct(target, args, newTarget) { constructorTraps += 1; return Reflect.construct(target, args, newTarget); } });
    Object.defineProperty(NativePromise.prototype, "then", { value: foreignThen, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(NativePromise.prototype, "constructor", { value: proxyConstructor, writable: true, enumerable: false, configurable: true });
    const { compileMutationPack } = require(${JSON.stringify(modulePath)});
    Object.defineProperty(NativePromise.prototype, "then", { value: localThen, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(NativePromise.prototype, "constructor", constructorDescriptor);
    let callbackCalls = 0;
    try {
      compileMutationPack({ output: { value: "good" }, pack: [{
        id: "x", type: "x", description: "x",
        mutate(output) { callbackCalls += 1; return output; },
        scores: { severity: 1, realism: 1, subtlety: 1, novelty: 1, fixability: 1 },
        protection: { description: "x", check() { callbackCalls += 1; return true; } }
      }] });
      process.exit(31);
    } catch {}
    if (callbackCalls !== 0 || constructorTraps !== 0) process.exit(32);
  `;
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
    p.write_text(s)

print("round4 patch prepared")
