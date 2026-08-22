from pathlib import Path
import re

root = Path('.')
path = root / 'src/contract-attacks.js'
spec_path = root / 'docs/M8_AI_ATTACKS_SPEC.md'
test_path = root / 'test/m8-codex-round12.test.js'

text = path.read_text()

# Capture Function.prototype because safe evaluator/generator methods are local
# callable objects whose inherited surface must also be restored.
needle = '''const arrayHasInstanceSymbol =\n  Symbol.hasInstance;\n\nconst functionHasInstance =\n'''
replacement = '''const arrayHasInstanceSymbol =\n  Symbol.hasInstance;\n\nconst functionPrototype =\n  Function.prototype;\n\nconst functionHasInstance =\n'''
if needle not in text:
    raise SystemExit('Could not capture Function.prototype')
text = text.replace(needle, replacement, 1)

# Local instanceof compatibility must distinguish exact evaluator snapshot
# provenance instead of classifying every cross-realm object/array as local.
pattern = re.compile(
    r'function safeArrayHasInstance\(\n  value\n\) \{.*?\n\}\n\nfunction restoreOwnDescriptor\(',
    re.S,
)
replacement = r'''function createSafeArrayHasInstance(
  instanceState
) {
  return function safeArrayHasInstance(
    value
  ) {
    if (
      value !== null &&
      (typeof value === "object" ||
        typeof value === "function") &&
      reflectApply(
        weakSetHas,
        instanceState.snapshotNodes,
        [value]
      )
    ) {
      return reflectApply(
        weakSetHas,
        instanceState.localArrayInstances,
        [value]
      );
    }

    return reflectApply(
      functionHasInstance,
      ArrayConstructor,
      [value]
    );
  };
}

function createSafeObjectHasInstance(
  instanceState
) {
  return function safeObjectHasInstance(
    value
  ) {
    if (
      value !== null &&
      (typeof value === "object" ||
        typeof value === "function") &&
      reflectApply(
        weakSetHas,
        instanceState.snapshotNodes,
        [value]
      )
    ) {
      return reflectApply(
        weakSetHas,
        instanceState.localObjectInstances,
        [value]
      );
    }

    return reflectApply(
      functionHasInstance,
      ObjectConstructor,
      [value]
    );
  };
}

function restoreOwnDescriptor('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace local instanceof predicates')

pattern = re.compile(
    r'function captureEvaluatorInstanceSemantics\(\n  value\n\) \{.*?\n\}\n\nfunction canInstallEvaluatorInstanceSemantic\(',
    re.S,
)
replacement = r'''function captureEvaluatorInstanceSemantics(
  instanceState
) {
  const semantics = [];

  addEvaluatorInstanceSemantic(
    semantics,
    ArrayConstructor,
    createSafeArrayHasInstance(
      instanceState
    )
  );

  addEvaluatorInstanceSemantic(
    semantics,
    ObjectConstructor,
    createSafeObjectHasInstance(
      instanceState
    )
  );

  return semantics;
}

function canInstallEvaluatorInstanceSemantic('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not make evaluator semantics provenance-aware')

# Keep the native-source gate, but ensure callback-taking methods are exercised
# on a successful path. This distinguishes Array#forEach from Map#forEach and
# similar native-source collisions.
needle = '''  const argumentSets = [\n    [],\n    [undefined]\n  ];\n'''
replacement = '''  const intrinsicProbeCallback =\n    function intrinsicProbeCallback() {\n      return undefined;\n    };\n\n  const argumentSets = [\n    [],\n    [undefined],\n    [intrinsicProbeCallback],\n    [intrinsicProbeCallback, 0]\n  ];\n'''
if needle not in text:
    raise SystemExit('Could not strengthen intrinsic callable probes')
text = text.replace(needle, replacement, 1)

# Foreign prototypes are retained only as native instanceof identity sentinels.
# Ordinary property resolution is intercepted by a frozen detached shadow made
# entirely from local safe members, so foreign callable / Function.prototype
# graphs never become the normal evaluator-visible method surface.
marker = 'function buildEvaluatorPrototypePlan(\n'
if marker not in text:
    raise SystemExit('Could not locate evaluator prototype plan')
