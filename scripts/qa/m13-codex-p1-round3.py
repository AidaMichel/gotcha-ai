from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing target: {label}")
    p.write_text(s.replace(old, new, 1))

# 1) contract-attacks-core: never invoke accessor-backed globalThis.Promise.
replace_once(
    "src/contract-attacks-core.js",
    '''try {\n  const ambientPromiseCandidate = globalThis.Promise;\n  if (\n    typeof ambientPromiseCandidate === "function" &&\n    promiseCaptureIsProxy(ambientPromiseCandidate) !== true\n  ) {''',
    '''try {\n  const ambientPromiseDescriptor =\n    promiseCaptureGetOwnPropertyDescriptor(globalThis, "Promise");\n  const ambientPromiseCandidate =\n    ambientPromiseDescriptor !== undefined &&\n    !("get" in ambientPromiseDescriptor) &&\n    !("set" in ambientPromiseDescriptor)\n      ? ambientPromiseDescriptor.value\n      : null;\n  if (\n    typeof ambientPromiseCandidate === "function" &&\n    promiseCaptureIsProxy(ambientPromiseCandidate) !== true\n  ) {''',
    "contract-attacks ambient Promise descriptor"
)

# 2) contract-quality-loop: source equality is insufficient; require exact local ambient identity.
replace_once(
    "src/contract-quality-loop.js",
    '''  if (\n    typeof constructorCandidate === "function" &&\n    isProxy(constructorCandidate) !== true &&\n    reflectApply(functionToString, constructorCandidate, []) === pristinePromiseConstructorSource &&\n    typeof thenCandidate === "function" &&\n    isProxy(thenCandidate) !== true &&\n    reflectApply(functionToString, thenCandidate, []) === pristinePromiseThenSource\n  ) {\n    PromiseConstructor = constructorCandidate;\n    PromiseThen = thenCandidate;\n  }''',
    '''  const ambientPromiseDescriptor =\n    getOwnPropertyDescriptor(globalThis, "Promise");\n  const ambientPromiseCandidate =\n    ambientPromiseDescriptor !== undefined &&\n    !("get" in ambientPromiseDescriptor) &&\n    !("set" in ambientPromiseDescriptor)\n      ? ambientPromiseDescriptor.value\n      : null;\n  const ambientPrototypeDescriptor =\n    typeof ambientPromiseCandidate === "function" &&\n    isProxy(ambientPromiseCandidate) !== true\n      ? getOwnPropertyDescriptor(ambientPromiseCandidate, "prototype")\n      : undefined;\n  if (\n    typeof constructorCandidate === "function" &&\n    isProxy(constructorCandidate) !== true &&\n    constructorCandidate === ambientPromiseCandidate &&\n    ambientPrototypeDescriptor !== undefined &&\n    !("get" in ambientPrototypeDescriptor) &&\n    !("set" in ambientPrototypeDescriptor) &&\n    ambientPrototypeDescriptor.value === PromisePrototype &&\n    reflectApply(functionToString, constructorCandidate, []) === pristinePromiseConstructorSource &&\n    typeof thenCandidate === "function" &&\n    isProxy(thenCandidate) !== true &&\n    reflectApply(functionToString, thenCandidate, []) === pristinePromiseThenSource\n  ) {\n    PromiseConstructor = constructorCandidate;\n    PromiseThen = thenCandidate;\n  }''',
    "quality loop exact local Promise identity"
)

