"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

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

function attack(mutatedOutput) {
  return {
    id: "structured-change",
    ruleId: "value-rule",
    type: "structured-change",
    description: "Changes the approved structured value.",
    rationale: "Exercises the confirmed rule.",
    mutatedOutput,
    scores: {
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.9
    }
  };
}

function options(expectedOutput, evaluator, mutatedOutput) {
  const confirmed = contract();
  return {
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [attack(mutatedOutput)]
      };
    }
  };
}

test("frozen local Array/Object constructors preserve positive control and candidate instanceof", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const script = String.raw`
    "use strict";
    const assert = require("node:assert/strict");
    const { runContractAttacks } = require("./src");

    const contract = {
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

    Object.freeze(Object);
    Object.freeze(Array);

    let generatorCalled = false;

    runContractAttacks({
      contract,
      input: { request: "approved" },
      expectedOutput: { items: ["approved"] },
      evaluator(output) {
        return (
          output instanceof Object &&
          output.items instanceof Array
        );
      },
      generator() {
        generatorCalled = true;
        return {
          version: 1,
          task: contract.task,
          attacks: [{
            id: "structured-change",
            ruleId: "value-rule",
            type: "structured-change",
            description: "Changes the approved structured value.",
            rationale: "Exercises the confirmed rule.",
            mutatedOutput: { items: ["changed"] },
            scores: {
              realism: 0.9,
              subtlety: 0.8,
              novelty: 0.7,
              fixability: 0.9
            }
          }]
        };
      }
    }).then((result) => {
      assert.equal(generatorCalled, true);
      assert.equal(result.baselinePassed, true);
      assert.equal(result.attack.survivors.length, 1);
      assert.notEqual(result.topFinding, null);
    }).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  execFileSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    stdio: "pipe"
  });
});

test("generated candidates inherit a frozen foreign array realm semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    [{ value: "approved" }];
  `, context);
  const evaluator = vm.runInContext(
    "(output) => output instanceof Array && output[0] instanceof Object",
    context
  );

  const result = await runContractAttacks(
    options(
      expectedOutput,
      evaluator,
      [{ value: "changed" }]
    )
  );

  assert.equal(result.baselinePassed, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("generated candidates inherit matching foreign object and nested array semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    ({ items: ["approved"] });
  `, context);
  const evaluator = vm.runInContext(
    "(output) => output instanceof Object && output.items instanceof Array",
    context
  );

  const result = await runContractAttacks(
    options(
      expectedOutput,
      evaluator,
      { items: ["changed"] }
    )
  );

  assert.equal(result.baselinePassed, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("README documents the public contract-attack bridge", () => {
  const readme = fs.readFileSync(
    path.resolve(__dirname, "..", "README.md"),
    "utf8"
  );

  assert.match(readme, /runContractAttacks/);
  assert.match(readme, /Attack from a confirmed Quality Contract/);
  assert.match(readme, /provider-independent AI-assisted attack generation/);
  assert.doesNotMatch(
    readme,
    /The next major bridge is to let confirmed Quality Contracts help generate and prioritize attacks\./
  );
  assert.doesNotMatch(readme, /an AI-generated mutation system/);
});
