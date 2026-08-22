"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks
} = require("../src/contract-attacks");

const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("../src/contract-remediation");

function makeContract() {
  return {
    version: 1,
    status: "confirmed",
    task:
      "Schedule the requested person at the requested time.",
    rules: [
      {
        id: "time-rule",
        statement:
          "The scheduled time must match the requested time.",
        kind: "required",
        severity: "critical"
      },
      {
        id: "person-rule",
        statement:
          "The scheduled person must match the requested person.",
        kind: "required",
        severity: "major"
      }
    ]
  };
}

const input = {
  request:
    "Schedule Sara at 3 PM."
};

const expectedOutput = {
  person: "Sara",
  time: "3 PM"
};

function weakEvaluator(output) {
  return output.person === "Sara";
}

function makeAttackGenerator() {
  return function generator({
    contract
  }) {
    return {
      version: 1,
      task: contract.task,
      attacks: [
        {
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description:
            "Changes the requested time.",
          rationale:
            "The evaluator does not verify the confirmed time rule.",
          mutatedOutput: {
            person: "Sara",
            time: "4 PM"
          },
          scores: {
            realism: 0.9,
            subtlety: 0.9,
            novelty: 0.8,
            fixability: 1
          }
        },
        {
          id: "wrong-person",
          ruleId: "person-rule",
          type: "wrong-person",
          description:
            "Changes the requested person.",
          rationale:
            "Checks whether the evaluator catches the wrong person.",
          mutatedOutput: {
            person: "Maya",
            time: "3 PM"
          },
          scores: {
            realism: 0.8,
            subtlety: 0.8,
            novelty: 0.7,
            fixability: 0.9
          }
        }
      ]
    };
  };
}

async function makeAttackResult() {
  return runContractAttacks({
    contract: makeContract(),
    input,
    expectedOutput,
    evaluator: weakEvaluator,
    generator:
      makeAttackGenerator()
  });
}

function makeProtectionGenerator() {
  return function generator({
    contract,
    finding
  }) {
    return {
      version: 1,
      task: contract.task,
      sourceAttackId:
        finding.id,
      ruleId:
        finding.ruleId,
      protection: {
        statement:
          "Reject scheduled outputs whose actual time differs from the requested time.",
        rationale:
          "The evaluator accepted a candidate that changed the confirmed requested time."
      }
    };
  };
}

async function makeDraft(
  attackResult
) {
  return draftContractProtection({
    contract: makeContract(),
    input,
    expectedOutput,
    attacks:
      attackResult.generatedAttacks,
    sourceAttackId:
      attackResult.topFinding.id,
    generator:
      makeProtectionGenerator()
  });
}

async function makeConfirmed(
  attackResult
) {
  const draft =
    await makeDraft(
      attackResult
    );

  return confirmContractProtection({
    draft,
    decision: {
      type: "accept"
    }
  });
}

test(
  "draft binds the complete original contract case and attack set",
  async () => {
    const attackResult =
      await makeAttackResult();

    const draft =
      await makeDraft(
        attackResult
      );

    assert.equal(
      draft.status,
      "draft"
    );

    assert.equal(
      draft.source.attackId,
      "wrong-time"
    );

    assert.equal(
      draft.attacks.length,
      2
    );

    assert.deepEqual(
      draft.case.input,
      input
    );

    assert.deepEqual(
      draft.case.expectedOutput,
      expectedOutput
    );

    assert.deepEqual(
      draft.contract,
      makeContract()
    );

    assert.equal(
      Object.isFrozen(draft),
      true
    );
  }
);

test(
  "source finding is resolved from the bound attack set",
  async () => {
    const attackResult =
      await makeAttackResult();

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks:
          attackResult.generatedAttacks,
        sourceAttackId:
          "not-in-set",
        generator:
          makeProtectionGenerator()
      }),
      /complete original attack set/
    );
  }
);

test(
  "draft rejects duplicate attack IDs",
  async () => {
    const attackResult =
      await makeAttackResult();

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks: [
          attackResult.generatedAttacks[0],
          attackResult.generatedAttacks[0]
        ],
        sourceAttackId:
          "wrong-time",
        generator:
          makeProtectionGenerator()
      }),
      /Duplicate contract remediation attack id/
    );
  }
);