# 3) provider-adapter-m13: legacy adapter only when local ambient TypeError is genuine.
replace_once(
    "src/provider-adapter-m13.js",
    '''let createLegacyStructuredProviderAdapter = null;\nif (promiseAuthorityAvailable) {\n  const legacyAdapter = require("./provider-adapter");''',
    '''let legacyTypeErrorAuthorityAvailable = false;\ntry {\n  let localTypeErrorPrototype = null;\n  try {\n    null.m13LegacyTypeErrorProbe;\n  } catch (error) {\n    localTypeErrorPrototype = getPrototypeOf(error);\n  }\n  const ambientTypeErrorDescriptor =\n    getOwnPropertyDescriptor(globalThis, "TypeError");\n  const ambientTypeErrorCandidate =\n    ambientTypeErrorDescriptor !== undefined &&\n    !("get" in ambientTypeErrorDescriptor) &&\n    !("set" in ambientTypeErrorDescriptor)\n      ? ambientTypeErrorDescriptor.value\n      : null;\n  const ambientTypeErrorPrototypeDescriptor =\n    typeof ambientTypeErrorCandidate === "function" &&\n    !isProxy(ambientTypeErrorCandidate)\n      ? getOwnPropertyDescriptor(ambientTypeErrorCandidate, "prototype")\n      : undefined;\n  legacyTypeErrorAuthorityAvailable = (\n    localTypeErrorPrototype !== null &&\n    typeof ambientTypeErrorCandidate === "function" &&\n    !isProxy(ambientTypeErrorCandidate) &&\n    ambientTypeErrorPrototypeDescriptor !== undefined &&\n    !("get" in ambientTypeErrorPrototypeDescriptor) &&\n    !("set" in ambientTypeErrorPrototypeDescriptor) &&\n    ambientTypeErrorPrototypeDescriptor.value === localTypeErrorPrototype\n  );\n} catch {\n  legacyTypeErrorAuthorityAvailable = false;\n}\n\nlet createLegacyStructuredProviderAdapter = null;\nif (promiseAuthorityAvailable && legacyTypeErrorAuthorityAvailable) {\n  const legacyAdapter = require("./provider-adapter");''',
    "legacy TypeError authority gate"
)

# 4) proposal: consume recognized changed-prototype rejected promises before boundary failure.
replace_once(
    "src/contract-protection-proposal.js",
    '''function observeAcceptedPromise(promise, onFulfilled, onRejected) {\n  if (\n    isProxy(promise) === true ||\n    !isPromiseBrand(promise) ||\n    getPrototypeOf(promise) !== promisePrototype\n  ) throw boundaryError();\n\n  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");''',
    '''function consumeRejectedRecognizedPromise(promise) {\n  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");\n  if (\n    previousConstructor !== undefined &&\n    previousConstructor.configurable !== true\n  ) {\n    if (!trustedPromiseConstructorDescriptor(previousConstructor)) return false;\n    reflectApply(promiseThen, promise, [undefined, () => {}]);\n    return true;\n  }\n  if (\n    previousConstructor === undefined &&\n    isExtensible(promise) !== true\n  ) {\n    return false;\n  }\n  defineProperty(promise, "constructor", {\n    value: safePromiseSpeciesContainer,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n  let consumed = false;\n  try {\n    reflectApply(promiseThen, promise, [undefined, () => {}]);\n    consumed = true;\n  } finally {\n    if (previousConstructor === undefined) {\n      if (deleteProperty(promise, "constructor") !== true) consumed = false;\n    } else {\n      try {\n        defineProperty(promise, "constructor", previousConstructor);\n      } catch {\n        consumed = false;\n      }\n    }\n  }\n  return consumed;\n}\n\nfunction observeAcceptedPromise(promise, onFulfilled, onRejected) {\n  if (\n    isProxy(promise) === true ||\n    !isPromiseBrand(promise)\n  ) throw boundaryError();\n\n  if (getPrototypeOf(promise) !== promisePrototype) {\n    consumeRejectedRecognizedPromise(promise);\n    throw boundaryError();\n  }\n\n  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");''',
    "proposal changed-prototype rejection consumption"
)

