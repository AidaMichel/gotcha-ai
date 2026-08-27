"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks,
  draftContractProtection
} = require("../src");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "major"
      }
    ]
  };
}

async function makeReplayableExperiment() {
  const confirmed = contract();

  const result = await runContractAttacks({
    contract: confirmed,
    input: {
      request: "Schedule the meeting."
    },
    expectedOutput: {
      time: "3 PM"
    },
    evaluator() {
      return true;
    },
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [
          {
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "Violates the confirmed rule.",
            mutatedOutput: {
              time: "4 PM"
            },
            scores: {
              realism: 0.9,
              subtlety: 0.8,
              novelty: 0.7,
              fixability: 0.9
            }
          }
        ]
      };
    }
  });

  assert.equal(result.experiment.replayable, true);
  assert.deepEqual(
    result.experiment.baseline.survivorOrderIds,
    ["wrong-time"]
  );

  return result.experiment;
}

function proposal() {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId: "wrong-time",
    ruleId: "time-rule",
    protection: {
      statement: "Reject any output whose time is not exactly 3 PM.",
      rationale: "The surviving attack changed the approved time."
    }
  };
}

test(
  "draftContractProtection builds the bound draft artifact",
  async () => {
    const experiment = await makeReplayableExperiment();

    const promise = draftContractProtection({
      experiment,
      sourceAttackId: "wrong-time",
      proposal: proposal()
    });

    assert.equal(
      Object.getPrototypeOf(promise),
      Promise.prototype
    );

    const draft = await promise;

    assert.deepEqual(
      Object.keys(draft),
      [
        "version",
        "kind",
        "status",
        "task",
        "experiment",
        "source",
        "rule",
        "protection"
      ]
    );

    assert.equal(draft.version, 1);
    assert.equal(draft.kind, "contract-protection");
    assert.equal(draft.status, "draft");
    assert.equal(draft.source.attackId, "wrong-time");
    assert.equal(draft.source.ruleId, "time-rule");
    assert.equal(draft.rule.id, "time-rule");
    assert.equal(
      draft.protection.statement,
      "Reject any output whose time is not exactly 3 PM."
    );

    assert.notEqual(draft.experiment, experiment);
    assert.notEqual(
      draft.rule,
      draft.experiment.attacks[0].rule
    );
  }
);

test(
  "draft invocation captures proposal authority synchronously",
  async () => {
    const experiment = await makeReplayableExperiment();
    const proposalValue = proposal();

    const promise = draftContractProtection({
      experiment,
      sourceAttackId: "wrong-time",
      proposal: proposalValue
    });

    proposalValue.protection.statement = "mutated after invocation";

    const draft = await promise;

    assert.equal(
      draft.protection.statement,
      "Reject any output whose time is not exactly 3 PM."
    );
  }
);

test(
  "draft rejects a non-survivor source attack with local TypeError",
  async () => {
    const experiment = await makeReplayableExperiment();

    await assert.rejects(
      draftContractProtection({
        experiment,
        sourceAttackId: "missing-attack",
        proposal: {
          ...proposal(),
          sourceAttackId: "missing-attack"
        }
      }),
      (error) =>
        error instanceof TypeError
    );
  }
);

test(
  "draft rejects malformed top-level option surface asynchronously",
  async () => {
    const experiment = await makeReplayableExperiment();

    const options = {
      experiment,
      sourceAttackId: "wrong-time",
      proposal: proposal(),
      extra: true
    };

    let returned = false;
    const promise = draftContractProtection(options);
    returned = true;

    await assert.rejects(
      promise,
      (error) =>
        returned === true &&
        error instanceof TypeError
    );
  }
);

test(
  "draft rejects non-replayable experiments before proposal processing",
  async () => {
    let getterCalls = 0;
    const badProposal = {};

    Object.defineProperty(
      badProposal,
      "version",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 1;
        }
      }
    );

    await assert.rejects(
      draftContractProtection({
        experiment: {
          version: 1,
          kind: "contract-attack-experiment",
          replayable: false,
          task: "Return the approved time.",
          reason: {
            code: "EXPERIMENT_NOT_WIRE_REPLAYABLE"
          }
        },
        sourceAttackId: "wrong-time",
        proposal: badProposal
      }),
      TypeError
    );

    assert.equal(getterCalls, 0);
  }
);
