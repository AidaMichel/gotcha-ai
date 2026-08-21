"use strict";

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