helpers = r'''function defineSafeShadowMembers(
  target,
  safePrototype
) {
  const descriptors =
    getOwnPropertyDescriptors(
      safePrototype
    );
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];

    if (hasOwn(target, key)) {
      continue;
    }

    defineProperty(
      target,
      key,
      descriptors[key]
    );
  }
}

function defineInertReferenceMembers(
  target,
  referencePrototype
) {
  const descriptors =
    getOwnPropertyDescriptors(
      referencePrototype
    );
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];

    if (hasOwn(target, key)) {
      continue;
    }

    const descriptor =
      descriptors[key];
    let value;

    if (
      "value" in descriptor &&
      (
        descriptor.value === null ||
        (
          typeof descriptor.value !== "object" &&
          typeof descriptor.value !== "function" &&
          typeof descriptor.value !== "symbol"
        )
      )
    ) {
      value = descriptor.value;
    } else {
      value = undefined;
    }

    defineProperty(
      target,
      key,
      {
        value,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );
  }
}

function buildForeignIdentityShadow(
  foreignPrototype,
  isArray
) {
  const shadow =
    objectCreate(
      foreignPrototype
    );

  if (isArray) {
    defineSafeShadowMembers(
      shadow,
      safeCallbackArrayPrototype
    );
  }

  defineSafeShadowMembers(
    shadow,
    safeCallbackObjectPrototype
  );

  if (isArray) {
    defineInertReferenceMembers(
      shadow,
      arrayPrototype
    );
  }

  defineInertReferenceMembers(
    shadow,
    objectPrototype
  );

  return objectFreeze(shadow);
}

function getForeignIdentityShadow(
  cache,
  foreignPrototype,
  isArray
) {
  const existing =
    reflectApply(
      weakMapGet,
      cache,
      [foreignPrototype]
    );

  if (existing !== undefined) {
    return existing;
  }

  const shadow =
    buildForeignIdentityShadow(
      foreignPrototype,
      isArray
    );

  reflectApply(
    weakMapSet,
    cache,
    [foreignPrototype, shadow]
  );

  return shadow;
}

'''
text = text.replace(marker, helpers + marker, 1)

pattern = re.compile(
    r'function buildEvaluatorPrototypePlan\(\n  fallback,\n  sourceRoot,\n  canonicalRoot\n\) \{.*?\n\}\n\nfunction withSafeEvaluatorInstanceSemantics\(',
    re.S,
)
replacement = r'''function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
  const byNode =
    new WeakMapConstructor();
  const identityShadows =
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

      const foreignPrototype =
        reflectApply(
          weakMapGet,
          fallback.bySource,
          [pair.source]
        );

      if (foreignPrototype !== undefined) {
        const identityShadow =
          getForeignIdentityShadow(
            identityShadows,
            foreignPrototype,
            arrayIsArray(pair.source)
          );

        reflectApply(
          weakMapSet,
          byNode,
          [
            pair.canonical,
            identityShadow
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
      safeCallbackObjectPrototype,
    arrayPrototype:
      safeCallbackArrayPrototype,
    foreignSurfaces:
      fallback.foreignSurfaces
  };
}

function withSafeEvaluatorInstanceSemantics('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace evaluator prototype plan')

# Intrinsic restoration is a graph snapshot, not a shallow holder snapshot.
# This restores mutable object-valued descriptor state (notably unscopables),
# callable own surfaces, and holder prototypes after trusted callbacks.
pattern = re.compile(
    r'function captureIntrinsicSurface\(\n  holder\n\) \{.*?\n\}\n\nfunction captureCallbackIntrinsicSurfaces\(\) \{',
    re.S,
)
replacement = r'''function captureIntrinsicSurface(
  holder,
  seen = null
) {
  const activeSeen =
    seen === null
      ? new WeakSetConstructor()
      : seen;

  if (
    holder === null ||
    (
      typeof holder !== "object" &&
      typeof holder !== "function"
    ) ||
    utilIsProxy(holder) ||
    reflectApply(
      weakSetHas,
      activeSeen,
      [holder]
    )
  ) {
    return null;
  }

  reflectApply(
    weakSetAdd,
    activeSeen,
    [holder]
  );

  const descriptors =
    getOwnPropertyDescriptors(holder);
  const nested = [];
  const keys = ownKeys(descriptors);

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];
    const descriptor =
      descriptors[key];
    const candidates = [];

    if (
      "value" in descriptor &&
      key !== "constructor" &&
      descriptor.value !== null &&
      (
        typeof descriptor.value === "object" ||
        typeof descriptor.value === "function"
      )
    ) {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.value]
      );
    }

    if (typeof descriptor.get === "function") {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.get]
      );
    }

    if (typeof descriptor.set === "function") {
      reflectApply(
        arrayPush,
        candidates,
        [descriptor.set]
      );
    }

    for (
      let candidateIndex = 0;
      candidateIndex < candidates.length;
      candidateIndex += 1
    ) {
      const nestedSurface =
        captureIntrinsicSurface(
          candidates[candidateIndex],
          activeSeen
        );

      if (nestedSurface !== null) {
        reflectApply(
          arrayPush,
          nested,
          [nestedSurface]
        );
      }
    }
  }

  return {
    holder,
    prototype:
      getPrototypeOf(holder),
    descriptors,
    nested
  };
}

