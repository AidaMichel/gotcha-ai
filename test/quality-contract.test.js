"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  draftQualityContract,
  confirmQualityContract
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
        examples:
          duplicateExamples,
        generator:
          async () => ({
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
        examples:
          generatedExamples
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
      examples:
        sourceExamples,
      generator
    });

    assert.equal(
      sourceExamples[0].input,
      originalInput
    );
  }
);

test(
  "confirmQualityContract accepts a rule",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Changing the requested time changes the intended action.",
          evidence: [
            {
              type: "example",
              exampleId:
                "example-2"
            }
          ]
        }
      ]
    };

    const confirmed =
      confirmQualityContract({
        draft,
        decisions: [
          {
            ruleId:
              "rule-1",
            decision:
              "accept"
          }
        ]
      });

    assert.equal(
      confirmed.status,
      "confirmed"
    );

    assert.equal(
      confirmed.rules.length,
      1
    );

    assert.equal(
      confirmed.rules[0]
        .statement,
      draft.rules[0]
        .statement
    );
  }
);

test(
  "confirmQualityContract lets the human edit a rule",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The system should preserve time.",
          kind: "required",
          severity: "critical",
          confidence: "medium",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    const confirmed =
      confirmQualityContract({
        draft,
        decisions: [
          {
            ruleId:
              "rule-1",
            decision:
              "edit",
            statement:
              "The scheduled time must exactly match the requested time."
          }
        ]
      });

    assert.equal(
      confirmed.rules[0]
        .statement,
      "The scheduled time must exactly match the requested time."
    );
  }
);

test(
  "confirmQualityContract returns no-active-rules when every rule is rejected",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    const result =
      confirmQualityContract({
        draft,
        decisions: [
          {
            ruleId:
              "rule-1",
            decision:
              "reject"
          }
        ]
      });

    assert.equal(
      result.status,
      "no-active-rules"
    );

    assert.deepEqual(
      result.rules,
      []
    );
  }
);

test(
  "confirmQualityContract requires a decision for every proposed rule",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: []
        }),
      /Missing decision/
    );
  }
);
test(
  "confirmQualityContract rejects an unknown rule id",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: [
            {
              ruleId: "rule-does-not-exist",
              decision: "accept"
            }
          ]
        }),
      /Unknown rule id/
    );
  }
);

test(
  "confirmQualityContract rejects duplicate decisions",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: [
            {
              ruleId: "rule-1",
              decision: "accept"
            },
            {
              ruleId: "rule-1",
              decision: "reject"
            }
          ]
        }),
      /Duplicate decision/
    );
  }
);

test(
  "confirmQualityContract rejects an empty human edit",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "Time matters.",
          evidence: [
            {
              type: "task"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: [
            {
              ruleId: "rule-1",
              decision: "edit",
              statement: "   "
            }
          ]
        }),
      /must be a non-empty string/
    );
  }
);

test(
  "confirmQualityContract handles a zero-rule draft without pretending it is confirmed",
  () => {
    const result =
      confirmQualityContract({
        draft: {
          version: 1,
          task,
          source: {
            exampleIds: [
              "example-1",
              "example-2"
            ]
          },
          rules: []
        },
        decisions: []
      });

    assert.equal(
      result.status,
      "no-active-rules"
    );

    assert.deepEqual(
      result.rules,
      []
    );
  }
);
test(
  "confirmQualityContract rejects a draft with unknown evidence references",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "The example supports this rule.",
          evidence: [
            {
              type: "example",
              exampleId:
                "example-does-not-exist"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: [
            {
              ruleId: "rule-1",
              decision: "accept"
            }
          ]
        }),
      /unknown example/
    );
  }
);
test(
  "draftQualityContract records validated source example ids",
  async () => {
    const draft =
      await draftQualityContract({
        task,
        examples,
        generator:
          async () => ({
            version: 1,
            task,
            rules: []
          })
      });

    assert.deepEqual(
      draft.source,
      {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      }
    );
  }
);

