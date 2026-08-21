from pathlib import Path
import re

root = Path('.')
contract_path = root / 'src/contract-attacks.js'
ai_path = root / 'src/ai-data.js'
spec_path = root / 'docs/M8_AI_ATTACKS_SPEC.md'
test_path = root / 'test/m8-codex-round10.test.js'

contract = contract_path.read_text()

fallback_pattern = re.compile(
    r'function captureEvaluatorFallbackPrototypes\(\n  value\n\) \{.*?\nfunction withSafeEvaluatorInstanceSemantics\(',
    re.S,
)

fallback_replacement = r'''function sameIntrinsicCallable(
  left,
  right
) {
  if (
    typeof left !== "function" ||
    typeof right !== "function" ||
    utilIsProxy(left) ||
    utilIsProxy(right)
  ) {
    return false;
  }

  try {
    return reflectApply(
      functionToString,
      left,
      []
    ) === reflectApply(
      functionToString,
      right,
      []
    );
  } catch {
    return false;
  }
}

function sameIntrinsicObjectValue(
  left,
  right,
  depth
) {
  if (left === right) {
    return true;
  }

  if (
    depth > 2 ||
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    utilIsProxy(left) ||
    utilIsProxy(right)
  ) {
    return false;
  }

  let leftDescriptors;
  let rightDescriptors;

  try {
    leftDescriptors =
      getOwnPropertyDescriptors(left);
    rightDescriptors =
      getOwnPropertyDescriptors(right);
  } catch {
    return false;
  }

  const leftKeys = ownKeys(leftDescriptors);
  const rightKeys = ownKeys(rightDescriptors);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (
    let index = 0;
    index < leftKeys.length;
    index += 1
  ) {
    const key = leftKeys[index];

    if (!hasOwn(rightDescriptors, key)) {
      return false;
    }

    if (
      !sameIntrinsicDescriptorShape(
        leftDescriptors[key],
        rightDescriptors[key],
        depth + 1
      )
    ) {
      return false;
    }
  }

  return true;
}

function sameIntrinsicDescriptorShape(
  left,
  right,
  depth = 0
) {
  if (
    left === undefined ||
    right === undefined ||
    left.enumerable !== right.enumerable ||
    left.configurable !== right.configurable ||
    ("writable" in left) !==
      ("writable" in right)
  ) {
    return false;
  }

  if ("writable" in left) {
    if (left.writable !== right.writable) {
      return false;
    }

    const leftValue = left.value;
    const rightValue = right.value;

    if (
      typeof leftValue === "function" ||
      typeof rightValue === "function"
    ) {
      return sameIntrinsicCallable(
        leftValue,
        rightValue
      );
    }

    if (
      leftValue !== null &&
      rightValue !== null &&
      typeof leftValue === "object" &&
      typeof rightValue === "object"
    ) {
      return sameIntrinsicObjectValue(
        leftValue,
        rightValue,
        depth
      );
    }

    return Object.is(
      leftValue,
      rightValue
    );
  }

  const leftGet = left.get;
  const rightGet = right.get;
  const leftSet = left.set;
  const rightSet = right.set;

  if (
    (leftGet === undefined) !==
      (rightGet === undefined) ||
    (leftSet === undefined) !==
      (rightSet === undefined)
  ) {
    return false;
  }

  if (
    leftGet !== undefined &&
    !sameIntrinsicCallable(
      leftGet,
      rightGet
    )
  ) {
    return false;
  }

  if (
    leftSet !== undefined &&
    !sameIntrinsicCallable(
      leftSet,
      rightSet
    )
  ) {
    return false;
  }

  return true;
}

function isPristineIntrinsicPrototype(
  candidate,
  reference
) {
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    utilIsProxy(candidate)
  ) {
    return false;
  }

  let candidateDescriptors;
  let referenceDescriptors;

  try {
    candidateDescriptors =
      getOwnPropertyDescriptors(
        candidate
      );
    referenceDescriptors =
      getOwnPropertyDescriptors(
        reference
      );
  } catch {
    return false;
  }

  const candidateKeys =
    ownKeys(candidateDescriptors);
  const referenceKeys =
    ownKeys(referenceDescriptors);

  if (
    candidateKeys.length !==
      referenceKeys.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < referenceKeys.length;
    index += 1
  ) {
    const key = referenceKeys[index];

    if (
      !hasOwn(candidateDescriptors, key) ||
      !sameIntrinsicDescriptorShape(
        candidateDescriptors[key],
        referenceDescriptors[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

function addForeignPrototypeSurface(
  fallback,
  prototype,
  reference
) {
  if (
    !isPristineIntrinsicPrototype(
      prototype,
      reference
    )
  ) {
    throw new Error(
      "Hardened cross-realm evaluator prototypes must retain native intrinsic surfaces."
    );
  }

  for (
    let index = 0;
    index < fallback.foreignSurfaces.length;
    index += 1
  ) {
    if (
      fallback.foreignSurfaces[index].holder ===
        prototype
    ) {
      return;
    }
  }

  reflectApply(
    arrayPush,
    fallback.foreignSurfaces,
    [captureIntrinsicSurface(prototype)]
  );
}

function captureEvaluatorFallbackPrototypes(
  value
) {
  const fallback = {
    bySource:
      new WeakMapConstructor(),
    arrayPrototype: null,
    objectPrototype: null,
    foreignSurfaces: []
  };

  if (
    value === null ||
    typeof value !== "object" ||
    utilIsProxy(value)
  ) {
    return fallback;
  }

  const seen =
    new WeakSetConstructor();
  const stack = [value];

  while (stack.length > 0) {
    const current =
      reflectApply(
        arrayPop,
        stack,
        []
      );

    if (
      current === null ||
      typeof current !== "object" ||
      reflectApply(
        weakSetHas,
        seen,
        [current]
      ) ||
      utilIsProxy(current)
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      seen,
      [current]
    );

    let prototype;
    let descriptors;

    try {
      prototype =
        getPrototypeOf(current);
      descriptors =
        getOwnPropertyDescriptors(
          current
        );
    } catch {
      continue;
    }

    if (
      prototype !== null &&
      utilIsProxy(prototype)
    ) {
      continue;
    }

    if (arrayIsArray(current)) {
      const arrayConstructor =
        captureNativeRealmConstructor(
          prototype,
          arrayConstructorSource
        );

      const parentPrototype =
        prototype === null
          ? null
          : getPrototypeOf(prototype);

      const objectConstructor =
        parentPrototype === null ||
        utilIsProxy(parentPrototype)
          ? null
          : captureNativeRealmConstructor(
              parentPrototype,
              objectConstructorSource
            );

      let plannedPrototype = null;

      if (
        arrayConstructor !== null &&
        arrayConstructor !== ArrayConstructor
      ) {
        const previousDescriptor =
          getOwnPropertyDescriptor(
            arrayConstructor,
            arrayHasInstanceSymbol
          );

        if (
          !canInstallEvaluatorInstanceSemantic(
            arrayConstructor,
            previousDescriptor
          )
        ) {
          addForeignPrototypeSurface(
            fallback,
            prototype,
            arrayPrototype
          );

          if (parentPrototype !== null) {
            addForeignPrototypeSurface(
              fallback,
              parentPrototype,
              objectPrototype
            );
          }

          plannedPrototype = prototype;

          if (fallback.arrayPrototype === null) {
            fallback.arrayPrototype =
              plannedPrototype;
          }
        }
      }

      if (
        objectConstructor !== null &&
        objectConstructor !== ObjectConstructor
      ) {
        const previousDescriptor =
          getOwnPropertyDescriptor(
            objectConstructor,
            arrayHasInstanceSymbol
          );

        if (
          !canInstallEvaluatorInstanceSemantic(
            objectConstructor,
            previousDescriptor
          )
        ) {
          addForeignPrototypeSurface(
            fallback,
            parentPrototype,
            objectPrototype
          );

          if (fallback.objectPrototype === null) {
            fallback.objectPrototype =
              parentPrototype;
          }

          if (plannedPrototype === null) {
            plannedPrototype =
              buildSafeCallbackPrototype(
                arrayPrototype,
                parentPrototype
              );

            if (fallback.arrayPrototype === null) {
              fallback.arrayPrototype =
                plannedPrototype;
            }
          }
        }
      }

      if (plannedPrototype !== null) {
        reflectApply(
          weakMapSet,
          fallback.bySource,
          [current, plannedPrototype]
        );
      }
    } else {
      const objectConstructor =
        captureNativeRealmConstructor(
          prototype,
          objectConstructorSource
        );

      if (
        objectConstructor !== null &&
        objectConstructor !== ObjectConstructor
      ) {
        const previousDescriptor =
          getOwnPropertyDescriptor(
            objectConstructor,
            arrayHasInstanceSymbol
          );

        if (
          !canInstallEvaluatorInstanceSemantic(
            objectConstructor,
            previousDescriptor
          )
        ) {
          addForeignPrototypeSurface(
            fallback,
            prototype,
            objectPrototype
          );

          reflectApply(
            weakMapSet,
            fallback.bySource,
            [current, prototype]
          );

          if (fallback.objectPrototype === null) {
            fallback.objectPrototype =
              prototype;
          }
        }
      }
    }

    const keys = ownKeys(descriptors);
    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const descriptor =
        descriptors[keys[index]];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      ) {
        reflectApply(
          arrayPush,
          stack,
          [descriptor.value]
        );
      }
    }
  }

  return fallback;
}

function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
  const objectPrototypeForEvaluator =
    fallback.objectPrototype === null
      ? safeCallbackObjectPrototype
      : fallback.objectPrototype;

  let arrayPrototypeForEvaluator =
    fallback.arrayPrototype;

  if (arrayPrototypeForEvaluator === null) {
    arrayPrototypeForEvaluator =
      fallback.objectPrototype === null
        ? safeCallbackArrayPrototype
        : buildSafeCallbackPrototype(
            arrayPrototype,
            fallback.objectPrototype
          );
  }

  const byNode =
    new WeakMapConstructor();

  if (
    sourceRoot !== null &&
    canonicalRoot !== null &&
    typeof sourceRoot === "object" &&
    typeof canonicalRoot === "object"
  ) {
    const seen =
      new WeakSetConstructor();
    const stack = [{
      source: sourceRoot,
      canonical: canonicalRoot
    }];

    while (stack.length > 0) {
      const pair =
        reflectApply(
          arrayPop,
          stack,
          []
        );

      if (
        pair.source === null ||
        pair.canonical === null ||
        typeof pair.source !== "object" ||
        typeof pair.canonical !== "object" ||
        reflectApply(
          weakSetHas,
          seen,
          [pair.source]
        )
      ) {
        continue;
      }

      reflectApply(
        weakSetAdd,
        seen,
        [pair.source]
      );

      const plannedPrototype =
        reflectApply(
          weakMapGet,
          fallback.bySource,
          [pair.source]
        );

      if (plannedPrototype !== undefined) {
        reflectApply(
          weakMapSet,
          byNode,
          [
            pair.canonical,
            plannedPrototype
          ]
        );
      }

      const sourceDescriptors =
        getOwnPropertyDescriptors(
          pair.source
        );
      const canonicalDescriptors =
        getOwnPropertyDescriptors(
          pair.canonical
        );
      const keys = ownKeys(sourceDescriptors);

      for (
        let index = 0;
        index < keys.length;
        index += 1
      ) {
        const key = keys[index];
        const sourceDescriptor =
          sourceDescriptors[key];
        const canonicalDescriptor =
          canonicalDescriptors[key];

        if (
          sourceDescriptor !== undefined &&
          canonicalDescriptor !== undefined &&
          "value" in sourceDescriptor &&
          "value" in canonicalDescriptor &&
          sourceDescriptor.value !== null &&
          canonicalDescriptor.value !== null &&
          typeof sourceDescriptor.value === "object" &&
          typeof canonicalDescriptor.value === "object"
        ) {
          reflectApply(
            arrayPush,
            stack,
            [{
              source:
                sourceDescriptor.value,
              canonical:
                canonicalDescriptor.value
            }]
          );
        }
      }
    }
  }

  return {
    byNode,
    objectPrototype:
      objectPrototypeForEvaluator,
    arrayPrototype:
      arrayPrototypeForEvaluator,
    foreignSurfaces:
      fallback.foreignSurfaces
  };
}

function withSafeEvaluatorInstanceSemantics('''