test(
  "draft rejects mismatched attack rule authority",
  async () => {
    const attackResult =
      await makeAttackResult();

    const changed = {
      ...attackResult.generatedAttacks[0],
      rule: {
        ...attackResult.generatedAttacks[0].rule,
        severity: "minor"
      }
    };

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks: [changed],
        sourceAttackId:
          "wrong-time",
        generator:
          makeProtectionGenerator()
      }),
      /must exactly match/
    );
  }
);

test(
  "draft rejects stored severity that does not match the confirmed rule",
  async () => {
    const attackResult =
      await makeAttackResult();

    const changed = {
      ...attackResult.generatedAttacks[0],
      severity: 0.4
    };

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks: [changed],
        sourceAttackId:
          "wrong-time",
        generator:
          makeProtectionGenerator()
      }),
      /severity must match/
    );
  }
);

test(
  "draft supports async native-Promise protection generators",
  async () => {
    const attackResult =
      await makeAttackResult();

    const draft =
      await draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks:
          attackResult.generatedAttacks,
        sourceAttackId:
          "wrong-time",
        async generator({
          contract,
          finding
        }) {
          await Promise.resolve();

          return {
            version: 1,
            task: contract.task,
            sourceAttackId:
              finding.id,
            ruleId:
              finding.ruleId,
            protection: {
              statement:
                "Reject wrong requested times.",
              rationale:
                "The confirmed time rule escaped."
            }
          };
        }
      });

    assert.equal(
      draft.status,
      "draft"
    );
  }
);

test(
  "draft rejects executable model-produced protection data",
  async () => {
    const attackResult =
      await makeAttackResult();

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks:
          attackResult.generatedAttacks,
        sourceAttackId:
          "wrong-time",
        generator({
          contract,
          finding
        }) {
          return {
            version: 1,
            task: contract.task,
            sourceAttackId:
              finding.id,
            ruleId:
              finding.ruleId,
            protection: {
              statement:
                "Reject wrong times.",
              rationale:
                "The time rule escaped.",
              check() {
                return true;
              }
            }
          };
        }
      }),
      /must not contain functions/
    );
  }
);

test(
  "draft rejects generator identity changes",
  async () => {
    const attackResult =
      await makeAttackResult();

    await assert.rejects(
      draftContractProtection({
        contract: makeContract(),
        input,
        expectedOutput,
        attacks:
          attackResult.generatedAttacks,
        sourceAttackId:
          "wrong-time",
        generator({
          contract,
          finding
        }) {
          return {
            version: 1,
            task: contract.task,
            sourceAttackId:
              finding.id,
            ruleId:
              "person-rule",
            protection: {
              statement: "No.",
              rationale: "No."
            }
          };
        }
      }),
      /ruleId must exactly match/
    );
  }
);

test(
  "confirmation preserves bound experiment and supports accept edit reject",
  async () => {
    const attackResult =
      await makeAttackResult();

    const draft =
      await makeDraft(
        attackResult
      );

    const accepted =
      confirmContractProtection({
        draft,
        decision: {
          type: "accept"
        }
      });

    assert.equal(
      accepted.status,
      "confirmed"
    );

    assert.deepEqual(
      accepted.contract,
      draft.contract
    );

    assert.deepEqual(
      accepted.case,
      draft.case
    );

    assert.deepEqual(
      accepted.attacks,
      draft.attacks
    );

    const edited =
      confirmContractProtection({
        draft,
        decision: {
          type: "edit",
          statement:
            "The scheduled time must equal the explicitly requested time."
        }
      });

    assert.equal(
      edited.protection.decision,
      "edit"
    );

    assert.deepEqual(
      edited.attacks,
      draft.attacks
    );

    const rejected =
      confirmContractProtection({
        draft,
        decision: {
          type: "reject"
        }
      });

    assert.equal(
      rejected.status,
      "rejected"
    );
  }
);

