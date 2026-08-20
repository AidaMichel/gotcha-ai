
"use strict";

const {
  types: utilTypes
} = require("node:util");

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const ownKeys =
  Reflect.ownKeys;

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

function captureDataProperties(
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

  if (
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  for (
    const key of
      ownKeys(descriptors)
  ) {
    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must use data properties only.`
      );
    }
  }

  return descriptors;
}

function readDataProperty(
  descriptors,
  key
) {
  const descriptor =
    descriptors[key];

  return (
    descriptor === undefined
      ? undefined
      : descriptor.value
  );
}

function captureArrayValues(
  value,
  label
) {
  if (
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an array.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  for (
    const key of
      ownKeys(descriptors)
  ) {
    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must use data properties only.`
      );
    }
  }

  const length =
    descriptors.length.value;

  const values = [];

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const descriptor =
      descriptors[
        String(index)
      ];

    if (
      descriptor === undefined
    ) {
      throw new Error(
        `${label} must not be sparse.`
      );
    }

    values.push(
      descriptor.value
    );
  }

  return values;
}

function validateTeachingExample(
  example,
  index
) {
  const label =
    `examples[${index}]`;

  const descriptors =
    captureDataProperties(
      example,
      label
    );

  const id =
    readDataProperty(
      descriptors,
      "id"
    );

  const type =
    readDataProperty(
      descriptors,
      "type"
    );

  const input =
    readDataProperty(
      descriptors,
      "input"
    );

  const output =
    readDataProperty(
      descriptors,
      "output"
    );

  const judgment =
    readDataProperty(
      descriptors,
      "judgment"
    );

  const a =
    readDataProperty(
      descriptors,
      "a"
    );

  const b =
    readDataProperty(
      descriptors,
      "b"
    );

  const preferred =
    readDataProperty(
      descriptors,
      "preferred"
    );

  const note =
    readDataProperty(
      descriptors,
      "note"
    );

  requireNonEmptyString(
    id,
    `${label}.id`
  );

  if (
    !EXAMPLE_TYPES.has(
      type
    )
  ) {
    throw new Error(
      `${label}.type must be judgment or preference.`
    );
  }

  requireNonEmptyString(
    input,
    `${label}.input`
  );

  if (
    type === "judgment"
  ) {
    requireNonEmptyString(
      output,
      `${label}.output`
    );

    if (
      !JUDGMENTS.has(
        judgment
      )
    ) {
      throw new Error(
        `${label}.judgment must be good or bad.`
      );
    }

    return {
      id,
      type,
      input,
      output,
      judgment,
      ...(note === undefined
        ? {}
        : { note })
    };
  }

  requireNonEmptyString(
    a,
    `${label}.a`
  );

  requireNonEmptyString(
    b,
    `${label}.b`
  );

  if (
    !PREFERENCES.has(
      preferred
    )
  ) {
    throw new Error(
      `${label}.preferred must be a or b.`
    );
  }

  return {
    id,
    type,
    input,
    a,
    b,
    preferred,
    ...(note === undefined
      ? {}
      : { note })
  };
}

function validateTeachingInput({
  task,
  examples
}) {
  requireNonEmptyString(
    task,
    "task"
  );

  const exampleValues =
    captureArrayValues(
      examples,
      "examples"
    );

  if (
    exampleValues.length === 0
  ) {
    throw new Error(
      "examples must be a non-empty array."
    );
  }

  const ids =
    new Set();

  const normalizedExamples = [];

  exampleValues.forEach(
    (example, index) => {
      const normalized =
        validateTeachingExample(
          example,
          index
        );

      if (
        ids.has(
          normalized.id
        )
      ) {
        throw new Error(
          `Duplicate example id: ${normalized.id}.`
        );
      }

      ids.add(
        normalized.id
      );

      normalizedExamples.push(
        normalized
      );
    }
  );

  return {
    task,
    examples:
      normalizedExamples
  };
}

