const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runGotcha,
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("../src");

test(
  "public API runs the complete Gotcha improvement loop",
  () => {
    const expectedOutput = {
      status: "approved",
      amount: 100
    };

    function evaluator(output) {
      return (
        output.status === "approved"
      );
    }

    const mutationPack = [
      {
        id: "wrong-amount",
        type: "value-substitution",
        description:
          "Changes the amount while preserving the approved status.",

        mutate(output) {
          output.amount = 999;
          return output;
        },

        scores: {
          severity: 1,
          realism: 0.9,
          subtlety: 0.9,
          novelty: 0.7,
          fixability: 1
        },

        protection: {
          description:
            "Approved output must preserve the expected amount.",

          check(output) {
            return output.amount === 100;
          }
        }
      }
    ];

    const result =
      runGotcha({
        evaluator,
        expectedOutput,
        mutationPack
      });

    assert.equal(
      result.before.survivors.length,
      1
    );

    assert.equal(
      result.topFinding.id,
      "wrong-amount"
    );

    assert.equal(
      result.positiveControlPassed,
      true
    );

    assert.equal(
      result.after.survivors.length,
      0
    );

    assert.equal(
      result.improvement,
      1
    );
  }
);

test(
  "public API exposes confirmed-contract attacks",
  async () => {
    const contract = {
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
        }
      ]
    };

    const result =
      await runContractAttacks({
        contract,

        input: {
          request:
            "Schedule Sara at 3 PM."
        },

        expectedOutput: {
          person: "Sara",
          time: "3 PM"
        },

        evaluator(output) {
          return (
            output.person ===
              "Sara"
          );
        },

        generator() {
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
              }
            ]
          };
        }
      });

    assert.equal(
      result.baselinePassed,
      true
    );

    assert.equal(
      result.attack.survivors.length,
      1
    );

    assert.equal(
      result.topFinding.id,
      "wrong-time"
    );
  }
);


test(
  "public API exposes contract remediation and verification",
  async () => {
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
    function evaluator(output) {
      return output.time !== "5 PM";
    }
    const attack = await runContractAttacks({
      contract,
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator,
      generator() {
        return {
          version: 1,
          task: contract.task,
          attacks: [{
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes time.",
            rationale: "Evaluator misses it.",
            mutatedOutput: { time: "4 PM" },
            scores: { realism: 0.9, subtlety: 0.9, novelty: 0.8, fixability: 1 }
          }]
        };
      }
    });
    assert.equal(attack.experiment.replayable, true);
    const draft = await draftContractProtection({
      experiment: attack.experiment,
      sourceAttackId: "wrong-time",
      proposal: {
        version: 1,
        task: contract.task,
        sourceAttackId: "wrong-time",
        ruleId: "time-rule",
        protection: {
          statement: "Require exactly 3 PM.",
          rationale: "The source finding changed time."
        }
      }
    });
    const protection = await confirmContractProtection({
      draft,
      decision: { type: "accept" }
    });
    const verification = await verifyContractProtection({
      protection,
      evaluator,
      improvedEvaluator(output) {
        return output.time === "3 PM";
      }
    });
    assert.equal(draft.status, "draft");
    assert.equal(protection.status, "confirmed");
    assert.equal(verification.state, "verified");
    assert.equal(verification.verificationPassed, true);
    assert.deepEqual(verification.eliminatedAttackIds, ["wrong-time"]);
  }
);
