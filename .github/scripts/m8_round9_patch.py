from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"non-unique patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


contract_path = Path("src/contract-attacks.js")
text = contract_path.read_text()

text = replace_once(
    text,
    '''function safeObjectHasInstance(\n  value\n) {\n  if (\n    value !== null &&\n    typeof value === "object"\n  ) {\n    return true;\n  }\n\n  return reflectApply(\n    functionHasInstance,\n    ObjectConstructor,\n    [value]\n  );\n}\n''',
    '''function safeObjectHasInstance(\n  value\n) {\n  if (\n    value !== null &&\n    typeof value === "object"\n  ) {\n    try {\n      return getPrototypeOf(value) !== null;\n    } catch {\n      return false;\n    }\n  }\n\n  return reflectApply(\n    functionHasInstance,\n    ObjectConstructor,\n    [value]\n  );\n}\n''',
    "null-prototype instanceof semantics",
)

text = replace_once(
    text,
    '''function samePropertyDescriptor(\n  left,\n  right\n) {\n  if (\n    left === undefined ||\n    right === undefined\n  ) {\n    return left === right;\n  }\n\n  for (\n    const key of [\n      "value",\n      "get",\n      "set",\n      "writable",\n      "enumerable",\n      "configurable"\n    ]\n  ) {\n    if (left[key] !== right[key]) {\n      return false;\n    }\n  }\n\n  return true;\n}\n''',
    '''const PROPERTY_DESCRIPTOR_KEYS =\n  objectFreeze([\n    "value",\n    "get",\n    "set",\n    "writable",\n    "enumerable",\n    "configurable"\n  ]);\n\nfunction samePropertyDescriptor(\n  left,\n  right\n) {\n  if (\n    left === undefined ||\n    right === undefined\n  ) {\n    return left === right;\n  }\n\n  for (\n    let index = 0;\n    index < PROPERTY_DESCRIPTOR_KEYS.length;\n    index += 1\n  ) {\n    const key =\n      PROPERTY_DESCRIPTOR_KEYS[index];\n\n    if (left[key] !== right[key]) {\n      return false;\n    }\n  }\n\n  return true;\n}\n''',
    "iterator-independent descriptor comparison",
)

text = replace_once(
    text,
    '''    if (arrayIsArray(current)) {\n      addEvaluatorInstanceSemantic(\n        semantics,\n        captureNativeRealmConstructor(\n          prototype,\n          arrayConstructorSource\n        ),\n        safeArrayHasInstance\n      );\n\n      const objectPrototype =\n        prototype === null\n          ? null\n          : getPrototypeOf(prototype);\n''',
    '''    if (arrayIsArray(current)) {\n      if (\n        prototype !== null &&\n        utilIsProxy(prototype)\n      ) {\n        continue;\n      }\n\n      addEvaluatorInstanceSemantic(\n        semantics,\n        captureNativeRealmConstructor(\n          prototype,\n          arrayConstructorSource\n        ),\n        safeArrayHasInstance\n      );\n\n      const objectPrototype =\n        prototype === null\n          ? null\n          : getPrototypeOf(prototype);\n''',
    "proxy array prototype guard",
)

