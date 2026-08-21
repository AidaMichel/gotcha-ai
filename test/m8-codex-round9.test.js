"use strict";

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