test(
  "confirmation cannot edit authority fields",
  async () => {
    const attackResult =
      await makeAttackResult();

    const draft =
      await makeDraft(
        attackResult
      );

    assert.throws(
      () =>
        confirmContractProtection({
          draft,
          decision: {
            type: "edit",
            statement:
              "Reject wrong times.",
            attacks: []
          }
        }),
      /unsupported fields/
    );
  }
);

test(
  "verification API rejects substitute contract case or attack inputs",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    await assert.rejects(
      verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator:
          weakEvaluator,
        attacks: []
      }),
      /unsupported fields/
    );

    await assert.rejects(
      verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator:
          weakEvaluator,
        input: {
          request: "Different case"
        }
      }),
      /unsupported fields/
    );
  }
);

test(
  "verification closes source finding against the bound full experiment",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    function improvedEvaluator(output) {
      return (
        output.person === "Sara" &&
        output.time === "3 PM"
      );
    }

    const result =
      await verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator
      });

    assert.equal(
      result.state,
      "verified"
    );

    assert.equal(
      result.sourceFindingReproduced,
      true
    );

    assert.equal(
      result.sourceFindingCaught,
      true
    );

    assert.equal(
      result.positiveControlPassed,
      true
    );

    assert.equal(
      result.verificationPassed,
      true
    );

    assert.deepEqual(
      result.eliminatedAttackIds,
      ["wrong-time"]
    );

    assert.deepEqual(
      result.regressionAttackIds,
      []
    );
  }
);

test(
  "verification fails when the source finding still survives",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    const result =
      await verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator:
          weakEvaluator
      });

    assert.equal(
      result.state,
      "source-finding-still-survives"
    );

    assert.equal(
      result.verificationPassed,
      false
    );
  }
);

test(
  "verification reports non-reproducible source against a changed baseline",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    function alreadyFixed(output) {
      return (
        output.person === "Sara" &&
        output.time === "3 PM"
      );
    }

    const result =
      await verifyContractProtection({
        protection,
        evaluator:
          alreadyFixed,
        improvedEvaluator:
          alreadyFixed
      });

    assert.equal(
      result.state,
      "source-finding-not-reproducible"
    );

    assert.equal(
      result.verificationPassed,
      false
    );
  }
);

test(
  "verification fails when improved evaluator rejects bound known-good output",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    const result =
      await verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator() {
          return false;
        }
      });

    assert.equal(
      result.state,
      "improved-positive-control-failed"
    );

    assert.equal(
      result.positiveControlPassed,
      false
    );

    assert.equal(
      result.verificationPassed,
      false
    );
  }
);

test(
  "verification detects identity-level replay regressions",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    function regressedEvaluator(output) {
      if (
        output.person === "Maya" &&
        output.time === "3 PM"
      ) {
        return true;
      }

      return output.time === "3 PM";
    }

    const result =
      await verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator:
          regressedEvaluator
      });

    assert.equal(
      result.sourceFindingCaught,
      true
    );

    assert.deepEqual(
      result.regressionAttackIds,
      ["wrong-person"]
    );

    assert.equal(
      result.state,
      "regression-detected"
    );

    assert.equal(
      result.verificationPassed,
      false
    );
  }
);

test(
  "replay keeps severity authoritative to the bound confirmed contract",
  async () => {
    const attackResult =
      await makeAttackResult();

    const protection =
      await makeConfirmed(
        attackResult
      );

    const result =
      await verifyContractProtection({
        protection,
        evaluator: weakEvaluator,
        improvedEvaluator(output) {
          return (
            output.person === "Sara" &&
            output.time === "3 PM"
          );
        }
      });

    const replayed =
      result.baseline.attack.results
        .find(
          (entry) =>
            entry.id === "wrong-time"
        );

    assert.equal(
      replayed.severity,
      1
    );
  }
);

test(
  "rejected protection cannot verify",
  async () => {
    const attackResult =
      await makeAttackResult();

    const draft =
      await makeDraft(
        attackResult
      );

    const rejected =
      confirmContractProtection({
        draft,
        decision: {
          type: "reject"
        }
      });

    await assert.rejects(
      verifyContractProtection({
        protection: rejected,
        evaluator: weakEvaluator,
        improvedEvaluator:
          weakEvaluator
      }),
      /status must be "confirmed"/
    );
  }
);