test(
  "generator cannot control draft source metadata",
  async () => {
    const draft =
      await draftQualityContract({
        task,
        examples,
        generator:
          async () => ({
            version: 1,
            task,
            source: {
              exampleIds: [
                "fake-example"
              ]
            },
            rules: []
          })
      });

    assert.deepEqual(
      draft.source,
      {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      }
    );
  }
);

test(
  "serialized drafts retain evidence provenance for confirmation",
  async () => {
    const draft =
      await draftQualityContract({
        task,
        examples,
        generator:
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
                    exampleId:
                      "example-2"
                  }
                ]
              }
            ]
          })
      });

    const serializedDraft =
      JSON.parse(
        JSON.stringify(draft)
      );

    const confirmed =
      confirmQualityContract({
        draft:
          serializedDraft,
        decisions: [
          {
            ruleId:
              "rule-1",
            decision:
              "accept"
          }
        ]
      });

    assert.equal(
      confirmed.status,
      "confirmed"
    );

    assert.equal(
      confirmed.rules.length,
      1
    );
  }
);

test(
  "confirmQualityContract rejects duplicate source example ids",
  () => {
    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-1"
        ]
      },
      rules: []
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: []
        }),
      /Duplicate source example id/
    );
  }
);
test(
  "draftQualityContract rejects accessor-backed options without invoking getters",
  async () => {
    let getterCalls = 0;

    const options = {};

    Object.defineProperties(
      options,
      {
        task: {
          enumerable: true,
          get() {
            getterCalls += 1;
            return task;
          }
        },

        examples: {
          enumerable: true,
          value: examples
        },

        generator: {
          enumerable: true,
          value:
            async () => ({
              version: 1,
              task,
              rules: []
            })
        }
      }
    );

    await assert.rejects(
      draftQualityContract(
        options
      ),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);
test(
  "draftQualityContract rejects accessor-backed teaching examples without invoking getters",
  async () => {
    let getterCalls = 0;

    const example = {
      type: "judgment",
      input:
        "Schedule Sara on Tuesday at 3 PM.",
      output:
        "Meeting scheduled with Sara on Tuesday at 3 PM.",
      judgment: "good"
    };

    Object.defineProperty(
      example,
      "id",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "example-1";
        }
      }
    );

    await assert.rejects(
      draftQualityContract({
        task,
        examples: [
          example
        ],
        generator:
          async () => ({
            version: 1,
            task,
            rules: []
          })
      }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);
test(
  "draftQualityContract rejects accessor-backed AI drafts without invoking getters",
  async () => {
    let getterCalls = 0;

    const aiDraft = {
      task,
      rules: []
    };

    Object.defineProperty(
      aiDraft,
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
      draftQualityContract({
        task,
        examples,
        generator:
          async () =>
            aiDraft
      }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);
test(
  "confirmQualityContract rejects accessor-backed drafts without invoking getters",
  () => {
    let getterCalls = 0;

    const draft = {
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: []
    };

    Object.defineProperty(
      draft,
      "version",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return 1;
        }
      }
    );

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: []
        }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
)
test(
  "confirmQualityContract rejects accessor-backed source metadata without invoking getters",
  () => {
    let getterCalls = 0;

    const source = {};

    Object.defineProperty(
      source,
      "exampleIds",
      {
        enumerable: true,
        get() {
          getterCalls += 1;

          return [
            "example-1",
            "example-2"
          ];
        }
      }
    );

    const draft = {
      version: 1,
      task,
      source,
      rules: []
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: []
        }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "draftQualityContract rejects accessor-backed rules without invoking getters",
  async () => {
    let getterCalls = 0;

    const rule = {
      statement:
        "The scheduled time must match the requested time.",
      kind: "required",
      severity: "critical",
      confidence: "high",
      rationale:
        "The example supports this rule.",
      evidence: [
        {
          type: "example",
          exampleId: "example-2"
        }
      ]
    };

    Object.defineProperty(
      rule,
      "id",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "rule-1";
        }
      }
    );

    await assert.rejects(
      draftQualityContract({
        task,
        examples,
        generator:
          async () => ({
            version: 1,
            task,
            rules: [
              rule
            ]
          })
      }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "confirmQualityContract rejects accessor-backed decisions without invoking getters",
  () => {
    let getterCalls = 0;

    const decision = {
      decision: "accept"
    };

    Object.defineProperty(
      decision,
      "ruleId",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "rule-1";
        }
      }
    );

    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: [
        {
          id: "rule-1",
          statement:
            "The scheduled time must match the requested time.",
          kind: "required",
          severity: "critical",
          confidence: "high",
          rationale:
            "The example supports this rule.",
          evidence: [
            {
              type: "example",
              exampleId:
                "example-2"
            }
          ]
        }
      ]
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions: [
            decision
          ]
        }),
      /accessor|data propert/i
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);
test(
  "draftQualityContract rejects Proxy teaching example arrays before traps execute",
  async () => {
    let trapCalls = 0;

    const proxyExamples =
      new Proxy(
        examples,
        {
          get(
            target,
            property,
            receiver
          ) {
            trapCalls += 1;

            return Reflect.get(
              target,
              property,
              receiver
            );
          }
        }
      );

    await assert.rejects(
      draftQualityContract({
        task,
        examples:
          proxyExamples,
        generator:
          async () => ({
            version: 1,
            task,
            rules: []
          })
      }),
      /Proxy/i
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);
test(
  "draftQualityContract rejects Proxy rule arrays before traps execute",
  async () => {
    let trapCalls = 0;

    const proxyRules =
      new Proxy(
        [],
        {
          get(
            target,
            property,
            receiver
          ) {
            trapCalls += 1;

            return Reflect.get(
              target,
              property,
              receiver
            );
          }
        }
      );

    await assert.rejects(
      draftQualityContract({
        task,
        examples,
        generator:
          async () => ({
            version: 1,
            task,
            rules:
              proxyRules
          })
      }),
      /Proxy/i
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "draftQualityContract rejects Proxy evidence arrays before traps execute",
  async () => {
    let trapCalls = 0;

    const proxyEvidence =
      new Proxy(
        [
          {
            type: "example",
            exampleId:
              "example-2"
          }
        ],
        {
          get(
            target,
            property,
            receiver
          ) {
            trapCalls += 1;

            return Reflect.get(
              target,
              property,
              receiver
            );
          }
        }
      );

    await assert.rejects(
      draftQualityContract({
        task,
        examples,
        generator:
          async () => ({
            version: 1,
            task,
            rules: [
              {
                id: "rule-1",
                statement:
                  "The scheduled time must match the requested time.",
                kind:
                  "required",
                severity:
                  "critical",
                confidence:
                  "high",
                rationale:
                  "The example supports this rule.",
                evidence:
                  proxyEvidence
              }
            ]
          })
      }),
      /Proxy/i
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "confirmQualityContract rejects Proxy decision arrays before traps execute",
  () => {
    let trapCalls = 0;

    const proxyDecisions =
      new Proxy(
        [],
        {
          get(
            target,
            property,
            receiver
          ) {
            trapCalls += 1;

            return Reflect.get(
              target,
              property,
              receiver
            );
          }
        }
      );

    const draft = {
      version: 1,
      task,
      source: {
        exampleIds: [
          "example-1",
          "example-2"
        ]
      },
      rules: []
    };

    assert.throws(
      () =>
        confirmQualityContract({
          draft,
          decisions:
            proxyDecisions
        }),
      /Proxy/i
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);
test(
  "draftQualityContract rejects non-string teaching notes before generator execution",
  async () => {
    let generatorCalls = 0;

    const invalidExamples = [
      {
        id: "example-note",
        type: "judgment",
        input:
          "Schedule Sara on Tuesday at 3 PM.",
        output:
          "Meeting scheduled with Sara on Tuesday at 3 PM.",
        judgment: "good",
        note: 123
      }
    ];

    await assert.rejects(
      draftQualityContract({
        task,
        examples:
          invalidExamples,
        generator:
          async () => {
            generatorCalls += 1;

            return {
              version: 1,
              task,
              rules: []
            };
          }
      }),
      /note.*non-empty string|note.*string/i
    );

    assert.equal(
      generatorCalls,
      0
    );
  }
);
