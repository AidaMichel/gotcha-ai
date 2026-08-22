from pathlib import Path

path = Path("src/contract-attacks.js")
text = path.read_text()

old_safe = '''function safeArrayPrototypeMethod(
  key,
  fallback
) {
  if (
    key === "values" ||
    key === Symbol.iterator
  ) {
    return safeArrayValues;
  }

  if (key === "keys") {
    return safeArrayKeys;
  }

  if (key === "entries") {
    return safeArrayEntries;
  }

  return fallback;
}
'''

new_safe = '''let activeEvaluatorInstanceState = null;

function withActiveEvaluatorInstanceState(
  instanceState,
  callback
) {
  const previous =
    activeEvaluatorInstanceState;

  activeEvaluatorInstanceState =
    instanceState;

  try {
    return callback();
  } finally {
    activeEvaluatorInstanceState =
      previous;
  }
}

function registerDerivedArrayResult(
  receiver,
  result
) {
  if (!arrayIsArray(result)) {
    return result;
  }

  const receiverPrototype =
    getPrototypeOf(receiver);

  setPrototypeOf(
    result,
    receiverPrototype
  );

  const instanceState =
    activeEvaluatorInstanceState;

  if (instanceState !== null) {
    reflectApply(
      weakSetAdd,
      instanceState.snapshotNodes,
      [result]
    );

    if (
      reflectApply(
        weakSetHas,
        instanceState.localArrayInstances,
        [receiver]
      )
    ) {
      reflectApply(
        weakSetAdd,
        instanceState.localArrayInstances,
        [result]
      );
      reflectApply(
        weakSetAdd,
        instanceState.localObjectInstances,
        [result]
      );
    }
  }

  return result;
}

function buildSafeArrayResultMethod(
  method
) {
  return function safeArrayResultMethod(
    ...args
  ) {
    const result =
      reflectApply(
        method,
        this,
        args
      );

    return registerDerivedArrayResult(
      this,
      result
    );
  };
}

function arrayMethodReturnsArray(key) {
  return (
    key === "concat" ||
    key === "filter" ||
    key === "flat" ||
    key === "flatMap" ||
    key === "map" ||
    key === "slice" ||
    key === "splice" ||
    key === "toReversed" ||
    key === "toSorted" ||
    key === "toSpliced" ||
    key === "with"
  );
}

function safeArrayPrototypeMethod(
  key,
  fallback
) {
  if (
    key === "values" ||
    key === Symbol.iterator
  ) {
    return safeArrayValues;
  }

  if (key === "keys") {
    return safeArrayKeys;
  }

  if (key === "entries") {
    return safeArrayEntries;
  }

  if (arrayMethodReturnsArray(key)) {
    return buildSafeArrayResultMethod(
      fallback
    );
  }

  return fallback;
}
'''

if old_safe not in text:
    raise SystemExit("safe array method anchor not found")
text = text.replace(old_safe, new_safe, 1)

anchor_shadow = '''function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
'''

helper = '''function deriveForeignArrayPrototype(
  fallback,
  foreignObjectPrototype
) {
  const foreignObjectConstructor =
    captureNativeRealmConstructor(
      foreignObjectPrototype,
      objectConstructorSource
    );

  if (foreignObjectConstructor === null) {
    return null;
  }

  const keysDescriptor =
    getOwnPropertyDescriptor(
      foreignObjectConstructor,
      "keys"
    );

  if (
    keysDescriptor === undefined ||
    "get" in keysDescriptor ||
    "set" in keysDescriptor ||
    typeof keysDescriptor.value !== "function" ||
    utilIsProxy(keysDescriptor.value) ||
    !sameIntrinsicCallable(
      keysDescriptor.value,
      objectKeys
    )
  ) {
    return null;
  }

  let sampleArray;

  try {
    sampleArray =
      reflectApply(
        keysDescriptor.value,
        foreignObjectConstructor,
        [objectCreate(null)]
      );
  } catch {
    return null;
  }

  if (!arrayIsArray(sampleArray)) {
    return null;
  }

  const foreignArrayPrototype =
    getPrototypeOf(sampleArray);

  if (
    foreignArrayPrototype === null ||
    utilIsProxy(foreignArrayPrototype) ||
    getPrototypeOf(foreignArrayPrototype) !==
      foreignObjectPrototype ||
    captureNativeRealmConstructor(
      foreignArrayPrototype,
      arrayConstructorSource
    ) === null
  ) {
    return null;
  }

  addForeignPrototypeSurface(
    fallback,
    foreignArrayPrototype,
    arrayPrototype
  );

  return foreignArrayPrototype;
}

'''

if anchor_shadow not in text:
    raise SystemExit("prototype plan anchor not found")
text = text.replace(anchor_shadow, helper + anchor_shadow, 1)

old_object_root = '''          } else {
            candidateForeignObjectPrototype =
              foreignPrototype;
            candidateObjectPrototype =
              identityShadow;
            candidateObjectIsLocal = false;
          }
'''

