"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  draftQualityContract
} = require("../src");

const task =
  "Schedule meetings from natural-language requests.";

const examples = [
  {
    id: "example-1",
    type: "judgment",
    input:
      "Schedule Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 3 PM.",
    judgment: "good"
  },
  {
    id: "example-2",
    type: "judgment",
    input:
      "Schedule Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 4 PM.",
    judgment: "bad",
    note:
      "The requested time changed."
  }
];

test(
  "draftQualityContract returns a validated AI draft",
  async () => {
    const generator =
      async () => ({
        version: 1,
        task,
        rules: [
          {
            id: "rule-1",
            statement:
              "The scheduled time must match the requested time.",
            kind: "required",
            severity: "critical",
            confidence: "high",
            rationale:
              "The bad example changed the requested time.",
            evidence: [
              {
                type: "example",
                exampleId: "example-2"
              }
            ]
          }
        ]
      });

    const draft =
      await draftQualityContract({
        task,
        examples,
        generator
      });

    assert.equal(
      draft.version,
      1
    );

    assert.equal(
      draft.task,
      task
    );

    assert.equal(
      draft.rules.length,
      1
    );

    assert.equal(
      draft.rules[0].id,
      "rule-1"
    );
  }
);

test(
  "draftQualityContract rejects a generator that changes the task",
  async () => {
    const generator =
      async () => ({
        version: 1,
        task:
          "A different task.",
        rules: []
      });

    await assert.rejects(
      draftQualityContract({
        task,
        examples,
        generator
      }),
      /must exactly match/
    );
  }
);
test(
  "draftQualityContract allows an honest zero-rule draft",
  async () => {
    const generator =
      async () => ({
        version: 1,
        task,
        rules: []
      });

    const draft =
      await draftQualityContract({
        task,
        examples,
        generator
      });

    assert.deepEqual(
      draft.rules,
      []
    );
  }
);

test(
  "draftQualityContract rejects duplicate teaching example IDs",
  async () => {
    const duplicateExamples = [
      examples[0],
      {
        ...examples[1],
        id: "example-1"
      }
    ];

    await assert.rejects(
      draftQualityContract({
        task,
        examples: duplicateExamples,
        generator: async () => ({
          version: 1,
          task,
          rules: []
        })
      }),
      /Duplicate example id/
    );
  }
);

test(
  "draftQualityContract rejects evidence that references an unknown example",
  async () => {
    const generator =
      async () => ({
        version: 1,
        task,
        rules: [
          {
            id: "rule-1",
            statement:
              "The scheduled time must match the requested time.",
            kind: "required",
            severity: "critical",
            confidence: "high",
            rationale:
              "The time must remain correct.",
            evidence: [
              {
                type: "example",
                exampleId:
                  "example-does-not-exist"
              }
            ]
          }
        ]
      });

    await assert.rejects(
      draftQualityContract({
        task,
        examples,
        generator
      }),
      /unknown example/
    );
  }
);
test(
  "generator receives an isolated copy of teaching examples",
  async () => {
    const sourceExamples =
      examples.map(
        (example) => ({
          ...example
        })
      );

    const originalInput =
      sourceExamples[0].input;

    const generator =
      async ({
        examples: generatedExamples
      }) => {
        generatedExamples[0].input =
          "MUTATED";

        return {
          version: 1,
          task,
          rules: []
        };
      };

    await draftQualityContract({
      task,
      examples: sourceExamples,
      generator
    });

    assert.equal(
      sourceExamples[0].input,
      originalInput
    );
  }
);