contract, count = fallback_pattern.subn(fallback_replacement, contract, count=1)
if count != 1:
    raise SystemExit('Could not replace evaluator fallback block')

snapshot_pattern = re.compile(
    r'function createEvaluatorSnapshot\(\n  value,\n  prototypePlan\n\) \{.*?\n\}\n\nfunction createSafeEvaluator\(',
    re.S,
)

snapshot_replacement = r'''function createEvaluatorSnapshot(
  value,
  prototypePlan
) {
  const cloned =
    cloneAiData(
      value,
      "Evaluator output"
    );

  if (
    cloned === null ||
    typeof cloned !== "object"
  ) {
    return cloned;
  }

  const seen =
    new WeakSetConstructor();

  const stack = [{
    source: value,
    target: cloned
  }];

  while (stack.length > 0) {
    const pair =
      reflectApply(
        arrayPop,
        stack,
        []
      );
    const current = pair.target;
    const source = pair.source;

    if (
      current === null ||
      source === null ||
      typeof current !== "object" ||
      typeof source !== "object" ||
      reflectApply(
        weakSetHas,
        seen,
        [current]
      )
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      seen,
      [current]
    );

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );
    const sourceDescriptors =
      getOwnPropertyDescriptors(
        source
      );
    const keys = ownKeys(descriptors);

    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const key = keys[index];
      const descriptor =
        descriptors[key];
      const sourceDescriptor =
        sourceDescriptors[key];

      if (
        descriptor !== undefined &&
        sourceDescriptor !== undefined &&
        "value" in descriptor &&
        "value" in sourceDescriptor &&
        descriptor.value !== null &&
        sourceDescriptor.value !== null &&
        typeof descriptor.value === "object" &&
        typeof sourceDescriptor.value === "object"
      ) {
        reflectApply(
          arrayPush,
          stack,
          [{
            source:
              sourceDescriptor.value,
            target:
              descriptor.value
          }]
        );
      }
    }

    const sourcePrototype =
      getPrototypeOf(source);
    const plannedPrototype =
      reflectApply(
        weakMapGet,
        prototypePlan.byNode,
        [source]
      );

    setPrototypeOf(
      current,
      plannedPrototype !== undefined
        ? plannedPrototype
        : arrayIsArray(current)
          ? prototypePlan.arrayPrototype
          : sourcePrototype === null
            ? null
            : prototypePlan.objectPrototype
    );

    objectFreeze(current);
  }

  return cloned;
}

function restoreEvaluatorForeignSurfaces(
  prototypePlan
) {
  if (
    prototypePlan.foreignSurfaces.length > 0
  ) {
    restoreCallbackIntrinsicSurfaces(
      prototypePlan.foreignSurfaces
    );
  }
}

function createSafeEvaluator('''

