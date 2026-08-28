"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection
} = require("../src");

async function makeDraft() {
  const contract = {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [{
      id: "time-rule",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    }]
  };

  const result = await runContractAttacks({
    contract,
    input: { request: "Schedule the meeting." },
    expectedOutput: { time: "3 PM" },
    evaluator() { return true; },
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: [{
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the approved time.",
          rationale: "Violates the confirmed rule.",
          mutatedOutput: { time: "4 PM" },
          scores: {
            realism: 0.9,
            subtlety: 0.8,
            novelty: 0.7,
            fixability: 0.9
          }
        }]
      };
    }
  });

  return draftContractProtection({
    experiment: result.experiment,
    sourceAttackId: "wrong-time",
    proposal: {
      version: 1,
      task: contract.task,
      sourceAttackId: "wrong-time",
      ruleId: "time-rule",
      protection: {
        statement: "Reject outputs whose time is not exactly 3 PM.",
        rationale: "The surviving attack changed the approved time."
      }
    }
  });
}

test("accept confirms the draft without changing protection text", async () => {
  const draft = await makeDraft();
  const confirmed = await confirmContractProtection({
    draft,
    decision: { type: "accept" }
  });

  assert.equal(confirmed.status, "confirmed");
  assert.equal(confirmed.protection.statement, draft.protection.statement);
  assert.equal(confirmed.protection.rationale, draft.protection.rationale);
  assert.notEqual(confirmed, draft);
  assert.notEqual(confirmed.experiment, draft.experiment);
  assert.notEqual(confirmed.rule, draft.rule);
  assert.notEqual(confirmed.protection, draft.protection);
});

test("edit confirms and changes only protection.statement", async () => {
  const draft = await makeDraft();
  const edited = await confirmContractProtection({
    draft,
    decision: {
      type: "edit",
      statement: "Require the returned time to equal 3 PM exactly."
    }
  });

  assert.equal(edited.status, "confirmed");
  assert.equal(
    edited.protection.statement,
    "Require the returned time to equal 3 PM exactly."
  );
  assert.equal(edited.protection.rationale, draft.protection.rationale);
  assert.deepEqual(edited.source, draft.source);
  assert.deepEqual(edited.rule, draft.rule);
  assert.deepEqual(edited.experiment, draft.experiment);
});

test("reject returns a rejected protection artifact", async () => {
  const draft = await makeDraft();
  const rejected = await confirmContractProtection({
    draft,
    decision: { type: "reject" }
  });

  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.protection.statement, draft.protection.statement);
  assert.equal(rejected.protection.rationale, draft.protection.rationale);
});

test("confirmation accepts only draft status", async () => {
  const draft = await makeDraft();
  const confirmed = await confirmContractProtection({
    draft,
    decision: { type: "accept" }
  });

  await assert.rejects(
    confirmContractProtection({
      draft: confirmed,
      decision: { type: "accept" }
    }),
    TypeError
  );
});

test("decision schema is exact and edit statement must be non-empty", async () => {
  const draft = await makeDraft();

  await assert.rejects(
    confirmContractProtection({
      draft,
      decision: { type: "accept", statement: "extra" }
    }),
    TypeError
  );

  await assert.rejects(
    confirmContractProtection({
      draft,
      decision: { type: "edit", statement: "   " }
    }),
    TypeError
  );

  await assert.rejects(
    confirmContractProtection({
      draft,
      decision: { type: "unknown" }
    }),
    TypeError
  );
});

test("confirmation captures decision authority synchronously", async () => {
  const draft = await makeDraft();
  const decision = {
    type: "edit",
    statement: "Original approved edit."
  };

  const promise = confirmContractProtection({ draft, decision });
  decision.statement = "Mutated after invocation.";

  const confirmed = await promise;
  assert.equal(confirmed.protection.statement, "Original approved edit.");
});

test("malformed confirm option surface rejects asynchronously", async () => {
  const draft = await makeDraft();
  let returned = false;
  const promise = confirmContractProtection({
    draft,
    decision: { type: "accept" },
    extra: true
  });
  returned = true;

  await assert.rejects(
    promise,
    (error) => returned === true && error instanceof TypeError
  );
});
