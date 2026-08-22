from pathlib import Path
import re

root = Path('.')
path = root / 'src/contract-attacks.js'
spec_path = root / 'docs/M8_AI_ATTACKS_SPEC.md'
test_path = root / 'test/m8-codex-round11.test.js'

text = path.read_text()

# 1) Promise.prototype.then is part of the captured integrity contract.
needle = '''const promiseThen =\n  Promise.prototype.then;\n\nconst promiseSpecies =\n'''
replacement = '''const promiseThen =\n  Promise.prototype.then;\n\nconst promiseThenDescriptor =\n  getOwnPropertyDescriptor(\n    promisePrototype,\n    "then"\n  );\n\nconst promiseSpecies =\n'''
if needle not in text:
    raise SystemExit('Could not add promiseThenDescriptor')
text = text.replace(needle, replacement, 1)

# 2) Foreign constructors no longer receive broad hasInstance predicates. Exact
# per-node prototype provenance supplies foreign instanceof semantics naturally.
pattern = re.compile(
    r'function captureEvaluatorInstanceSemantics\(\n  value\n\) \{.*?\n\}\n\nfunction canInstallEvaluatorInstanceSemantic\(',
    re.S,
)
replacement = '''function captureEvaluatorInstanceSemantics(\n  value\n) {\n  const semantics = [];\n\n  addEvaluatorInstanceSemantic(\n    semantics,\n    ArrayConstructor,\n    safeArrayHasInstance\n  );\n\n  addEvaluatorInstanceSemantic(\n    semantics,\n    ObjectConstructor,\n    safeObjectHasInstance\n  );\n\n  return semantics;\n}\n\nfunction canInstallEvaluatorInstanceSemantic('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace evaluator instance semantics')

# 3) Strengthen cross-realm native callable authentication. Source text stays a
# first gate, but same-named native collisions must also have compatible native
# behavior on controlled fresh receivers. No caller/model data is invoked.
pattern = re.compile(
    r'function sameIntrinsicCallable\(\n  left,\n  right\n\) \{.*?\n\}\n\nfunction sameIntrinsicObjectValue\(',
    re.S,
)
replacement = r'''function probeIntrinsicCallable(
  callable,
  receiver,
  args
) {
  try {
    const value =
      reflectApply(
        callable,
        receiver,
        args
      );

    if (value === null) {
      return {
        threw: false,
        kind: "null",
        value: null
      };
    }

    const type = typeof value;

    if (type === "object") {
      return {
        threw: false,
        kind:
          arrayIsArray(value)
            ? "array"
            : "object"
      };
    }

    if (type === "function") {
      return {
        threw: false,
        kind: "function"
      };
    }

    return {
      threw: false,
      kind: type,
      value
    };
  } catch {
    return {
      threw: true,
      kind: "throw"
    };
  }
}

function sameIntrinsicProbeOutcome(
  left,
  right
) {
  if (
    left.threw !== right.threw ||
    left.kind !== right.kind
  ) {
    return false;
  }

  if (left.threw) {
    return true;
  }

  if (
    left.kind === "object" ||
    left.kind === "array" ||
    left.kind === "function" ||
    left.kind === "null"
  ) {
    return true;
  }

  return objectIs(
    left.value,
    right.value
  );
}

function sameIntrinsicCallableProbe(
  left,
  right,
  receiverFactory,
  args
) {
  const leftOutcome =
    probeIntrinsicCallable(
      left,
      receiverFactory(),
      args
    );
  const rightOutcome =
    probeIntrinsicCallable(
      right,
      receiverFactory(),
      args
    );

  return sameIntrinsicProbeOutcome(
    leftOutcome,
    rightOutcome
  );
}

