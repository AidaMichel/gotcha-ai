"use strict";

const {
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks
} = require("../src");

const task =
  "Schedule meetings using the requested person and time.";

const examples = [
  {
    id: "example-1",
    type: "judgment",

    input:
      "Schedule Sara at 3 PM.",

    output:
      "Meeting scheduled with Sara at 3 PM.",

    judgment:
      "good"
  },

  {
    id: "example-2",
    type: "judgment",

    input:
      "Schedule Sara at 3 PM.",

    output:
      "Meeting scheduled with Sara at 4 PM.",

    judgment:
      "bad",

    note:
      "The scheduled time does not match the requested time."
  }
];

async function contractGenerator({
  task: validatedTask
}) {
  return {
    version: 1,
    task: validatedTask,

    rules: [
      {
        id:
          "time-rule",

        statement:
          "The scheduled time must match the time requested by the user.",

        kind:
          "required",

        severity:
          "critical",

        confidence:
          "high",

        rationale:
          "The bad example changes the requested meeting time.",

        evidence: [
          {
            type:
              "example",

            exampleId:
              "example-2"
          }
        ]
      }
    ]
  };
}

async function main() {
  const draft =
    await draftQualityContract({
      task,
      examples,

      generator:
        contractGenerator
    });

  console.log(
    "TEACH: examples accepted"
  );

  console.log(
    `CONTRACT: ${draft.rules.length} rule proposed`
  );

  const confirmed =
    confirmQualityContract({
      draft,

      decisions: [
        {
          ruleId:
            "time-rule",

          decision:
            "accept"
        }
      ]
    });

  console.log(
    `CONFIRM: ${confirmed.status}`
  );

  const attackResult =
    await runContractAttacks({
      contract:
        confirmed,

      input: {
        request:
          "Schedule Sara at 3 PM."
      },

      expectedOutput: {
        person:
          "Sara",

        time:
          "3 PM"
      },

      evaluator(output) {
        return (
          output.person ===
            "Sara"
        );
      },

      generator({
        contract
      }) {
        return {
          version: 1,

          task:
            contract.task,

          attacks: [
            {
              id:
                "wrong-time",

              ruleId:
                "time-rule",

              type:
                "wrong-time",

              description:
                "Changes the requested meeting time.",

              rationale:
                "The current evaluator checks the person but not the confirmed time rule.",

              mutatedOutput: {
                person:
                  "Sara",

                time:
                  "4 PM"
              },

              scores: {
                realism:
                  0.9,

                subtlety:
                  0.9,

                novelty:
                  0.8,

                fixability:
                  1
              }
            }
          ]
        };
      }
    });

  console.log(
    `ATTACK: ${attackResult.generatedAttacks.length} candidate generated`
  );

  console.log(
    `GOTCHA: ${attackResult.topFinding.id} survived`
  );
}

main().catch(
  (error) => {
    console.error(
      error.message
    );

    process.exitCode = 1;
  }
);