# 5) provider adapter: same consumption guarantee for recognized transport promises.
replace_once(
    "src/provider-adapter-m13.js",
    '''function observeAcceptedPromise(promise, onFulfilled, onRejected) {\n  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");''',
    '''function consumeRejectedRecognizedPromise(promise) {\n  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");\n  if (\n    constructorDescriptor !== undefined &&\n    constructorDescriptor.configurable !== true\n  ) {\n    if (!constructorDescriptorIsTrusted(constructorDescriptor)) return false;\n    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);\n    return true;\n  }\n  if (constructorDescriptor === undefined && isExtensible(promise) !== true) {\n    return false;\n  }\n  defineProperty(promise, "constructor", {\n    value: safePromiseConstructor,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n  let consumed = false;\n  try {\n    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);\n    consumed = true;\n  } finally {\n    if (constructorDescriptor === undefined) {\n      if (deleteProperty(promise, "constructor") !== true) consumed = false;\n    } else {\n      try {\n        defineProperty(promise, "constructor", constructorDescriptor);\n      } catch {\n        consumed = false;\n      }\n    }\n  }\n  return consumed;\n}\n\nfunction observeAcceptedPromise(promise, onFulfilled, onRejected) {\n  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");''',
    "provider rejection consumer helper"
)

# Insert consume-before-prototype-failure after genuine Promise brand recognition.
replace_once(
    "src/provider-adapter-m13.js",
    '''    if (!isPromise(transportResult)) {\n      throw boundaryError();\n    }\n    if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\n      throw boundaryError();\n    }''',
    '''    if (!isPromise(transportResult)) {\n      throw boundaryError();\n    }\n    if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\n      consumeRejectedRecognizedPromise(transportResult);\n      throw boundaryError();\n    }''',
    "provider consume before prototype failure"
)

# 6) Mutation Pack must fail before executing any callback if rejection observation authority is unavailable.
replace_once(
    "src/mutation-pack.js",
    '''  const validatedMutations =\n    packEntries.map(\n      (\n        mutation,\n        index\n      ) =>\n        captureMutation(\n          mutation,\n          index,\n          ids\n        )\n    );\n\n  return validatedMutations.map(''',
    '''  const validatedMutations =\n    packEntries.map(\n      (\n        mutation,\n        index\n      ) =>\n        captureMutation(\n          mutation,\n          index,\n          ids\n        )\n    );\n\n  if (typeof promiseThen !== "function") {\n    throw new Error(\n      "Mutation Pack Promise observation authority is unavailable."\n    );\n  }\n\n  return validatedMutations.map(''',
    "mutation pack fail before callbacks"
)

# Permanent regressions. Use subprocesses where pre-load poisoning is required.
p = Path("test/m13-review-remediation.test.js")
s = p.read_text()
marker = 'test("round3 rejects accessor-backed core Promise authority without invoking the getter"'
if marker not in s:
    s += r'''

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
      experiment: makeReplayableExperiment(),
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
'''
    p.write_text(s)

p = Path("test/provider-adapter-m13.test.js")
s = p.read_text()
marker = 'test("contract-protection adapter consumes rejected changed-prototype trusted Promises"'
if marker not in s:
    s += r'''

test("contract-protection adapter consumes rejected changed-prototype trusted Promises", async () => {
  const reason = { code: "changed-prototype-transport-rejection" };
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport() {
      const promise = Promise.reject(reason);
      Object.setPrototypeOf(promise, {});
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
marker = 'test("missing Promise observation authority fails before mutation callbacks execute"'
if marker not in s:
    s += r'''

test("missing Promise observation authority fails before mutation callbacks execute", () => {
  const modulePath = require.resolve("../src/mutation-pack");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const descriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "then");
    Object.defineProperty(NativePromise.prototype, "then", {
      value: null, writable: true, enumerable: false, configurable: true
    });
    const { compileMutationPack } = require(${JSON.stringify(require.resolve("../src/mutation-pack"))});
    Object.defineProperty(NativePromise.prototype, "then", descriptor);
    let calls = 0;
    try {
      compileMutationPack({
        output: { ok: true },
        pack: [{
          id: "x", type: "x", description: "x",
          mutate(value) { calls += 1; return value; },
          scores: { severity: 1, realism: 1, subtlety: 1, novelty: 1, fixability: 1 },
          protection: { description: "x", check() { calls += 1; return true; } }
        }]
      });
      process.exit(12);
    } catch {}
    if (calls !== 0) process.exit(13);
  `;
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
    p.write_text(s)
