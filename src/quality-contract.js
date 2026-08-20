"use strict";

const MAX_RULES = 7;

const EXAMPLE_TYPES = new Set([
  "judgment",
  "preference"
]);

const JUDGMENTS = new Set([
  "good",
  "bad"
]);

const PREFERENCES = new Set([
  "a",
  "b"
]);

const RULE_KINDS = new Set([
  "required",
  "forbidden",
  "conditional"
]);

const SEVERITIES = new Set([
  "critical",
  "major",
  "minor"
]);

const CONFIDENCES = new Set([
  "high",
  "medium",
  "low"
]);

const CONFIRMATION_DECISIONS =
  new Set([
    "accept",
    "edit",
    "reject"
  ]);

function requireNonEmptyString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }
}

function requireObject(
  value,
  label
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }
}

function validateTeachingExample(
  example,
  index
) {
  const label =
    `examples[${index}]`;

  requireObject(
    example,
    label
  );

  requireNonEmptyString(
    example.id,
    `${label}.id`
  );

  if (
    !EXAMPLE_TYPES.has(
      example.type
    )
  ) {
    throw new Error(
      `${label}.type must be judgment or preference.`
    );
  }

  requireNonEmptyString(
    example.input,
    `${label}.input`
  );

  if (
    example.type ===
    "judgment"
  ) {
    requireNonEmptyString(
      example.output,
      `${label}.output`
    );

    if (
      !JUDGMENTS.has(
        example.judgment
      )
    ) {
      throw new Error(
        `${label}.judgment must be good or bad.`
      );
    }
  }

  if (
    example.type ===
    "preference"
  ) {
    requireNonEmptyString(
      example.a,
      `${label}.a`
    );

    requireNonEmptyString(
      example.b,
      `${label}.b`
    );

    if (
      !PREFERENCES.has(
        example.preferred
      )
    ) {
      throw new Error(
        `${label}.preferred must be a or b.`
      );
    }
  }
}

function validateTeachingInput({
  task,
  examples
}) {
  requireNonEmptyString(
    task,
    "task"
  );

  if (
    !Array.isArray(examples) ||
    examples.length === 0
  ) {
    throw new Error(
      "examples must be a non-empty array."
    );
  }

  const ids =
    new Set();

  examples.forEach(
    (example, index) => {
      validateTeachingExample(
        example,
        index
      );

      if (
        ids.has(example.id)
      ) {
        throw new Error(
          `Duplicate example id: ${example.id}.`
        );
      }

      ids.add(example.id);
    }
  );

  return {
    task,
    examples: examples.map(
      (example) => {
        if (
          example.type ===
          "judgment"
        ) {
          return {
            id:
              example.id,

            type:
              example.type,

            input:
              example.input,

            output:
              example.output,

            judgment:
              example.judgment,

            ...(example.note ===
            undefined
              ? {}
              : {
                  note:
                    example.note
                })
          };
        }

        return {
          id:
            example.id,

          type:
            example.type,

          input:
            example.input,

          a:
            example.a,

          b:
            example.b,

          preferred:
            example.preferred,

          ...(example.note ===
          undefined
            ? {}
            : {
                note:
                  example.note
              })
        };
      }
    )
  };
}

