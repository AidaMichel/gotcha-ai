from pathlib import Path

SOURCE = Path("src/contract-attacks.js")
TEST = Path("test/m8-final-borrowed-realm.test.js")

text = SOURCE.read_text()

old = '''const arrayPrototype =
  Array.prototype;

const arrayIsArray =
  Array.isArray;
'''
new = '''const arrayPrototype =
  Array.prototype;

const arrayPrototypeDescriptors =
  getOwnPropertyDescriptors(
    arrayPrototype
  );

const arrayIsArray =
  Array.isArray;
'''
if old not in text:
    raise SystemExit("array prototype capture anchor not found")
text = text.replace(old, new, 1)

old = '''function registerDerivedArrayResult(
  receiver,
  result
) {
  if (!arrayIsArray(result)) {
    return result;
  }

  const instanceState =
    activeEvaluatorInstanceState;

  if (instanceState === null) {
    return result;
  }

  const receiverPrototype =
    getPrototypeOf(receiver);

  setPrototypeOf(
    result,
    receiverPrototype
  );

  reflectApply(
    weakSetAdd,
    instanceState.snapshotNodes,
    [result]
  );

  {

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
'''
new = '''function registerDerivedArrayResult(
  resultPrototype,
  result
) {
  if (!arrayIsArray(result)) {
    return result;
  }

  const instanceState =
    activeEvaluatorInstanceState;

  if (instanceState === null) {
    return result;
  }

  setPrototypeOf(
    result,
    resultPrototype
  );

  reflectApply(
    weakSetAdd,
    instanceState.snapshotNodes,
    [result]
  );

  if (
    reflectApply(
      weakSetHas,
      instanceState.localArrayPrototypes,
      [resultPrototype]
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

  return result;
}

function buildSafeArrayResultMethod(
  method,
  resultPrototype
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
      resultPrototype,
      result
    );
  };
}
'''
if old not in text:
    raise SystemExit("derived array result block not found")
text = text.replace(old, new, 1)

old = '''function safeArrayPrototypeMethod(
  key,
  fallback
) {
'''
new = '''function safeArrayPrototypeMethod(
  key,
  fallback,
  resultPrototype
) {
'''
if old not in text:
    raise SystemExit("safeArrayPrototypeMethod signature not found")
text = text.replace(old, new, 1)

old = '''  if (arrayMethodReturnsArray(key)) {
    return buildSafeArrayResultMethod(
      fallback
    );
  }
'''
new = '''  if (arrayMethodReturnsArray(key)) {
    return buildSafeArrayResultMethod(
      fallback,
      resultPrototype
    );
  }
'''
if old not in text:
    raise SystemExit("safe array result method call not found")
text = text.replace(old, new, 1)

old = '''  const descriptors =
    getOwnPropertyDescriptors(
      sourcePrototype
    );
'''
new = '''  const descriptors =
    sourcePrototype === arrayPrototype
      ? arrayPrototypeDescriptors
      : getOwnPropertyDescriptors(
          sourcePrototype
        );
'''
if old not in text:
    raise SystemExit("safe callback descriptor capture not found")
text = text.replace(old, new, 1)

old = '''        ? safeArrayPrototypeMethod(
            key,
            descriptor.value
          )
'''
new = '''        ? safeArrayPrototypeMethod(
            key,
            descriptor.value,
            target
          )
'''
if old not in text:
    raise SystemExit("safe array prototype method construction not found")
text = text.replace(old, new, 1)

old = '''function defineSafeShadowMembers(
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
'''
new = '''function defineSafeShadowMembers(
  target,
  safePrototype,
  arrayResultPrototype
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

    let descriptor =
      descriptors[key];

    if (
      arrayResultPrototype !== undefined &&
      arrayMethodReturnsArray(key)
    ) {
      const nativeDescriptor =
        arrayPrototypeDescriptors[key];

      if (
        nativeDescriptor === undefined ||
        !("value" in nativeDescriptor) ||
        typeof nativeDescriptor.value !==
          "function"
      ) {
        throw new Error(
          "Missing captured Array result method"
        );
      }

      descriptor = {
        value:
          buildSafeArrayResultMethod(
            nativeDescriptor.value,
            arrayResultPrototype
          ),
        writable:
          descriptor.writable,
        enumerable:
          descriptor.enumerable,
        configurable:
          descriptor.configurable
      };
    }

    defineProperty(
      target,
      key,
      descriptor
    );
  }
}
'''
if old not in text:
    raise SystemExit("defineSafeShadowMembers block not found")
