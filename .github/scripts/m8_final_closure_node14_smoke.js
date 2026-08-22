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
    id: "structured-change",
    ruleId: "value-rule",
    type: "structured-change",
    description: "Changes the approved structured value.",
    rationale: "Exercises the confirmed rule.",
    mutatedOutput: mutatedOutput,
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
    'Object.freeze(Object); Object.freeze(Array); ({ items: ["approved"] })',
    context
  );
  const evaluator = vm.runInContext(
    '(output) => output instanceof Object && output.items instanceof Array',
    context
  );
  const confirmed = contract();

  const foreignResult = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: expectedOutput,
    evaluator: evaluator,
    generator: function () {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [attack({ items: ["changed"] })]
      };
    }
  });

  assert.equal(foreignResult.baselinePassed, true);
  assert.equal(foreignResult.attack.survivors.length, 1);
  assert.notEqual(foreignResult.topFinding, null);

  Object.freeze(Object);
  Object.freeze(Array);

  const localResult = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { items: ["approved"] },
    evaluator: function (output) {
      return output instanceof Object && output.items instanceof Array;
    },
    generator: function () {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [attack({ items: ["changed"] })]
      };
    }
  });

  assert.equal(localResult.baselinePassed, true);
  assert.equal(localResult.attack.survivors.length, 1);
  assert.notEqual(localResult.topFinding, null);

  console.log("Node 14 final closure smoke PASS");
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
