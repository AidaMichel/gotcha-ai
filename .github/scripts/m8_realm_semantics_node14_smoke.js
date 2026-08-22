"use strict";

const assert = require("assert").strict;
const vm = require("vm");
const { runContractAttacks } = require("../../src");

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

async function main() {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); ({ ok: true });",
    context
  );
  const evaluator = vm.runInContext(
    "(output) => output.items === undefined || (output.items instanceof Array && output.items.map((value) => value) instanceof Array)",
    context
  );
  const confirmed = contract();

  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [attack({ ok: false, items: ["changed"] })]
      };
    }
  });

  assert.equal(result.baselinePassed, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);

  const foreignArrayContext = vm.createContext({});
  const expectedArray = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); [1, 2];",
    foreignArrayContext
  );
  const arrayEvaluator = vm.runInContext(
    "(output) => output.map((value) => value) instanceof Array && output.filter(() => true) instanceof Array && output.slice() instanceof Array",
    foreignArrayContext
  );

  const baselineOnly = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: expectedArray,
    evaluator: arrayEvaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: []
      };
    }
  });

  assert.equal(baselineOnly.baselinePassed, true);
  console.log("Node 14 realm semantics smoke PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