function validateEvidence(
  evidence,
  exampleIds,
  label
) {
  const evidenceValues =
    captureArrayValues(
      evidence,
      label
    );

  if (
    evidenceValues.length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty array.`
    );
  }

  return evidenceValues.map(
    (item, index) => {
      const itemLabel =
        `${label}[${index}]`;

      const descriptors =
        captureDataProperties(
          item,
          itemLabel
        );

      const type =
        readDataProperty(
          descriptors,
          "type"
        );

      const exampleId =
        readDataProperty(
          descriptors,
          "exampleId"
        );

      if (
        type === "task"
      ) {
        return {
          type: "task"
        };
      }

      if (
        type === "example"
      ) {
        requireNonEmptyString(
          exampleId,
          `${itemLabel}.exampleId`
        );

        if (
          exampleIds !== null &&
          !exampleIds.has(
            exampleId
          )
        ) {
          throw new Error(
            `${itemLabel}.exampleId references an unknown example.`
          );
        }

        return {
          type: "example",
          exampleId
        };
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

  const descriptors =
    captureDataProperties(
      rule,
      label
    );

  const id =
    readDataProperty(
      descriptors,
      "id"
    );

  const statement =
    readDataProperty(
      descriptors,
      "statement"
    );

  const kind =
    readDataProperty(
      descriptors,
      "kind"
    );

  const severity =
    readDataProperty(
      descriptors,
      "severity"
    );

  const confidence =
    readDataProperty(
      descriptors,
      "confidence"
    );

  const rationale =
    readDataProperty(
      descriptors,
      "rationale"
    );

  const evidence =
    readDataProperty(
      descriptors,
      "evidence"
    );

  requireNonEmptyString(
    id,
    `${label}.id`
  );

  requireNonEmptyString(
    statement,
    `${label}.statement`
  );

  if (
    !RULE_KINDS.has(
      kind
    )
  ) {
    throw new Error(
      `${label}.kind is invalid.`
    );
  }

  if (
    !SEVERITIES.has(
      severity
    )
  ) {
    throw new Error(
      `${label}.severity is invalid.`
    );
  }

  if (
    !CONFIDENCES.has(
      confidence
    )
  ) {
    throw new Error(
      `${label}.confidence is invalid.`
    );
  }

  requireNonEmptyString(
    rationale,
    `${label}.rationale`
  );

  const normalizedEvidence =
    validateEvidence(
      evidence,
      exampleIds,
      `${label}.evidence`
    );

  return {
    id,
    statement,
    kind,
    severity,
    confidence,
    rationale,
    evidence:
      normalizedEvidence
  };
}

function validateDraft(
  draft,
  task,
  examples
) {
  const descriptors =
    captureDataProperties(
      draft,
      "draft"
    );

  const version =
    readDataProperty(
      descriptors,
      "version"
    );

  const draftTask =
    readDataProperty(
      descriptors,
      "task"
    );

  const rules =
    readDataProperty(
      descriptors,
      "rules"
    );

  if (
    version !== 1
  ) {
    throw new Error(
      "draft.version must be 1."
    );
  }

  requireNonEmptyString(
    draftTask,
    "draft.task"
  );

  if (
    draftTask !== task
  ) {
    throw new Error(
      "draft.task must exactly match the validated task."
    );
  }

  const ruleValues =
    captureArrayValues(
      rules,
      "draft.rules"
    );

  if (
    ruleValues.length >
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

  const normalizedRules =
    ruleValues.map(
      (rule, index) => {
        const normalizedRule =
          validateRule(
            rule,
            index,
            exampleIds
          );

        if (
          ruleIds.has(
            normalizedRule.id
          )
        ) {
          throw new Error(
            `Duplicate rule id: ${normalizedRule.id}.`
          );
        }

        ruleIds.add(
          normalizedRule.id
        );

        return normalizedRule;
      }
    );

  return {
    version,
    task:
      draftTask,
    rules:
      normalizedRules
  };
}

function validateDraftForConfirmation(
  draft
) {
  const descriptors =
    captureDataProperties(
      draft,
      "draft"
    );

  const version =
    readDataProperty(
      descriptors,
      "version"
    );

  const draftTask =
    readDataProperty(
      descriptors,
      "task"
    );

  const source =
    readDataProperty(
      descriptors,
      "source"
    );

  const rules =
    readDataProperty(
      descriptors,
      "rules"
    );

  if (
    version !== 1
  ) {
    throw new Error(
      "draft.version must be 1."
    );
  }

  requireNonEmptyString(
    draftTask,
    "draft.task"
  );

  const sourceDescriptors =
    captureDataProperties(
      source,
      "draft.source"
    );

  const sourceExampleIds =
    readDataProperty(
      sourceDescriptors,
      "exampleIds"
    );

  const sourceExampleIdValues =
    captureArrayValues(
      sourceExampleIds,
      "draft.source.exampleIds"
    );

  if (
    sourceExampleIdValues.length === 0
  ) {
    throw new Error(
      "draft.source.exampleIds must be a non-empty array."
    );
  }

  const exampleIds =
    new Set();

  sourceExampleIdValues.forEach(
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

  const ruleValues =
    captureArrayValues(
      rules,
      "draft.rules"
    );

  if (
    ruleValues.length >
    MAX_RULES
  ) {
    throw new Error(
      `draft.rules cannot contain more than ${MAX_RULES} rules.`
    );
  }

  const ruleIds =
    new Set();

  const normalizedRules =
    ruleValues.map(
      (rule, index) => {
        const normalizedRule =
          validateRule(
            rule,
            index,
            exampleIds
          );

        if (
          ruleIds.has(
            normalizedRule.id
          )
        ) {
          throw new Error(
            `Duplicate rule id: ${normalizedRule.id}.`
          );
        }

        ruleIds.add(
          normalizedRule.id
        );

        return normalizedRule;
      }
    );

  return {
    version,
    task:
      draftTask,
    source: {
      exampleIds:
        [...sourceExampleIdValues]
    },
    rules:
      normalizedRules
  };
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

async function draftQualityContract(
  options = {}
) {
  const optionDescriptors =
    captureDataProperties(
      options,
      "draftQualityContract options"
    );

  const task =
    readDataProperty(
      optionDescriptors,
      "task"
    );

  const examples =
    readDataProperty(
      optionDescriptors,
      "examples"
    );

  const generator =
    readDataProperty(
      optionDescriptors,
      "generator"
    );

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

  const descriptors =
    captureDataProperties(
      decision,
      label
    );

  const ruleId =
    readDataProperty(
      descriptors,
      "ruleId"
    );

  const decisionType =
    readDataProperty(
      descriptors,
      "decision"
    );

  const statement =
    readDataProperty(
      descriptors,
      "statement"
    );

  requireNonEmptyString(
    ruleId,
    `${label}.ruleId`
  );

  if (
    !CONFIRMATION_DECISIONS.has(
      decisionType
    )
  ) {
    throw new Error(
      `${label}.decision must be accept, edit, or reject.`
    );
  }

  if (
    decisionType ===
    "edit"
  ) {
    requireNonEmptyString(
      statement,
      `${label}.statement`
    );
  }

  return {
    ruleId,
    decision:
      decisionType,
    ...(decisionType === "edit"
      ? {
          statement
        }
      : {})
  };
}

function confirmQualityContract(
  options = {}
) {
  const optionDescriptors =
    captureDataProperties(
      options,
      "confirmQualityContract options"
    );

  const draft =
    readDataProperty(
      optionDescriptors,
      "draft"
    );

  const decisions =
    readDataProperty(
      optionDescriptors,
      "decisions"
    );

  const validatedDraft =
    validateDraftForConfirmation(
      draft
    );

  const decisionValues =
    captureArrayValues(
      decisions,
      "decisions"
    );

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

  decisionValues.forEach(
    (decision, index) => {
      const normalizedDecision =
        validateConfirmationDecision(
          decision,
          index
        );

      if (
        !rulesById.has(
          normalizedDecision.ruleId
        )
      ) {
        throw new Error(
          `Unknown rule id: ${normalizedDecision.ruleId}.`
        );
      }

      if (
        decisionsByRuleId.has(
          normalizedDecision.ruleId
        )
      ) {
        throw new Error(
          `Duplicate decision for rule id: ${normalizedDecision.ruleId}.`
        );
      }

      decisionsByRuleId.set(
        normalizedDecision.ruleId,
        normalizedDecision
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