anchor = '''function canInstallEvaluatorInstanceSemantic(\n  constructor,\n  previousDescriptor\n) {\n  if (previousDescriptor === undefined) {\n    return isExtensible(constructor);\n  }\n\n  return previousDescriptor.configurable === true;\n}\n\n'''
addition = '''function canInstallEvaluatorInstanceSemantic(\n  constructor,\n  previousDescriptor\n) {\n  if (previousDescriptor === undefined) {\n    return isExtensible(constructor);\n  }\n\n  return previousDescriptor.configurable === true;\n}\n\nfunction captureEvaluatorFallbackPrototypes(\n  value\n) {\n  const fallback = {\n    arrayPrototype: null,\n    objectPrototype: null\n  };\n\n  if (\n    value === null ||\n    typeof value !== "object" ||\n    utilIsProxy(value)\n  ) {\n    return fallback;\n  }\n\n  const seen =\n    new WeakSetConstructor();\n  const stack = [value];\n\n  while (stack.length > 0) {\n    const current =\n      reflectApply(\n        arrayPop,\n        stack,\n        []\n      );\n\n    if (\n      current === null ||\n      typeof current !== "object" ||\n      reflectApply(\n        weakSetHas,\n        seen,\n        [current]\n      ) ||\n      utilIsProxy(current)\n    ) {\n      continue;\n    }\n\n    reflectApply(\n      weakSetAdd,\n      seen,\n      [current]\n    );\n\n    let prototype;\n    let descriptors;\n\n    try {\n      prototype =\n        getPrototypeOf(current);\n      descriptors =\n        getOwnPropertyDescriptors(\n          current\n        );\n    } catch {\n      continue;\n    }\n\n    if (\n      prototype !== null &&\n      utilIsProxy(prototype)\n    ) {\n      continue;\n    }\n\n    if (arrayIsArray(current)) {\n      const arrayConstructor =\n        captureNativeRealmConstructor(\n          prototype,\n          arrayConstructorSource\n        );\n\n      if (\n        arrayConstructor !== null &&\n        arrayConstructor !== ArrayConstructor &&\n        fallback.arrayPrototype === null\n      ) {\n        const previousDescriptor =\n          getOwnPropertyDescriptor(\n            arrayConstructor,\n            arrayHasInstanceSymbol\n          );\n\n        if (\n          !canInstallEvaluatorInstanceSemantic(\n            arrayConstructor,\n            previousDescriptor\n          )\n        ) {\n          fallback.arrayPrototype =\n            prototype;\n        }\n      }\n\n      const parentPrototype =\n        prototype === null\n          ? null\n          : getPrototypeOf(prototype);\n\n      if (\n        parentPrototype !== null &&\n        !utilIsProxy(parentPrototype)\n      ) {\n        const objectConstructor =\n          captureNativeRealmConstructor(\n            parentPrototype,\n            objectConstructorSource\n          );\n\n        if (\n          objectConstructor !== null &&\n          objectConstructor !== ObjectConstructor &&\n          fallback.objectPrototype === null\n        ) {\n          const previousDescriptor =\n            getOwnPropertyDescriptor(\n              objectConstructor,\n              arrayHasInstanceSymbol\n            );\n\n          if (\n            !canInstallEvaluatorInstanceSemantic(\n              objectConstructor,\n              previousDescriptor\n            )\n          ) {\n            fallback.objectPrototype =\n              parentPrototype;\n          }\n        }\n      }\n    } else {\n      const objectConstructor =\n        captureNativeRealmConstructor(\n          prototype,\n          objectConstructorSource\n        );\n\n      if (\n        objectConstructor !== null &&\n        objectConstructor !== ObjectConstructor &&\n        fallback.objectPrototype === null\n      ) {\n        const previousDescriptor =\n          getOwnPropertyDescriptor(\n            objectConstructor,\n            arrayHasInstanceSymbol\n          );\n\n        if (\n          !canInstallEvaluatorInstanceSemantic(\n            objectConstructor,\n            previousDescriptor\n          )\n        ) {\n          fallback.objectPrototype =\n            prototype;\n        }\n      }\n    }\n\n    const keys = ownKeys(descriptors);\n    for (\n      let index = 0;\n      index < keys.length;\n      index += 1\n    ) {\n      const descriptor =\n        descriptors[keys[index]];\n\n      if (\n        descriptor !== undefined &&\n        "value" in descriptor &&\n        descriptor.value !== null &&\n        typeof descriptor.value === "object"\n      ) {\n        reflectApply(\n          arrayPush,\n          stack,\n          [descriptor.value]\n        );\n      }\n    }\n  }\n\n  return fallback;\n}\n\nfunction buildEvaluatorPrototypePlan(\n  fallback\n) {\n  const objectPrototypeForEvaluator =\n    fallback.objectPrototype === null\n      ? safeCallbackObjectPrototype\n      : fallback.objectPrototype;\n\n  let arrayPrototypeForEvaluator =\n    safeCallbackArrayPrototype;\n\n  if (fallback.arrayPrototype !== null) {\n    arrayPrototypeForEvaluator =\n      fallback.arrayPrototype;\n  } else if (fallback.objectPrototype !== null) {\n    arrayPrototypeForEvaluator =\n      buildSafeCallbackPrototype(\n        arrayPrototype,\n        fallback.objectPrototype\n      );\n  }\n\n  return {\n    objectPrototype:\n      objectPrototypeForEvaluator,\n    arrayPrototype:\n      arrayPrototypeForEvaluator\n  };\n}\n\n'''
text = replace_once(text, anchor, addition, "frozen realm fallback helpers")