text = text.replace(old, new, 1)

old = '''  if (isArray) {
    defineSafeShadowMembers(
      shadow,
      safeCallbackArrayPrototype
    );
  }
'''
new = '''  if (isArray) {
    defineSafeShadowMembers(
      shadow,
      safeCallbackArrayPrototype,
      shadow
    );
  }
'''
if old not in text:
    raise SystemExit("array shadow member call not found")
text = text.replace(old, new, 1)

old = '''  const instanceState = {
    snapshotNodes:
      new WeakSetConstructor(),
    localArrayInstances:
      new WeakSetConstructor(),
    localObjectInstances:
      new WeakSetConstructor()
  };

  const cloned =
'''
new = '''  const instanceState = {
    snapshotNodes:
      new WeakSetConstructor(),
    localArrayInstances:
      new WeakSetConstructor(),
    localObjectInstances:
      new WeakSetConstructor(),
    localArrayPrototypes:
      new WeakSetConstructor()
  };

  reflectApply(
    weakSetAdd,
    instanceState.localArrayPrototypes,
    [safeCallbackArrayPrototype]
  );

  const cloned =
'''
if old not in text:
    raise SystemExit("instanceState block not found")
text = text.replace(old, new, 1)

old = '''        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      } else if (sourcePrototype !== null) {
'''
new = '''        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localArrayPrototypes,
          [
            effectivePrototype !== undefined
              ? effectivePrototype
              : prototypePlan.arrayPrototype
          ]
        );
      } else if (sourcePrototype !== null) {
'''
if old not in text:
    raise SystemExit("local array instance block not found")
text = text.replace(old, new, 1)

SOURCE.write_text(text)

TEST.write_text(r'''"use strict";

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

async function runBorrowedCase(harden) {
  const contextA = vm.createContext({});
  const contextB = vm.createContext({});
  const setup = harden
    ? "Object.freeze(Object); Object.freeze(Array);"
    : "";

  const a = vm.runInContext(
    `${setup} [1, 2]`,
    contextA
  );
  const b = vm.runInContext(
    `${setup} [3, 4]`,
    contextB
  );
  const ArrayA = vm.runInContext("Array", contextA);
  const ArrayB = vm.runInContext("Array", contextB);

  const nativeFromA =
    a.map.call(b, (value) => value);
  const nativeFromB =
    b.map.call(a, (value) => value);

  assert.equal(nativeFromA instanceof ArrayA, true);
  assert.equal(nativeFromA instanceof ArrayB, false);
  assert.equal(nativeFromB instanceof ArrayB, true);
  assert.equal(nativeFromB instanceof ArrayA, false);

  let generatorCalled = false;
  const confirmed = contract();
  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { a, b },
    evaluator(output) {
      const fromA =
        output.a.map.call(
          output.b,
          (value) => value
        );
      const fromB =
        output.b.map.call(
          output.a,
          (value) => value
        );

      return (
        fromA instanceof ArrayA &&
        !(fromA instanceof ArrayB) &&
        fromB instanceof ArrayB &&
        !(fromB instanceof ArrayA)
      );
    },
    generator() {
      generatorCalled = true;
      return {
        version: 1,
        task: confirmed.task,
        attacks: []
      };
    }
  });

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
}

test("borrowed safe array methods preserve the method realm", async () => {
  await runBorrowedCase(false);
  await runBorrowedCase(true);
});

test("borrowing local and foreign safe methods preserves the method realm", async () => {
  const context = vm.createContext({});
  const foreign = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); [1, 2]",
    context
  );
  const ForeignArray = vm.runInContext("Array", context);
  const local = [3, 4];
  const confirmed = contract();

  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { local, foreign },
    evaluator(output) {
      const localMethodResult =
        output.local.map.call(
          output.foreign,
          (value) => value
        );
      const foreignMethodResult =
        output.foreign.map.call(
          output.local,
          (value) => value
        );

      return (
        localMethodResult instanceof Array &&
        !(localMethodResult instanceof ForeignArray) &&
        foreignMethodResult instanceof ForeignArray &&
        !(foreignMethodResult instanceof Array)
      );
    },
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: []
      };
    }
  });

  assert.equal(result.baselinePassed, true);
});
''')

print("Applied final borrowed-method realm fix and regressions.")