function captureCallbackIntrinsicSurfaces() {'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not deepen intrinsic capture')

# Include Function.prototype itself in the coordinated local baseline.
needle = '''  return [\n    captureIntrinsicSurface(\n      objectPrototype\n    ),\n'''
replacement = '''  return [\n    captureIntrinsicSurface(\n      functionPrototype\n    ),\n    captureIntrinsicSurface(\n      objectPrototype\n    ),\n'''
if needle not in text:
    raise SystemExit('Could not add Function.prototype surface')
text = text.replace(needle, replacement, 1)

pattern = re.compile(
    r'function restoreIntrinsicSurface\(\n  surface\n\) \{.*?\n\}\n\nfunction restoreCallbackIntrinsicSurfaces\(',
    re.S,
)
replacement = r'''function restoreIntrinsicSurface(
  surface
) {
  if (surface === null) {
    return;
  }

  const holder =
    surface.holder;
  const expected =
    surface.descriptors;

  if (
    getPrototypeOf(holder) !==
      surface.prototype
  ) {
    try {
      setPrototypeOf(
        holder,
        surface.prototype
      );
    } catch {
      throw new Error(
        "Callback intrinsic surface could not be restored."
      );
    }
  }

  const current =
    getOwnPropertyDescriptors(holder);

  const currentKeys = ownKeys(current);
  for (
    let index = 0;
    index < currentKeys.length;
    index += 1
  ) {
    const key = currentKeys[index];

    if (!hasOwn(expected, key)) {
      if (!deleteProperty(holder, key)) {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
  }

  const expectedKeys = ownKeys(expected);
  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    const key = expectedKeys[index];
    const currentDescriptor =
      getOwnPropertyDescriptor(
        holder,
        key
      );
    const expectedDescriptor =
      expected[key];

    if (
      !samePropertyDescriptor(
        currentDescriptor,
        expectedDescriptor
      )
    ) {
      try {
        defineProperty(
          holder,
          key,
          expectedDescriptor
        );
      } catch {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
  }

  for (
    let index = 0;
    index < surface.nested.length;
    index += 1
  ) {
    restoreIntrinsicSurface(
      surface.nested[index]
    );
  }
}

function restoreCallbackIntrinsicSurfaces('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not deepen intrinsic restoration')

# Evaluator snapshots now return exact local-instance metadata. Foreign nodes use
# the detached identity shadow from the plan; ordinary methods never resolve to
# foreign callable objects.
pattern = re.compile(
    r'function createEvaluatorSnapshot\(\n  value,\n  prototypePlan\n\) \{.*?\n\}\n\nfunction restoreEvaluatorForeignSurfaces\(',
    re.S,
)
replacement = r'''function createEvaluatorSnapshot(
  value,
  prototypePlan
) {
  const instanceState = {
    snapshotNodes:
      new WeakSetConstructor(),
    localArrayInstances:
      new WeakSetConstructor(),
    localObjectInstances:
      new WeakSetConstructor()
  };

  const cloned =
    cloneAiData(
      value,
      "Evaluator output"
    );

  if (
    cloned === null ||
    typeof cloned !== "object"
  ) {
    return {
      output: cloned,
      instanceState
    };
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
    reflectApply(
      weakSetAdd,
      instanceState.snapshotNodes,
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
    const currentIsArray =
      arrayIsArray(current);

    if (plannedPrototype === undefined) {
      if (currentIsArray) {
        reflectApply(
          weakSetAdd,
          instanceState.localArrayInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      } else if (sourcePrototype !== null) {
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      }
    }

    setPrototypeOf(
      current,
      plannedPrototype !== undefined
        ? plannedPrototype
        : currentIsArray
          ? prototypePlan.arrayPrototype
          : sourcePrototype === null
            ? null
            : prototypePlan.objectPrototype
    );

    objectFreeze(current);
  }

  return {
    output: cloned,
    instanceState
  };
}

function restoreEvaluatorForeignSurfaces('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not add evaluator snapshot provenance')

pattern = re.compile(
    r'function createSafeEvaluator\(\n  evaluator,\n  instanceSemantics,\n  prototypePlan\n\) \{.*?\n\}\n\nfunction runPositiveControl\(',
    re.S,
)
replacement = r'''function createSafeEvaluator(
  evaluator,
  prototypePlan
) {
  return function safeEvaluator(
    output
  ) {
    const evaluatorSnapshot =
      createEvaluatorSnapshot(
        output,
        prototypePlan
      );
    const evaluatorOutput =
      evaluatorSnapshot.output;
    const instanceSemantics =
      captureEvaluatorInstanceSemantics(
        evaluatorSnapshot.instanceState
      );

    restoreEvaluatorForeignSurfaces(
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

    if (utilIsPromise(result)) {
      observeNativePromise(result);
      requirePromiseIntrinsicIntegrity();

      throw new Error(
        "Async checks are not supported by this deterministic engine."
      );
    }

    requirePromiseIntrinsicIntegrity();

    if (typeof result !== "boolean") {
      throw new Error(
        "Evaluator must return a boolean."
      );
    }

    return result;
  };
}

function runPositiveControl('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not rebuild safe evaluator')

# Instance semantics are now per evaluator snapshot, not captured broadly from
# expectedOutput before canonicalization.
needle = '''  const evaluatorInstanceSemantics =\n    captureEvaluatorInstanceSemantics(\n      expectedOutputInput\n    );\n\n'''
if needle not in text:
    raise SystemExit('Could not remove broad evaluator semantic capture')
text = text.replace(needle, '', 1)

needle = '''  const safeEvaluator =\n    createSafeEvaluator(\n      evaluator,\n      evaluatorInstanceSemantics,\n      evaluatorPrototypePlan\n    );\n'''
replacement = '''  const safeEvaluator =\n    createSafeEvaluator(\n      evaluator,\n      evaluatorPrototypePlan\n    );\n'''
if needle not in text:
    raise SystemExit('Could not update safe evaluator call')
text = text.replace(needle, replacement, 1)

path.write_text(text)

spec = spec_path.read_text()
round12 = '''\n\n## Round 12 — detached foreign behavior surfaces and exact local provenance\n\nM8 no longer exposes foreign intrinsic callable graphs as the ordinary evaluator-facing prototype surface. Cross-realm Object/Array prototype identities may remain behind a frozen detached shadow solely so native `instanceof` continues to work for hardened constructors, but all standard Object/Array property names resolve first to Gotcha-owned local safe members (or inert shadow values). Foreign method function objects and their foreign `Function.prototype` chain therefore do not become the normal structured-data behavior surface.\n\nLocal `Array` / `Object` `Symbol.hasInstance` compatibility is now exact per evaluator snapshot. M8 tracks which canonical snapshot nodes originated as local arrays/ordinary objects and returns the original positive or negative local `instanceof` result for those nodes; foreign nodes are no longer broadly classified as local merely because they are array/object shaped. Foreign positive/negative semantics continue through per-node realm identity provenance.\n\nForeign intrinsic authentication retains native-source comparison but also exercises callback-taking methods with a successful internal callback probe, closing native-source collisions such as substituting `Map.prototype.forEach` for `Array.prototype.forEach`. This is defense in depth because evaluator-visible ordinary methods come from the detached local shadow rather than the foreign callable object itself.\n\nCallback intrinsic restoration now snapshots nested mutable descriptor values and callable own surfaces in addition to holder descriptors and prototypes. Reversible in-place changes to values such as `Array.prototype[Symbol.unscopables]`, or added properties on shared intrinsic method functions, are restored across synchronous, asynchronous, nested, and overlapping callback lifetimes. `Function.prototype` is also part of the coordinated local surface baseline.\n'''
if '## Round 12 — detached foreign behavior surfaces and exact local provenance' not in spec:
    spec_path.write_text(spec.rstrip() + round12)

TEST = r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { runContractAttacks } = require("../src");

function contract() {
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
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator: emptyGenerator,
    ...overrides
  };
}

test("native forEach collisions fail foreign intrinsic authentication", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Array.prototype.forEach = Map.prototype.forEach;
    Object.freeze(Object);
    Object.freeze(Array);
    ["approved"];
  `, context);

  let evaluatorCalled = false;
  let generatorCalled = false;

  await assert.rejects(
    runContractAttacks(options({
      expectedOutput,
      evaluator() {
        evaluatorCalled = true;
        return true;
      },
      generator() {
        generatorCalled = true;
        return emptyGenerator();
      }
    })),
    /native intrinsic surfaces/
  );

  assert.equal(evaluatorCalled, false);
  assert.equal(generatorCalled, false);
});

test("foreign Function.prototype getters stay behind detached method shadows", async () => {
  const context = vm.createContext({ getterCalls: 0 });
  const expectedOutput = vm.runInContext(`
    Object.defineProperty(Function.prototype, "evil", {
      configurable: true,
      get() {
        getterCalls += 1;
        return "foreign evil";
      }
    });
    Object.freeze(Object);
    Object.freeze(Array);
    ["approved"];
  `, context);
  const ForeignArray = vm.runInContext("Array", context);

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        output instanceof ForeignArray &&
        typeof output.map === "function" &&
        output.map.evil === undefined &&
        output.map((value) => value)[0] === "approved"
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
  assert.equal(vm.runInContext("getterCalls", context), 0);
});

test("nested unscopables mutations are restored through async settlement", async () => {
  const unscopables = Array.prototype[Symbol.unscopables];
  const key = "__gotcha_round12__";
  assert.equal(Object.prototype.hasOwnProperty.call(unscopables, key), false);

  const result = await runContractAttacks(options({
    async generator() {
      await Promise.resolve();
      Object.defineProperty(unscopables, key, {
        value: true,
        writable: true,
        enumerable: true,
        configurable: true
      });
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(unscopables, key), false);
});

test("local instanceof stays false for exact foreign snapshot nodes", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext("({ value: 'approved' })", context);
  const foreignArray = vm.runInContext("['approved']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput: {
      foreignObject,
      foreignArray,
      localObject: { value: "approved" },
      localArray: ["approved"]
    },
    evaluator(output) {
      return (
        !(output.foreignObject instanceof Object) &&
        !(output.foreignArray instanceof Array) &&
        output.localObject instanceof Object &&
        output.localArray instanceof Array &&
        output.foreignObject instanceof ForeignObject &&
        output.foreignArray instanceof ForeignArray
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
});

test("shared intrinsic method own properties are restored", async () => {
  const key = "__gotcha_round12_method__";
  const map = Array.prototype.map;
  assert.equal(Object.prototype.hasOwnProperty.call(map, key), false);

  const result = await runContractAttacks(options({
    generator() {
      Object.defineProperty(map, key, {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true
      });
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(map, key), false);
});
'''

test_path.write_text(TEST)
print('Round 12 candidate patch applied')