text = replace_once(
    text,
    '''function createEvaluatorSnapshot(\n  value\n) {\n''',
    '''function createEvaluatorSnapshot(\n  value,\n  prototypePlan\n) {\n''',
    "evaluator snapshot signature",
)

text = replace_once(
    text,
    '''    setPrototypeOf(\n      current,\n      arrayIsArray(current)\n        ? safeCallbackArrayPrototype\n        : safeCallbackObjectPrototype\n    );\n\n    objectFreeze(current);\n''',
    '''    const currentPrototype =\n      getPrototypeOf(current);\n\n    setPrototypeOf(\n      current,\n      arrayIsArray(current)\n        ? prototypePlan.arrayPrototype\n        : currentPrototype === null\n          ? null\n          : prototypePlan.objectPrototype\n    );\n\n    objectFreeze(current);\n''',
    "evaluator snapshot prototype plan",
)

text = replace_once(
    text,
    '''function createSafeEvaluator(\n  evaluator,\n  instanceSemantics\n) {\n''',
    '''function createSafeEvaluator(\n  evaluator,\n  instanceSemantics,\n  prototypePlan\n) {\n''',
    "safe evaluator signature",
)

text = replace_once(
    text,
    '''      createEvaluatorSnapshot(\n        output\n      );\n''',
    '''      createEvaluatorSnapshot(\n        output,\n        prototypePlan\n      );\n''',
    "safe evaluator snapshot call",
)

text = replace_once(
    text,
    '''async function runContractAttacks(\n  options = {}\n) {\n  const optionDescriptors =\n''',
    '''async function runContractAttacks(\n  options = {}\n) {\n  const runScope =\n    enterCallbackIntrinsicScope();\n\n  try {\n  const optionDescriptors =\n''',
    "run-level intrinsic scope entry",
)

text = replace_once(
    text,
    '''  const evaluatorInstanceSemantics =\n    captureEvaluatorInstanceSemantics(\n      expectedOutputInput\n    );\n\n  const safeEvaluator =\n    createSafeEvaluator(\n      evaluator,\n      evaluatorInstanceSemantics\n    );\n''',
    '''  const evaluatorInstanceSemantics =\n    captureEvaluatorInstanceSemantics(\n      expectedOutputInput\n    );\n\n  const evaluatorFallbackPrototypes =\n    captureEvaluatorFallbackPrototypes(\n      expectedOutputInput\n    );\n\n  const evaluatorPrototypePlan =\n    buildEvaluatorPrototypePlan(\n      evaluatorFallbackPrototypes\n    );\n\n  const safeEvaluator =\n    createSafeEvaluator(\n      evaluator,\n      evaluatorInstanceSemantics,\n      evaluatorPrototypePlan\n    );\n''',
    "evaluator fallback plan wiring",
)

