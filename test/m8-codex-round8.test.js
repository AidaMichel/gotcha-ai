"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const workerThreads = require("node:worker_threads");

const {
  runContractAttacks
} = require("../src");

const {
  cloneAiData
} = require("../src/ai-data");

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

test("overlapping async generators restore one coordinated intrinsic baseline", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const attackOutput = (id) => ({
      version: 1,
      task: "Return the approved value.",
      attacks: [{
        id,
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput: { value: id },
        scores: { realism: 1, subtlety: 1, novelty: 1, fixability: 1 }
      }]
    });
    const deferred = () => {
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      return { promise, resolve };
    };
    (async () => {
      const originalFilter = Array.prototype.filter;
      const aStarted = deferred();
      const bStarted = deferred();
      const releaseA = deferred();
      const releaseB = deferred();

      const runA = runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        async generator() {
          Array.prototype.filter = () => [];
          aStarted.resolve();
          await releaseA.promise;
          return attackOutput("attack-a");
        }
      });

      await aStarted.promise;

      const runB = runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        async generator() {
          bStarted.resolve();
          await releaseB.promise;
          return attackOutput("attack-b");
        }
      });

      await bStarted.promise;
      releaseA.resolve();
      const resultA = await runA;
      releaseB.resolve();
      const resultB = await runB;

      if (Array.prototype.filter !== originalFilter) {
        throw new Error("Array.prototype.filter was not restored");
      }
      if (!resultA.topFinding || !resultB.topFinding) {
        throw new Error("overlap lost a top finding");
      }
      if (resultB.attack.survivors.length !== 1) {
        throw new Error("overlap lost the surviving attack");
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

test("non-configurable foreign standard Promise constructors are safely observed", () => {
  const source = String.raw`
    "use strict";
    const vm = require("node:vm");
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const context = vm.createContext({});
    const makePromise = vm.runInContext(
    '() => { const promise = Promise.reject(new Error("foreign constructor rejection")); Object.defineProperty(promise, "constructor", { value: Promise, writable: false, enumerable: false, configurable: false }); return promise; }',
    context
  );
    (async () => {
      try {
        await runContractAttacks({
          contract,
          input: { request: "approved" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator: () => makePromise()
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/foreign constructor rejection/.test(String(error && error.message))) {
          throw error;
        }
      }
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["--unhandled-rejections=strict", "-e", source],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("frozen cross-realm constructors do not abort evaluators that need no override", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(
    "Object.freeze(Array); Object.freeze(Object); [1, 2]",
    context
  );
  const evaluator = vm.runInContext(
    "(output) => Array.isArray(output)",
    context
  );
  let generatorCalled = false;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      generatorCalled = true;
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: []
      };
    }
  });

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("prototype-tampered MessagePort values fail closed", (t) => {
  if (
    typeof workerThreads.MessageChannel !== "function" ||
    typeof workerThreads.MessagePort !== "function"
  ) {
    t.skip("MessagePort is unavailable on this runtime");
    return;
  }

  const { port1, port2 } =
    new workerThreads.MessageChannel();
  const close =
    workerThreads.MessagePort.prototype.close;

  try {
    for (const key of Reflect.ownKeys(port1)) {
      if (typeof key !== "symbol") {
        continue;
      }

      const descriptor =
        Object.getOwnPropertyDescriptor(
          port1,
          key
        );

      if (
        descriptor !== undefined &&
        descriptor.configurable
      ) {
        Reflect.deleteProperty(
          port1,
          key
        );
      }
    }

    port1.foo = { bar: 1 };
    Object.setPrototypeOf(
      port1,
      Object.prototype
    );

    assert.throws(
      () => cloneAiData(port1, "port"),
      /unsupported runtime object/
    );
  } finally {
    Reflect.apply(close, port1, []);
    Reflect.apply(close, port2, []);
  }
});
