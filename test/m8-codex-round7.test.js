"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

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

function attackOutput(mutatedOutput = { value: "wrong" }) {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: [
      {
        id: "wrong-value",
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput,
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

test("async generator intrinsic mutations are restored after settlement", async () => {
  const originalFilter = Array.prototype.filter;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    async generator() {
      await Promise.resolve();
      Array.prototype.filter = () => [];
      return attackOutput();
    }
  });

  assert.equal(Array.prototype.filter, originalFilter);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("non-configurable undefined Promise constructors are safely observed", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    (async () => {
      try {
        await runContractAttacks({
          contract,
          input: { request: "approved" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator() {
            const promise = Promise.reject(new Error("undefined constructor rejection"));
            Object.defineProperty(promise, "constructor", {
              value: undefined,
              writable: false,
              enumerable: false,
              configurable: false
            });
            return promise;
          }
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/undefined constructor rejection/.test(String(error && error.message))) {
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

function sharedDag(depth, leafValue) {
  let node = { value: leafValue };

  for (let index = 0; index < depth; index += 1) {
    node = { left: node, right: node };
  }

  return node;
}

test("iterative equality memoizes shared object pairs", { timeout: 3000 }, async () => {
  const expectedOutput = sharedDag(24, "same");
  const mutatedOutput = sharedDag(24, "same");
  const startedAt = Date.now();

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator: () => true,
    generator: () => attackOutput(mutatedOutput)
  });

  assert.equal(result.generatedAttacks.length, 0);
  assert.equal(result.discardedAttacks[0].reason, "unchanged-output");
  assert.ok(Date.now() - startedAt < 2500);
});

test("generator arguments retain detached standard array methods", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: ["approved"],
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator({ contract, input }) {
      const ruleIds = contract.rules.map((rule) => rule.id);
      const copiedInput = input.map((value) => value);
      assert.deepEqual(ruleIds, ["value-rule"]);
      assert.deepEqual(copiedInput, ["approved"]);
      return attackOutput();
    }
  });

  assert.equal(result.generatedAttacks.length, 1);
});

test("cross-realm evaluators preserve ordinary instanceof Array semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext("[1, 2]", context);
  const evaluator = vm.runInContext("(output) => output instanceof Array", context);
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

test("prototype-tampered WebAssembly.Tag values fail closed", (t) => {
  if (typeof WebAssembly.Tag !== "function") {
    t.skip("WebAssembly.Tag is unavailable on this runtime");
    return;
  }

  const tag = new WebAssembly.Tag({ parameters: ["i32"] });
  tag.foo = { bar: 1 };
  Object.setPrototypeOf(tag, Object.prototype);

  assert.throws(
    () => cloneAiData(tag, "tag"),
    /unsupported runtime object/
  );
});

test("prototype-tampered WebAssembly.Exception values fail closed", (t) => {
  if (
    typeof WebAssembly.Tag !== "function" ||
    typeof WebAssembly.Exception !== "function"
  ) {
    t.skip("WebAssembly.Exception is unavailable on this runtime");
    return;
  }

  const tag = new WebAssembly.Tag({ parameters: [] });
  const exception = new WebAssembly.Exception(tag, []);
  exception.foo = { bar: 1 };
  Object.setPrototypeOf(exception, Object.prototype);

  assert.throws(
    () => cloneAiData(exception, "exception"),
    /unsupported runtime object/
  );
});

test("shared array iterator prototypes are restored after evaluators", async () => {
  const iteratorPrototype =
    Object.getPrototypeOf([][Symbol.iterator]());
  const originalNext = iteratorPrototype.next;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: [],
    expectedOutput: [],
    evaluator(output) {
      const iterator = output.values();
      Object.getPrototypeOf(iterator).next = () => ({ done: true });
      return true;
    },
    generator: () => ({
      version: 1,
      task: "Return the approved value.",
      attacks: []
    })
  });

  assert.equal(iteratorPrototype.next, originalNext);
  assert.equal(result.baselinePassed, true);
});