text = replace_once(
    text,
    '''  return {\n    version: 1,\n    task:\n      contract.task,\n    baselinePassed:\n      true,\n    generatedAttacks,\n    discardedAttacks:\n      filtered.discarded,\n    attack:\n      attackResult,\n    topFinding\n  };\n}\n\nmodule.exports = {\n''',
    '''  return {\n    version: 1,\n    task:\n      contract.task,\n    baselinePassed:\n      true,\n    generatedAttacks,\n    discardedAttacks:\n      filtered.discarded,\n    attack:\n      attackResult,\n    topFinding\n  };\n  } finally {\n    closeCallbackIntrinsicScope(\n      runScope\n    );\n  }\n}\n\nmodule.exports = {\n''',
    "run-level intrinsic scope exit",
)

contract_path.write_text(text)


ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

ai = replace_once(
    ai,
    '''const navigatorLocks =\n  captureNavigatorLocks();\n\nconst unsupportedHostSingletons =\n''',
    '''const navigatorLocks =\n  captureNavigatorLocks();\n\nfunction captureCryptoSubtleSingleton() {\n  try {\n    const cryptoObject =\n      globalThis.crypto;\n\n    if (\n      cryptoObject === undefined ||\n      cryptoObject === null ||\n      typeof cryptoObject !== "object"\n    ) {\n      return null;\n    }\n\n    const subtle =\n      cryptoObject.subtle;\n\n    return (\n      subtle !== null &&\n      typeof subtle === "object"\n    )\n      ? subtle\n      : null;\n  } catch {\n    return null;\n  }\n}\n\nconst cryptoSubtleSingleton =\n  captureCryptoSubtleSingleton();\n\nconst unsupportedHostSingletons =\n''',
    "crypto subtle singleton capture",
)

ai = replace_once(
    ai,
    '''      workerThreads.locks,\n      navigatorLocks\n''',
    '''      workerThreads.locks,\n      navigatorLocks,\n      cryptoSubtleSingleton\n''',
    "crypto subtle singleton registry",
)

ai = replace_once(
    ai,
    '''    ["URL", "href"],\n    ["URLSearchParams", "size"],\n''',
    '''    ["URL", "href"],\n    ["URLPattern", "pathname"],\n    ["URLSearchParams", "size"],\n''',
    "URLPattern host brand getter",
)

ai = replace_once(
    ai,
    '''const asyncLocalStorageGetStore =\n  capturePrototypeMethod(\n    AsyncLocalStorage,\n    "getStore"\n  );\n\nconst messagePortHasRef =\n''',
    '''const asyncLocalStorageGetStore =\n  capturePrototypeMethod(\n    AsyncLocalStorage,\n    "getStore"\n  );\n\nfunction methodRejectsOrdinaryReceiver(\n  method\n) {\n  if (method === null) {\n    return false;\n  }\n\n  try {\n    reflectApply(\n      method,\n      {},\n      []\n    );\n\n    return false;\n  } catch {\n    return true;\n  }\n}\n\nconst asyncLocalStorageGetStoreAuthenticatesReceiver =\n  methodRejectsOrdinaryReceiver(\n    asyncLocalStorageGetStore\n  );\n\nconst messagePortHasRef =\n''',
    "version-adaptive ALS brand capability",
)

ai = replace_once(
    ai,
    '''  if (asyncLocalStorageGetStore !== null) {\n    try {\n      const store =\n        reflectApply(\n          asyncLocalStorageGetStore,\n          value,\n          []\n        );\n\n      if (store !== undefined) {\n        return true;\n      }\n    } catch {}\n  }\n''',
    '''  if (asyncLocalStorageGetStore !== null) {\n    try {\n      const store =\n        reflectApply(\n          asyncLocalStorageGetStore,\n          value,\n          []\n        );\n\n      if (\n        asyncLocalStorageGetStoreAuthenticatesReceiver ||\n        store !== undefined\n      ) {\n        return true;\n      }\n    } catch {}\n  }\n''',
    "inactive ALS brand handling",
)

ai_path.write_text(ai)


