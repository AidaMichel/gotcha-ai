"use strict";

const {
  draftQualityContract,
  confirmQualityContract
} = require("../src");

const task =
  "Schedule meetings using the requested person, day, and time. Ask for clarification when required scheduling information is missing.";

const examples = [
  {
    id: "example-1",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 3 PM.",
    judgment: "good"
  },

  {
    id: "example-2",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 4 PM.",
    judgment: "bad",
    note:
      "The scheduled time does not match the requested time."
  },

  {
    id: "example-3",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Omar on Tuesday at 3 PM.",
    judgment: "bad",
    note:
      "The scheduled person does not match the requested person."
  },

  {
    id: "example-4",
    type: "preference",
    input:
      "Schedule a meeting with Sara on Tuesday.",
    a:
      "What time should I schedule the meeting?",
    b:
      "Meeting scheduled with Sara on Tuesday at 3 PM.",
    preferred: "a",
    note:
      "The time is missing, so the assistant should clarify instead of guessing."
  }
];

// This deterministic generator stands in for an AI provider.
// Gotcha owns validation and confirmation.
// The caller can later replace this function with a real model.
async function generator({
  task: validatedTask
}) {
  return {
    version: 1,

    task:
      validatedTask,

    rules: [
      {
        id: "rule-1",

        statement:
          "The scheduled person must match the person requested by the user.",

        kind:
          "required",

        severity:
          "critical",

        confidence:
          "high",

        rationale:
          "A bad example changes the requested person.",

        evidence: [
          {
            type: "example",
            exampleId:
              "example-3"
          }
        ]
      },

      {
        id: "rule-2",

        statement:
          "The scheduled time must match the time requested by the user.",

        kind:
          "required",

        severity:
          "critical",

        confidence:
          "high",

        rationale:
          "A bad example changes the requested meeting time.",

        evidence: [
          {
            type: "example",
            exampleId:
              "example-2"
          }
        ]
      },

      {
        id: "rule-3",

        statement:
          "If a required meeting time is missing, ask the user for clarification instead of inventing one.",

        kind:
          "conditional",

        severity:
          "major",

        confidence:
          "high",

        rationale:
          "The preference example favors clarification over guessing a missing time.",

        evidence: [
          {
            type: "example",
            exampleId:
              "example-4"
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
      generator
    });

  console.log(
    "TEACH: examples accepted"
  );

  console.log(
    `CONTRACT: ${draft.rules.length} rules proposed`
  );

  draft.rules.forEach(
    (rule) => {
      console.log(
        `- ${rule.id}: ${rule.statement}`
      );
    }
  );

  const confirmed =
    confirmQualityContract({
      draft,

      decisions: [
        {
          ruleId:
            "rule-1",
          decision:
            "accept"
        },

        {
          ruleId:
            "rule-2",
          decision:
            "accept"
        },

        {
          ruleId:
            "rule-3",
          decision:
            "accept"
        }
      ]
    });

  console.log(
    `CONFIRM: ${confirmed.status}`
  );

  console.log(
    `Active rules: ${confirmed.rules.length}`
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
