"use strict";

const {
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("../src");

async function main() {
  const contract = {
    version: 1,
    status: "confirmed",
    task: "Return the approved meeting time.",
    rules: [
      {
        id: "time-rule",
        statement: "The meeting time must be 3 PM.",
        kind: "required",
        severity: "major"
      }
    ]
  };

  function evaluator(output) {
    return output.time !== "5 PM";
  }

  const attackResult = await runContractAttacks({
    contract,
    input: { request: "Schedule the meeting at 3 PM." },
    expectedOutput: { time: "3 PM" },
    evaluator,
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: [
          {
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "The evaluator accepts a wrong time.",
            mutatedOutput: { time: "4 PM" },
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

  const draft = await draftContractProtection({
    experiment: attackResult.experiment,
    sourceAttackId: "wrong-time",
    proposal: {
      version: 1,
      task: contract.task,
      sourceAttackId: "wrong-time",
      ruleId: "time-rule",
      protection: {
        statement: "Reject any output whose time is not exactly 3 PM.",
        rationale: "The surviving attack changed the approved time."
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

  console.log("GOTCHA: wrong-time survived");
  console.log(`DRAFT: ${draft.status}`);
  console.log(`CONFIRM: ${protection.status}`);
  console.log(`VERIFY: ${verification.state}`);
  console.log(`RE-ATTACK: ${verification.after.survivorOrderIds.length} survivors`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