spec_path = Path("docs/M8_AI_ATTACKS_SPEC.md")
spec = spec_path.read_text()
spec = replace_once(
    spec,
    '''Generator-side mutation must not alter later attack execution.\n\n---\n\n## 19. Generator Output Shape\n''',
    '''Generator-side mutation must not alter later attack execution.\n\nM8 treats the evaluator and injected generator functions themselves as trusted local integration code. The untrusted boundary is the structured data that crosses into and out of those callbacks. Gotcha restores a bounded set of shared JavaScript intrinsic surfaces as defense in depth so temporary callback mutation cannot corrupt M8's own validation or concurrent runs, but M8 is not a general JavaScript sandbox for arbitrary irreversible host-realm sabotage. Runtime-object rejection is capability-driven across the supported Node versions: when a host API exposes a side-effect-free native brand probe or singleton identity, M8 uses it to reject live runtime state before canonicalization.\n\n---\n\n## 19. Generator Output Shape\n''',
    "document trust/restoration boundary",
)
spec_path.write_text(spec)


test_path = Path("test/m8-codex-round9.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const { AsyncLocalStorage } = require("node:async_hooks");

const { runContractAttacks } = require("../src");
const { cloneAiData } = require("../src/ai-data");

function confirmedContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved value.",
    rules: [
      {
        id: "value-rule",
        statement: "Return the approved value.",
        kind: "required",
        severity: "critical"
      }
    ]
  };
}

function attackOutput(id = "wrong-value") {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: [
      {
        id,
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput: { value: id },
        scores: {
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        }
      }
    ]
  };
}

function runOptions(overrides = {}) {
  return {
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator: () => attackOutput(),
    ...overrides
  };
}

test("overlapping runs restore the active baseline before preprocessing", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const attackOutput = ${attackOutput.toString()};
    const deferred = () => {
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      return { promise, resolve };
    };
    (async () => {
      const iteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
      const originalNext = iteratorPrototype.next;
      const started = deferred();
      const release = deferred();

      const runA = runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        async generator() {
          await Promise.resolve();
          iteratorPrototype.next = function () {
            const result = Reflect.apply(originalNext, this, []);
            if (!result.done && result.value === "version") {
              return { value: undefined, done: true };
            }
            return result;
          };
          started.resolve();
          await release.promise;
          return attackOutput("attack-a");
        }
      });

      await started.promise;

      const resultB = await runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        generator: () => attackOutput("attack-b")
      });

      if (!resultB.topFinding) {
        throw new Error("concurrent preprocessing lost B topFinding");
      }

      release.resolve();
      const resultA = await runA;

      if (!resultA.topFinding) {
        throw new Error("run A lost topFinding");
      }
      if (iteratorPrototype.next !== originalNext) {
        throw new Error("Array Iterator next was not restored");
      }
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["--unhandled-rejections=strict", "-e", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("intrinsic restoration does not depend on the mutable Array Iterator", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const attackOutput = ${attackOutput.toString()};
    (async () => {
      const iteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
      const originalNext = iteratorPrototype.next;
      const result = await runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        generator() {
          iteratorPrototype.next = () => ({ value: undefined, done: true });
          return attackOutput("iterator-attack");
        }
      });
      if (iteratorPrototype.next !== originalNext) {
        throw new Error("restoration trusted poisoned iteration");
      }
      if (!result.topFinding) {
        throw new Error("valid attack disappeared after iterator restoration");
      }
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["--unhandled-rejections=strict", "-e", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("frozen cross-realm Array and Object constructors preserve instanceof semantics", async () => {
  const arrayContext = vm.createContext({});
  const arrayExpected = vm.runInContext(
    "Object.freeze(Array); Object.freeze(Object); [1, 2]",
    arrayContext
  );
  const arrayEvaluator = vm.runInContext(
    "(output) => output instanceof Array",
    arrayContext
  );
  let arrayGeneratorCalled = false;

  const arrayResult = await runContractAttacks(runOptions({
    expectedOutput: arrayExpected,
    evaluator: arrayEvaluator,
    generator() {
      arrayGeneratorCalled = true;
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: []
      };
    }
  }));

  assert.equal(arrayGeneratorCalled, true);
  assert.equal(arrayResult.baselinePassed, true);

  const objectContext = vm.createContext({});
  const objectExpected = vm.runInContext(
    "Object.freeze(Array); Object.freeze(Object); ({ value: 1 })",
    objectContext
  );
  const objectEvaluator = vm.runInContext(
    "(output) => output instanceof Object",
    objectContext
  );
  let objectGeneratorCalled = false;

  const objectResult = await runContractAttacks(runOptions({
    expectedOutput: objectExpected,
    evaluator: objectEvaluator,
    generator() {
      objectGeneratorCalled = true;
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: []
      };
    }
  }));

  assert.equal(objectGeneratorCalled, true);
  assert.equal(objectResult.baselinePassed, true);
});

test("proxy array prototypes are rejected before getPrototypeOf traps execute", async () => {
  const expectedOutput = [1, 2];
  let trapCalls = 0;
  const prototype = new Proxy(Array.prototype, {
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("proxy prototype trap executed");
    }
  });
  Object.setPrototypeOf(expectedOutput, prototype);

  await assert.rejects(
    runContractAttacks(runOptions({ expectedOutput })),
    (error) => {
      assert.doesNotMatch(String(error && error.message), /proxy prototype trap executed/);
      return true;
    }
  );
  assert.equal(trapCalls, 0);
});