contract, count = snapshot_pattern.subn(snapshot_replacement, contract, count=1)
if count != 1:
    raise SystemExit('Could not replace evaluator snapshot block')

old_result = '''    const result =
      withRestoredCallbackIntrinsicSurfaces(
        () =>
          withSafeEvaluatorInstanceSemantics(
            instanceSemantics,
            () =>
              reflectApply(
                evaluator,
                undefined,
                [evaluatorOutput]
              )
          ),
        undefined,
        []
      );
'''
new_result = '''    restoreEvaluatorForeignSurfaces(
      prototypePlan
    );

    let result;

    try {
      result =
        withRestoredCallbackIntrinsicSurfaces(
          () =>
            withSafeEvaluatorInstanceSemantics(
              instanceSemantics,
              () =>
                reflectApply(
                  evaluator,
                  undefined,
                  [evaluatorOutput]
                )
            ),
          undefined,
          []
        );
    } finally {
      restoreEvaluatorForeignSurfaces(
        prototypePlan
      );
    }
'''
if old_result not in contract:
    raise SystemExit('Could not find safe evaluator result block')
contract = contract.replace(old_result, new_result, 1)

old_baseline = '''  const baselineOutput =
    snapshotAiData(
      expectedOutput,
      "Positive-control expected output"
    );
'''
new_baseline = '''  const baselineOutput =
    expectedOutput;
'''
if old_baseline not in contract:
    raise SystemExit('Could not find positive control snapshot block')
