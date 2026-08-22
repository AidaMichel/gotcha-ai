"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { AsyncLocalStorage } = require("node:async_hooks");

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

function attackOutput(overrides = {}) {
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
        mutatedOutput: { value: "wrong" },
        scores: {
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        },
        ...overrides
      }
    ]
  };
}

test("generator Map.prototype tampering cannot forge rule attribution", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Map.prototype.get = function forgedGet() {
          return confirmedContract().rules[0];
        };
        return attackOutput({ ruleId: "invented" });
      }
    }),
    /unknown Quality Contract rule id/
  );
});

test("non-configurable safe Promise constructors remain observable", () => {
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
            const promise = Promise.reject(new Error("safe constructor rejection"));
            Object.defineProperty(promise, "constructor", {
              value: Promise,
              writable: false,
              enumerable: false,
              configurable: false
            });
            return promise;
          }
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/safe constructor rejection/.test(String(error && error.message))) {
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

test("evaluator-facing plain objects preserve instanceof Object", async () => {
  let generatorCalled = false;
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: (output) => output instanceof Object,
    generator() {
      generatorCalled = true;
      return attackOutput();
    }
  });
  assert.equal(generatorCalled, true);
  assert.equal(result.generatedAttacks.length, 1);
});

test("normalized scores ignore Object.prototype setters", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator() {
      Object.defineProperty(Object.prototype, "realism", {
        get() { return 999; },
        set() {},
        configurable: true
      });
      return attackOutput();
    }
  });
  assert.equal(result.generatedAttacks[0].realism, 1);
  assert.ok(result.attack.survivors[0].rankScore <= 1);
});

test("active AsyncLocalStorage objects fail the AI-data boundary", () => {
  const storage = new AsyncLocalStorage();
  storage.run({ secret: true }, () => {
    const originalPrototype = Object.getPrototypeOf(storage);
    try {
      Object.setPrototypeOf(storage, Object.prototype);
      storage.foo = "bar";
      assert.throws(
        () => cloneAiData(storage, "storage"),
        /unsupported runtime object/
      );
    } finally {
      Object.setPrototypeOf(storage, originalPrototype);
    }
  });
});

test("nested contract attacks preserve outer Array instanceof semantics", async () => {
  let nested = null;
  let nestedStarted = false;
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: [],
    expectedOutput: [],
    evaluator(output) {
      if (!nestedStarted) {
        nestedStarted = true;
        nested = runContractAttacks({
          contract: confirmedContract(),
          input: { request: "nested" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator: () => ({
            version: 1,
            task: "Return the approved value.",
            attacks: []
          })
        });
      }
      return output instanceof Array;
    },
    generator: () => ({
      version: 1,
      task: "Return the approved value.",
      attacks: []
    })
  });
  await nested;
  assert.equal(result.baselinePassed, true);
});

test("String.trim tampering cannot admit empty metadata", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        String.prototype.trim = () => "forged";
        return attackOutput({
          id: "",
          type: "",
          description: "",
          rationale: ""
        });
      }
    }),
    /non-empty string/
  );
});

test("confirmed contracts require own top-level fields", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    Object.prototype.version = 1;
    Object.prototype.status = "confirmed";
    Object.prototype.task = "Return the approved value.";
    Object.prototype.rules = ${JSON.stringify(confirmedContract().rules)};
    runContractAttacks({
      contract: {},
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator: () => ({ version: 1, task: "Return the approved value.", attacks: [] })
    }).then(
      () => { throw new Error("inherited contract accepted"); },
      (error) => {
        if (!/own data property/.test(String(error && error.message))) throw error;
      }
    ).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  const child = spawnSync(process.execPath, ["-e", source], {
    cwd: process.cwd(), encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("confirmed contract rules require own fields", async () => {
  const contract = confirmedContract();
  const inheritedRule = Object.create(contract.rules[0]);
  contract.rules = [inheritedRule];
  await assert.rejects(
    runContractAttacks({
      contract,
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator: () => ({ version: 1, task: contract.task, attacks: [] })
    }),
    /(own data property|plain object)/
  );
});

test("Set prototype tampering cannot bypass duplicate attack IDs", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Set.prototype.has = () => false;
        Set.prototype.add = function noAdd() { return this; };
        const first = attackOutput().attacks[0];
        return {
          version: 1,
          task: "Return the approved value.",
          attacks: [first, { ...first }]
        };
      }
    }),
    /Duplicate generated attack id/
  );
});

test("Number.isFinite tampering cannot admit invalid scores", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Number.isFinite = () => true;
        const output = attackOutput();
        output.attacks[0].scores.realism = Infinity;
        return output;
      }
    }),
    /finite number/
  );
});

test("evaluator prototype tampering cannot corrupt engine aggregation", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator(output) {
      Array.prototype.filter = () => [];
      return true;
    },
    generator: () => attackOutput()
  });
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});