new_object_root = '''          } else {
            candidateForeignObjectPrototype =
              foreignPrototype;
            candidateObjectPrototype =
              identityShadow;
            candidateObjectIsLocal = false;

            const siblingForeignArrayPrototype =
              deriveForeignArrayPrototype(
                fallback,
                foreignPrototype
              );

            if (
              siblingForeignArrayPrototype !== null
            ) {
              candidateArrayPrototype =
                getForeignIdentityShadow(
                  identityShadows,
                  siblingForeignArrayPrototype,
                  true
                );
              candidateArrayIsLocal = false;
            }
          }
'''

if old_object_root not in text:
    raise SystemExit("foreign object root anchor not found")
text = text.replace(old_object_root, new_object_root, 1)

old_eval = '''            withSafeEvaluatorInstanceSemantics(
              instanceSemantics,
              () =>
                reflectApply(
                  evaluator,
                  undefined,
                  [evaluatorOutput]
                )
            ),
'''

new_eval = '''            withSafeEvaluatorInstanceSemantics(
              instanceSemantics,
              () =>
                withActiveEvaluatorInstanceState(
                  evaluatorSnapshot.instanceState,
                  () =>
                    reflectApply(
                      evaluator,
                      undefined,
                      [evaluatorOutput]
                    )
                )
            ),
'''

if old_eval not in text:
    raise SystemExit("evaluator state anchor not found")
text = text.replace(old_eval, new_eval, 1)

path.write_text(text)

Path("test/m8-final-realm-closure.test.js").write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { runContractAttacks } = require("../src");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved structured value.",
    rules: [{
      id: "value-rule",
      statement: "Return the approved structured value.",
      kind: "required",
      severity: "critical"
    }]
  };
}

function generatedAttack(mutatedOutput) {
  return {
    id: "realm-change",
    ruleId: "value-rule",
    type: "realm-change",
    description: "Changes the approved structured value.",
    rationale: "Exercises evaluator realm semantics.",
    mutatedOutput,
    scores: {
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.9
    }
  };
}

async function runCase(expectedOutput, evaluator, mutatedOutput) {
  const confirmed = contract();
  return runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: mutatedOutput === undefined
          ? []
          : [generatedAttack(mutatedOutput)]
      };
    }
  });
}

function makeForeignObjectCase(harden) {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    ${harden ? "Object.freeze(Object); Object.freeze(Array);" : ""}
    ({ ok: true });
  `, context);
  const evaluator = vm.runInContext(`
    (output) => (
      output.items === undefined ||
      (
        output.items instanceof Array &&
        output.items.map((value) => value) instanceof Array
      )
    )
  `, context);
  return { expectedOutput, evaluator };
}

test("generated arrays inherit a foreign object root realm without an expected array sample", async () => {
  for (const harden of [false, true]) {
    const { expectedOutput, evaluator } =
      makeForeignObjectCase(harden);
    const result = await runCase(
      expectedOutput,
      evaluator,
      { ok: false, items: ["changed"] }
    );

    assert.equal(result.baselinePassed, true);
    assert.equal(result.attack.survivors.length, 1);
    assert.notEqual(result.topFinding, null);
  }
});

test("foreign array-producing safe methods preserve evaluator realm semantics", async () => {
  for (const harden of [false, true]) {
    const context = vm.createContext({});
    const expectedOutput = vm.runInContext(`
      ${harden ? "Object.freeze(Object); Object.freeze(Array);" : ""}
      [1, 2];
    `, context);
    const evaluator = vm.runInContext(`
      (output) => {
        const arrays = [
          output.map((value) => value),
          output.filter(() => true),
          output.slice(),
          output.concat([]),
          output.flat(),
          output.flatMap((value) => [value])
        ];
        return arrays.every((value) => value instanceof Array);
      }
    `, context);

    const result = await runCase(
      expectedOutput,
      evaluator,
      undefined
    );

    assert.equal(result.baselinePassed, true);
  }
});

test("local array-producing safe methods preserve local instanceof semantics", async () => {
  const evaluator = (output) => {
    const arrays = [
      output.map((value) => value),
      output.filter(() => true),
      output.slice(),
      output.concat([]),
      output.flat(),
      output.flatMap((value) => [value])
    ];
    return arrays.every((value) => value instanceof Array);
  };

  const result = await runCase(
    [1, 2],
    evaluator,
    undefined
  );

  assert.equal(result.baselinePassed, true);
});

test("derived foreign arrays remain negative for the local Array constructor", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    [1, 2];
  `, context);
  const ForeignArray = vm.runInContext("Array", context);

  const result = await runCase(
    expectedOutput,
    (output) => {
      const mapped = output.map((value) => value);
      return (
        mapped instanceof ForeignArray &&
        !(mapped instanceof Array)
      );
    },
    undefined
  );

  assert.equal(result.baselinePassed, true);
});
''')

print("M8 realm semantics patch prepared.")