contract = contract.replace(old_baseline, new_baseline, 1)

old_run = '''  const evaluatorInstanceSemantics =
    captureEvaluatorInstanceSemantics(
      expectedOutputInput
    );

  const evaluatorFallbackPrototypes =
    captureEvaluatorFallbackPrototypes(
      expectedOutputInput
    );

  const evaluatorPrototypePlan =
    buildEvaluatorPrototypePlan(
      evaluatorFallbackPrototypes
    );

  const safeEvaluator =
    createSafeEvaluator(
      evaluator,
      evaluatorInstanceSemantics,
      evaluatorPrototypePlan
    );

  const contract =
'''
new_run = '''  const evaluatorInstanceSemantics =
    captureEvaluatorInstanceSemantics(
      expectedOutputInput
    );

  const evaluatorFallbackPrototypes =
    captureEvaluatorFallbackPrototypes(
      expectedOutputInput
    );

  const contract =
'''
if old_run not in contract:
    raise SystemExit('Could not find evaluator plan run block')
contract = contract.replace(old_run, new_run, 1)

old_expected = '''  const expectedOutput =
    snapshotAiData(
      expectedOutputInput,
      "Contract attack expectedOutput"
    );

  runPositiveControl(
    safeEvaluator,
    expectedOutput
  );
'''
new_expected = '''  const expectedOutput =
    snapshotAiData(
      expectedOutputInput,
      "Contract attack expectedOutput"
    );

  const evaluatorPrototypePlan =
    buildEvaluatorPrototypePlan(
      evaluatorFallbackPrototypes,
      expectedOutputInput,
      expectedOutput
    );

  const safeEvaluator =
    createSafeEvaluator(
      evaluator,
      evaluatorInstanceSemantics,
      evaluatorPrototypePlan
    );

  runPositiveControl(
    safeEvaluator,
    expectedOutput
  );
'''
if old_expected not in contract:
    raise SystemExit('Could not find expected output run block')