test("inactive prototype-tampered AsyncLocalStorage values fail closed", () => {
  const storage = new AsyncLocalStorage();
  const originalPrototype = Object.getPrototypeOf(storage);

  try {
    storage.foo = { bar: 1 };
    Object.setPrototypeOf(storage, Object.prototype);
    assert.throws(() => cloneAiData(storage, "storage"));
  } finally {
    Object.setPrototypeOf(storage, originalPrototype);
    Reflect.deleteProperty(storage, "foo");
  }
});

test("null-prototype expected objects keep instanceof Object false", async () => {
  const expectedOutput = Object.create(null);
  expectedOutput.value = "approved";
  let generatorCalled = false;

  const result = await runContractAttacks(runOptions({
    expectedOutput,
    evaluator: (output) => !(output instanceof Object),
    generator() {
      generatorCalled = true;
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: []
      };
    }
  }));

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("prototype-tampered crypto.subtle singleton fails closed", (t) => {
  const cryptoObject = globalThis.crypto;
  if (
    cryptoObject === undefined ||
    cryptoObject === null ||
    cryptoObject.subtle === undefined ||
    cryptoObject.subtle === null
  ) {
    t.skip("crypto.subtle is unavailable on this runtime");
    return;
  }

  const subtle = cryptoObject.subtle;
  const originalPrototype = Object.getPrototypeOf(subtle);

  try {
    subtle.foo = { bar: 1 };
    Object.setPrototypeOf(subtle, Object.prototype);
    assert.throws(
      () => cloneAiData(subtle, "subtle"),
      /unsupported runtime object/
    );
  } finally {
    Reflect.deleteProperty(subtle, "foo");
    Object.setPrototypeOf(subtle, originalPrototype);
  }
});

test("prototype-tampered URLPattern instances fail closed when supported", (t) => {
  if (typeof globalThis.URLPattern !== "function") {
    t.skip("URLPattern is unavailable on this runtime");
    return;
  }

  const pattern = new globalThis.URLPattern({ pathname: "/users/:id" });
  pattern.foo = { bar: 1 };
  Object.setPrototypeOf(pattern, Object.prototype);

  assert.throws(
    () => cloneAiData(pattern, "pattern"),
    /unsupported runtime object/
  );
});
''')

print("Round 9 patch applied")