function sameIntrinsicCallable(
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

  let sameSource = false;

  try {
    sameSource =
      reflectApply(
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

  if (!sameSource) {
    return false;
  }

  const receiverFactories = [
    () => objectCreate(null),
    () => objectCreate(objectPrototype),
    () => reflectConstruct(
      ArrayConstructor,
      []
    ),
    () => function intrinsicProbeFunction() {}
  ];

  const argumentSets = [
    [],
    [undefined]
  ];

  for (
    let receiverIndex = 0;
    receiverIndex < receiverFactories.length;
    receiverIndex += 1
  ) {
    for (
      let argsIndex = 0;
      argsIndex < argumentSets.length;
      argsIndex += 1
    ) {
      if (
        !sameIntrinsicCallableProbe(
          left,
          right,
          receiverFactories[receiverIndex],
          argumentSets[argsIndex]
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function sameIntrinsicObjectValue('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace intrinsic callable authentication')

# 4) Unify foreign realm handling. Every authenticated foreign Object/Array node
# gets an exact per-source prototype plan; no foreign constructor override and no
# graph-wide foreign default remain.
pattern = re.compile(
    r'function captureEvaluatorFallbackPrototypes\(\n  value\n\) \{.*?\n\}\n\nfunction buildEvaluatorPrototypePlan\(',
    re.S,
)
replacement = r'''function captureEvaluatorFallbackPrototypes(
  value
) {
  const fallback = {
    bySource:
      new WeakMapConstructor(),
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

      if (
        arrayConstructor !== null &&
        arrayConstructor !== ArrayConstructor
      ) {
        addForeignPrototypeSurface(
          fallback,
          prototype,
          arrayPrototype
        );

        if (
          objectConstructor !== null &&
          objectConstructor !== ObjectConstructor
        ) {
          addForeignPrototypeSurface(
            fallback,
            parentPrototype,
            objectPrototype
          );
        }

        reflectApply(
          weakMapSet,
          fallback.bySource,
          [current, prototype]
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

function buildEvaluatorPrototypePlan('''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('Could not replace foreign prototype capture')

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

# 5) Promise.prototype joins the coordinated callback surfaces.
needle = '''    captureIntrinsicSurface(\n      sharedIteratorPrototype\n    ),\n    captureIntrinsicSurface(\n      NumberConstructor\n    )\n'''
replacement = '''    captureIntrinsicSurface(\n      sharedIteratorPrototype\n    ),\n    captureIntrinsicSurface(\n      promisePrototype\n    ),\n    captureIntrinsicSurface(\n      NumberConstructor\n    )\n'''
if needle not in text:
    raise SystemExit('Could not add Promise.prototype callback surface')
text = text.replace(needle, replacement, 1)

# 6) Integrity check includes Promise.prototype.then, not only constructor/species.
needle = '''  const currentSpecies =\n    getOwnPropertyDescriptor(\n      promiseConstructor,\n      promiseSpecies\n    );\n\n  if (\n    !samePropertyDescriptor(\n      currentPrototypeConstructor,\n      promisePrototypeConstructorDescriptor\n    ) ||\n    !samePropertyDescriptor(\n      currentSpecies,\n      promiseSpeciesDescriptor\n    )\n  ) {\n'''
replacement = '''  const currentThen =\n    getOwnPropertyDescriptor(\n      promisePrototype,\n      "then"\n    );\n\n  const currentSpecies =\n    getOwnPropertyDescriptor(\n      promiseConstructor,\n      promiseSpecies\n    );\n\n  if (\n    !samePropertyDescriptor(\n      currentPrototypeConstructor,\n      promisePrototypeConstructorDescriptor\n    ) ||\n    !samePropertyDescriptor(\n      currentThen,\n      promiseThenDescriptor\n    ) ||\n    !samePropertyDescriptor(\n      currentSpecies,\n      promiseSpeciesDescriptor\n    )\n  ) {\n'''
if needle not in text:
    raise SystemExit('Could not extend Promise integrity check')
text = text.replace(needle, replacement, 1)

path.write_text(text)

spec = spec_path.read_text()
round11 = '''\n\n## Round 11 — exact realm provenance and Promise surface restoration\n\nM8 preserves cross-realm evaluator semantics without installing broad foreign `Symbol.hasInstance` predicates. Local evaluator snapshots retain detached local safe prototypes. Each accepted foreign Object/Array source node is mapped independently to its authenticated realm intrinsic prototype, so both positive and negative `instanceof` results are preserved in mixed local/foreign graphs and no graph-wide foreign prototype default is applied.\n\nForeign intrinsic prototype authentication uses native source matching plus controlled native-behavior probes on fresh internal receivers. This closes same-named native-function substitution collisions while avoiding execution of caller/model data. Authenticated foreign prototype surfaces are still restored around trusted evaluator execution.\n\n`Promise.prototype` is part of the coordinated callback intrinsic surface. Its captured `then` descriptor participates in Promise integrity checks, and reversible synchronous or post-`await` callback mutations are restored before later M8/integration code observes them.\n'''
if '## Round 11 — exact realm provenance and Promise surface restoration' not in spec:
    spec_path.write_text(spec.rstrip() + round11)

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

test("mutable foreign instanceof preserves negative and positive per-node provenance", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext("({ realm: 'foreign' })", context);
  const foreignArray = vm.runInContext("['foreign']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  const expectedOutput = {
    local: { realm: "local" },
    foreign: foreignObject,
    localArray: ["local"],
    foreignArray
  };

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        !(output instanceof ForeignObject) &&
        !(output.local instanceof ForeignObject) &&
        output.foreign instanceof ForeignObject &&
        !(output.localArray instanceof ForeignArray) &&
        output.foreignArray instanceof ForeignArray
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

test("frozen foreign prototypes apply only to mapped foreign nodes", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); ({ realm: 'foreign' })",
    context
  );
  const foreignArray = vm.runInContext("['foreign']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  const expectedOutput = {
    foreign: foreignObject,
    localArray: ["local"],
    foreignArray
  };

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        !(output instanceof ForeignObject) &&
        output.foreign instanceof ForeignObject &&
        !(output.localArray instanceof ForeignArray) &&
        output.foreignArray instanceof ForeignArray
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

test("same-named native substitution cannot authenticate a foreign intrinsic surface", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.prototype.toString = Function.prototype.toString;
    Object.freeze(Object);
    ({ value: "approved" });
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

test("Promise.prototype.then is restored after synchronous generator mutation", async () => {
  const originalThen = Promise.prototype.then;

  const result = await runContractAttacks(options({
    generator() {
      Promise.prototype.then = function brokenThen() {
        throw new Error("broken then leaked");
      };
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Promise.prototype.then, originalThen);
  assert.equal(await Promise.resolve(7).then((value) => value), 7);
});

test("Promise.prototype.then is restored after async post-await generator mutation", async () => {
  const originalThen = Promise.prototype.then;

  const result = await runContractAttacks(options({
    async generator() {
      await Promise.resolve();
      Promise.prototype.then = function brokenThen() {
        throw new Error("broken async then leaked");
      };
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Promise.prototype.then, originalThen);
  assert.equal(await Promise.resolve(9).then((value) => value), 9);
});
'''

test_path.write_text(TEST)

print('Round 11 candidate applied')