contract = contract.replace(old_expected, new_expected, 1)

contract_path.write_text(contract)

ai = ai_path.read_text()
old_import = '''const workerThreads =
  require("node:worker_threads");

const vm =
'''
new_import = '''const workerThreads =
  require("node:worker_threads");

const nodeCrypto =
  require("node:crypto");

const vm =
'''
if old_import not in ai:
    raise SystemExit('Could not find workerThreads import block')
ai = ai.replace(old_import, new_import, 1)

old_crypto = '''const cryptoSubtleSingleton =
  captureCryptoSubtleSingleton();

const unsupportedHostSingletons =
  objectFreeze(
    [
      workerThreads.locks,
      navigatorLocks,
      cryptoSubtleSingleton
    ].filter(
'''
new_crypto = '''const cryptoSubtleSingleton =
  captureCryptoSubtleSingleton();

function captureNodeCryptoSubtleSingleton() {
  try {
    const webcrypto =
      nodeCrypto.webcrypto;

    if (
      webcrypto === undefined ||
      webcrypto === null ||
      typeof webcrypto !== "object"
    ) {
      return null;
    }

    const subtle =
      webcrypto.subtle;

    return (
      subtle !== null &&
      typeof subtle === "object"
    )
      ? subtle
      : null;
  } catch {
    return null;
  }
}

const nodeCryptoSubtleSingleton =
  captureNodeCryptoSubtleSingleton();

const unsupportedHostSingletons =
  objectFreeze(
    [
      workerThreads.locks,
      navigatorLocks,
      cryptoSubtleSingleton,
      nodeCryptoSubtleSingleton
    ].filter(
'''
if old_crypto not in ai:
    raise SystemExit('Could not find crypto singleton block')
ai = ai.replace(old_crypto, new_crypto, 1)
ai_path.write_text(ai)

spec = spec_path.read_text()
old_59 = '''For asynchronous generators, that restoration boundary extends through settlement of the returned native Promise, so code after `await` cannot leave temporary built-in mutations behind before generator data is validated. Evaluator snapshots preserve ordinary local and authenticated cross-realm `instanceof Array` / `instanceof Object` behavior while keeping their exposed prototype graph detached.

This distinction keeps the boundary testable: malformed or prototype-polluted **data** must fail closed, while arbitrary hostile JavaScript execution belongs to a separate sandboxing capability outside M8.
'''
new_59 = '''For asynchronous generators, that restoration boundary extends through settlement of the returned native Promise, so code after `await` cannot leave temporary built-in mutations behind before generator data is validated. Evaluator snapshots preserve ordinary local and authenticated cross-realm `instanceof Array` / `instanceof Object` behavior. When a hardened foreign constructor prevents a temporary `Symbol.hasInstance` bridge, M8 may use that realm's native prototype identity only after authenticating its entire intrinsic surface against the current runtime and records the choice per source node. Those foreign intrinsic surfaces are restored around evaluator execution, and a modified surface (for example an added inherited getter) is rejected before the evaluator runs.

This distinction keeps the boundary testable: malformed data, executable own-property behavior, Proxy-backed data, and observable custom prototypes must fail closed. JavaScript does not expose a finite generic enumeration of every current and future engine/private host slot after an object has been deliberately re-prototyped to an ordinary intrinsic. M8 therefore defines the durable security property at the canonical snapshot boundary: only validated own data is copied to fresh targets; source object identity, private slots, host capabilities, and executable prototype behavior never cross into the generator/evaluator snapshot. Arbitrary hostile JavaScript execution belongs to a separate sandboxing capability outside M8.
'''
if old_59 not in spec:
    raise SystemExit('Could not find section 5.9 boundary text')