function validateEvidence(
  evidence,
  exampleIds,
  label
) {
  if (
    !Array.isArray(evidence) ||
    evidence.length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty array.`
    );
  }

  evidence.forEach(
    (item, index) => {
      const itemLabel =
        `${label}[${index}]`;

      requireObject(
        item,
        itemLabel
      );

      if (
        item.type === "task"
      ) {
        return;
      }

      if (
        item.type === "example"
      ) {
        requireNonEmptyString(
          item.exampleId,
          `${itemLabel}.exampleId`
        );

        if (
          exampleIds !== null &&
          !exampleIds.has(
            item.exampleId
          )
        ) {
          throw new Error(
            `${itemLabel}.exampleId references an unknown example.`
          );
        }

        return;
      }

      throw new Error(
        `${itemLabel}.type must be task or example.`
      );
    }
  );
}

function validateRule(
  rule,
  index,
  exampleIds
) {
  const label =
    `rules[${index}]`;

  requireObject(
    rule,
    label
  );

  requireNonEmptyString(
    rule.id,
    `${label}.id`
  );

  requireNonEmptyString(
    rule.statement,
    `${label}.statement`
  );

  if (
    !RULE_KINDS.has(
      rule.kind
    )
  ) {
    throw new Error(
      `${label}.kind is invalid.`
    );
  }

  if (
    !SEVERITIES.has(
      rule.severity
    )
  ) {
    throw new Error(
      `${label}.severity is invalid.`
    );
  }

  if (
    !CONFIDENCES.has(
      rule.confidence
    )
  ) {
    throw new Error(
      `${label}.confidence is invalid.`
    );
  }

  requireNonEmptyString(
    rule.rationale,
    `${label}.rationale`
  );

  validateEvidence(
    rule.evidence,
    exampleIds,
    `${label}.evidence`
  );
}

function validateDraft(
  draft,
  task,
  examples
) {
  requireObject(
    draft,
    "draft"
  );

  if (
    draft.version !== 1
  ) {
    throw new Error(
      "draft.version must be 1."
    );
  }

  requireNonEmptyString(
    draft.task,
    "draft.task"
  );

  if (
    draft.task !== task
  ) {
    throw new Error(
      "draft.task must exactly match the validated task."
    );
  }

  if (
    !Array.isArray(
      draft.rules
    )
  ) {
    throw new Error(
      "draft.rules must be an array."
    );
  }

  if (
    draft.rules.length >
    MAX_RULES
  ) {
    throw new Error(
      `draft.rules cannot contain more than ${MAX_RULES} rules.`
    );
  }

  const exampleIds =
    new Set(
      examples.map(
        (example) =>
          example.id
      )
    );

  const ruleIds =
    new Set();

  draft.rules.forEach(
    (rule, index) => {
      validateRule(
        rule,
        index,
        exampleIds
      );

      if (
        ruleIds.has(
          rule.id
        )
      ) {
        throw new Error(
          `Duplicate rule id: ${rule.id}.`
        );
      }

      ruleIds.add(
        rule.id
      );
    }
  );

  return draft;
}

function validateDraftForConfirmation(
  draft
) {
  requireObject(
    draft,
    "draft"
  );

  if (
    draft.version !== 1
  ) {
    throw new Error(
      "draft.version must be 1."
    );
  }

  requireNonEmptyString(
    draft.task,
    "draft.task"
  );

  requireObject(
    draft.source,
    "draft.source"
  );

  if (
    !Array.isArray(
      draft.source.exampleIds
    ) ||
    draft.source.exampleIds.length === 0
  ) {
    throw new Error(
      "draft.source.exampleIds must be a non-empty array."
    );
  }

  const exampleIds =
    new Set();

  draft.source.exampleIds.forEach(
    (exampleId, index) => {
      requireNonEmptyString(
        exampleId,
        `draft.source.exampleIds[${index}]`
      );

      if (
        exampleIds.has(
          exampleId
        )
      ) {
        throw new Error(
          `Duplicate source example id: ${exampleId}.`
        );
      }

      exampleIds.add(
        exampleId
      );
    }
  );

  if (
    !Array.isArray(
      draft.rules
    )
  ) {
    throw new Error(
      "draft.rules must be an array."
    );
  }

  if (
    draft.rules.length >
    MAX_RULES
  ) {
    throw new Error(
      `draft.rules cannot contain more than ${MAX_RULES} rules.`
    );
  }

  const ruleIds =
    new Set();

  draft.rules.forEach(
    (rule, index) => {
      validateRule(
        rule,
        index,
        exampleIds
      );

      if (
        ruleIds.has(
          rule.id
        )
      ) {
        throw new Error(
          `Duplicate rule id: ${rule.id}.`
        );
      }

      ruleIds.add(
        rule.id
      );
    }
  );

  return draft;
}

function buildGenerationInstructions() {
  return [
    "Infer quality rules only from the supplied task and examples.",
    "Do not invent unrelated requirements or product policy.",
    "Prefer fewer strong rules over speculative rules.",
    "Return between 0 and 7 rules.",
    "Every rule must be testable and behavior-specific.",
    "Every rule must include rationale, confidence, and evidence.",
    "Evidence may reference the task or supplied example IDs only.",
    "Avoid vague rules such as be helpful, be accurate, or be high quality.",
    "This is a draft only. Never claim that any rule is confirmed."
  ].join("\n");
}

async function draftQualityContract({
  task,
  examples,
  generator
}) {
  if (
    typeof generator !==
    "function"
  ) {
    throw new Error(
      "generator must be a function."
    );
  }

  const validated =
    validateTeachingInput({
      task,
      examples
    });

  const sourceExampleIds =
    validated.examples.map(
      (example) =>
        example.id
    );

  const generatorExamples =
    validated.examples.map(
      (example) => ({
        ...example
      })
    );

  const draft =
    await generator({
      task:
        validated.task,

      examples:
        generatorExamples,

      instructions:
        buildGenerationInstructions()
    });

  const validatedDraft =
    validateDraft(
      draft,
      validated.task,
      validated.examples
    );

  return {
    version:
      validatedDraft.version,

    task:
      validatedDraft.task,

    source: {
      exampleIds:
        sourceExampleIds
    },

    rules:
      validatedDraft.rules.map(
        (rule) => ({
          id:
            rule.id,

          statement:
            rule.statement,

          kind:
            rule.kind,

          severity:
            rule.severity,

          confidence:
            rule.confidence,

          rationale:
            rule.rationale,

          evidence:
            rule.evidence.map(
              (item) =>
                item.type ===
                "task"
                  ? {
                      type:
                        "task"
                    }
                  : {
                      type:
                        "example",

                      exampleId:
                        item.exampleId
                    }
            )
        })
      )
  };
}

function validateConfirmationDecision(
  decision,
  index
) {
  const label =
    `decisions[${index}]`;

  requireObject(
    decision,
    label
  );

  requireNonEmptyString(
    decision.ruleId,
    `${label}.ruleId`
  );

  if (
    !CONFIRMATION_DECISIONS.has(
      decision.decision
    )
  ) {
    throw new Error(
      `${label}.decision must be accept, edit, or reject.`
    );
  }

  if (
    decision.decision ===
    "edit"
  ) {
    requireNonEmptyString(
      decision.statement,
      `${label}.statement`
    );
  }
}

function confirmQualityContract({
  draft,
  decisions
}) {
  const validatedDraft =
    validateDraftForConfirmation(
      draft
    );

  if (
    !Array.isArray(
      decisions
    )
  ) {
    throw new Error(
      "decisions must be an array."
    );
  }

  const rulesById =
    new Map(
      validatedDraft.rules.map(
        (rule) => [
          rule.id,
          rule
        ]
      )
    );

  const decisionsByRuleId =
    new Map();

  decisions.forEach(
    (decision, index) => {
      validateConfirmationDecision(
        decision,
        index
      );

      if (
        !rulesById.has(
          decision.ruleId
        )
      ) {
        throw new Error(
          `Unknown rule id: ${decision.ruleId}.`
        );
      }

      if (
        decisionsByRuleId.has(
          decision.ruleId
        )
      ) {
        throw new Error(
          `Duplicate decision for rule id: ${decision.ruleId}.`
        );
      }

      decisionsByRuleId.set(
        decision.ruleId,
        decision
      );
    }
  );

  validatedDraft.rules.forEach(
    (rule) => {
      if (
        !decisionsByRuleId.has(
          rule.id
        )
      ) {
        throw new Error(
          `Missing decision for rule id: ${rule.id}.`
        );
      }
    }
  );

  const activeRules = [];

  validatedDraft.rules.forEach(
    (rule) => {
      const decision =
        decisionsByRuleId.get(
          rule.id
        );

      if (
        decision.decision ===
        "reject"
      ) {
        return;
      }

      if (
        decision.decision ===
        "edit"
      ) {
        activeRules.push({
          id:
            rule.id,

          statement:
            decision.statement,

          kind:
            rule.kind,

          severity:
            rule.severity
        });

        return;
      }

      activeRules.push({
        id:
          rule.id,

        statement:
          rule.statement,

        kind:
          rule.kind,

        severity:
          rule.severity
      });
    }
  );

  if (
    activeRules.length === 0
  ) {
    return {
      version: 1,

      status:
        "no-active-rules",

      task:
        validatedDraft.task,

      rules: []
    };
  }

  return {
    version: 1,

    status:
      "confirmed",

    task:
      validatedDraft.task,

    rules:
      activeRules
  };
}

module.exports = {
  draftQualityContract,
  confirmQualityContract
};