spec = spec.replace(old_59, new_59, 1)

old_14 = '''- custom runtime object types
- executable callbacks
- cyclic object graphs

Examples of unsupported runtime types include:
'''
new_14 = '''- observable custom runtime object types or custom prototypes
- executable callbacks
- cyclic object graphs

Recognized live runtime brands are rejected when the supported runtime exposes a side-effect-free native brand probe or stable singleton identity. That rejection is defense in depth, not an open-ended promise to enumerate every private host slot that Node or V8 may add in future releases.

If caller code deliberately changes an otherwise opaque host object's prototype to an authenticated ordinary intrinsic and leaves only AI-safe own data observable, M8 may canonicalize that **own-data projection**. The canonical target is a fresh ordinary object/array and contains none of the source object's identity, private slots, native handles, or host methods. Safety is defined by what crosses this canonical boundary, not by pretending JavaScript can generically discover every hidden runtime brand.

Examples of unsupported observable runtime types include:
'''
if old_14 not in spec:
    raise SystemExit('Could not find section 14 runtime bullet block')
spec = spec.replace(old_14, new_14, 1)

old_18 = '''M8 treats the evaluator and injected generator functions themselves as trusted local integration code. The untrusted boundary is the structured data that crosses into and out of those callbacks. Gotcha restores a bounded set of shared JavaScript intrinsic surfaces as defense in depth so temporary callback mutation cannot corrupt M8's own validation or concurrent runs, but M8 is not a general JavaScript sandbox for arbitrary irreversible host-realm sabotage. Runtime-object rejection is capability-driven across the supported Node versions: when a host API exposes a side-effect-free native brand probe or singleton identity, M8 uses it to reject live runtime state before canonicalization.
'''
new_18 = '''M8 treats the evaluator and injected generator functions themselves as trusted local integration code. The untrusted boundary is the structured data that crosses into and out of those callbacks. Gotcha restores a bounded set of shared JavaScript intrinsic surfaces as defense in depth so temporary callback mutation cannot corrupt M8's own validation or concurrent runs, but M8 is not a general JavaScript sandbox for arbitrary irreversible host-realm sabotage.

Runtime-object handling has two layers. First, capability-driven probes reject recognized live runtime state when the supported Node version exposes a side-effect-free brand probe or singleton identity. Second, the invariant that does not depend on Node's ever-growing host-class catalog is canonical capability erasure: accepted object-shaped input is rebuilt from validated own data into fresh ordinary targets before it crosses the callback boundary. A private slot that is not generically observable cannot survive that projection. New Node host families may justify additional rejection probes for diagnostics/strictness, but their mere existence does not expand M8 into an infinite runtime-brand blacklist requirement.
'''
if old_18 not in spec:
    raise SystemExit('Could not find section 18 boundary paragraph')
spec = spec.replace(old_18, new_18, 1)
spec_path.write_text(spec)

test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

const { runContractAttacks } = require("../src");
const { cloneAiData } = require("../src/ai-data");

function confirmedContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved value.",
    rules: [{
      id: "value-rule",
      statement: "Return the approved value.",
      kind: "required",
      severity: "critical"
    }]
  };
}

function emptyGenerator() {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: []
  };
}

function options(overrides = {}) {
  return {
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator: emptyGenerator,
    ...overrides
  };
}

test("hardened foreign fallback rejects modified intrinsic prototypes before evaluator execution", async () => {
  const context = vm.createContext({ getterCalls: 0 });
  const expectedOutput = vm.runInContext(`
    Object.defineProperty(Object.prototype, "danger", {
      configurable: true,
      get() {
        getterCalls += 1;
        return 42;
      }
    });
    Object.freeze(Object);
    ({ value: "approved" });
  `, context);
  const evaluator = vm.runInContext(`
    (output) => {
      void output.danger;
      return output instanceof Object;
    }
  `, context);
  let generatorCalled = false;

  await assert.rejects(
    runContractAttacks(options({
      expectedOutput,
      evaluator,
      generator() {
        generatorCalled = true;
        return emptyGenerator();
      }
    })),
    /native intrinsic surfaces/
  );

  assert.equal(generatorCalled, false);
  assert.equal(context.getterCalls, 0);
});

test("frozen fallback provenance is preserved per source realm", async () => {
  const contextA = vm.createContext({});
  const contextB = vm.createContext({});

  const root = vm.runInContext(
    "Object.freeze(Object); ({ realm: 'a' })",
    contextA
  );
  const nested = vm.runInContext(
    "Object.freeze(Object); ({ realm: 'b' })",
    contextB
  );
  root.nested = nested;

  const ObjectA = vm.runInContext("Object", contextA);
  const ObjectB = vm.runInContext("Object", contextB);

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput: root,
    evaluator(output) {
      return (
        output instanceof ObjectA &&
        output.nested instanceof ObjectB
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("foreign intrinsic surfaces are restored after trusted evaluator mutation", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(
    "Object.freeze(Object); ({ value: 'approved' })",
    context
  );
  const foreignPrototype = Object.getPrototypeOf(expectedOutput);

  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      const prototype = Object.getPrototypeOf(output);
      Object.defineProperty(prototype, "temporaryGotchaMutation", {
        configurable: true,
        value: true
      });
      return true;
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      foreignPrototype,
      "temporaryGotchaMutation"
    ),
    false
  );
});

test("node:crypto webcrypto subtle is captured even without the global crypto singleton", () => {
  const source = String.raw`
    "use strict";
    const nodeCrypto = require("node:crypto");
    const subtle = nodeCrypto.webcrypto && nodeCrypto.webcrypto.subtle;
    if (!subtle) process.exit(0);

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    if (descriptor && descriptor.configurable) {
      Reflect.deleteProperty(globalThis, "crypto");
    } else if (descriptor) {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        configurable: true,
        writable: true
      });
    }

    const { cloneAiData } = require("./src/ai-data");
    const originalPrototype = Object.getPrototypeOf(subtle);
    try {
      subtle.foo = { bar: 1 };
      Object.setPrototypeOf(subtle, Object.prototype);
      let rejected = false;
      try {
        cloneAiData(subtle, "module subtle");
      } catch (error) {
        rejected = /unsupported runtime object/.test(String(error && error.message));
      }
      if (!rejected) throw new Error("module webcrypto subtle was not rejected");
    } finally {
      Reflect.deleteProperty(subtle, "foo");
      Object.setPrototypeOf(subtle, originalPrototype);
    }
  `;

  const child = spawnSync(
    process.execPath,
    ["-e", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("opaque sqlite session capability is erased by canonical own-data projection", (t) => {
  let sqlite;
  try {
    sqlite = require("node:sqlite");
  } catch {
    t.skip("node:sqlite is unavailable on this runtime");
    return;
  }

  if (
    typeof sqlite.DatabaseSync !== "function"
  ) {
    t.skip("DatabaseSync is unavailable on this runtime");
    return;
  }

  const database = new sqlite.DatabaseSync(":memory:");
  if (typeof database.createSession !== "function") {
    database.close();
    t.skip("SQLite sessions are unavailable on this runtime");
    return;
  }

  const session = database.createSession();
  const originalPrototype = Object.getPrototypeOf(session);
  const changeset = originalPrototype && originalPrototype.changeset;

  try {
    session.foo = { bar: 1 };
    Object.setPrototypeOf(session, Object.prototype);

    const canonical = cloneAiData(session, "sqlite session projection");

    assert.deepEqual(canonical, { foo: { bar: 1 } });
    assert.equal(Object.getPrototypeOf(canonical), Object.prototype);

    if (typeof changeset === "function") {
      assert.throws(() => Reflect.apply(changeset, canonical, []));
    }
  } finally {
    Reflect.deleteProperty(session, "foo");
    Object.setPrototypeOf(session, originalPrototype);
    if (typeof session.close === "function") {
      session.close();
    }
    database.close();
  }
});
''')

print('Round 10 patch applied')
