"use strict";

const {
  types: utilTypes,
  isDeepStrictEqual
} = require("node:util");

const {
  attack
} = require("./engine");

const {
  cloneAiData,
  snapshotAiData
} = require("./ai-data");

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const getPrototypeOf =
  Object.getPrototypeOf;

const ownKeys =
  Reflect.ownKeys;

const reflectApply =
  Reflect.apply;

const objectFreeze =
  Object.freeze;

const promisePrototype =
  Promise.prototype;

const promiseConstructor =
  Promise;

const hasOwnProperty =
  Object.prototype.hasOwnProperty;

const MAX_RULES =
  7;

const MAX_ATTACKS =
  20;

const CONTRACT_VERSION =
  1;

const GENERATOR_VERSION =
  1;

const RULE_KINDS =
  new Set([
    "required",
    "forbidden",
    "conditional"
  ]);

const SEVERITIES =
  new Set([
    "critical",
    "major",
    "minor"
  ]);

const SEVERITY_SCORES =
  objectFreeze({
    critical: 1.0,
    major: 0.7,
    minor: 0.4
  });

const SCORE_KEYS =
  objectFreeze([
    "realism",
    "subtlety",
    "novelty",
    "fixability"
  ]);

const GENERATOR_INSTRUCTIONS = [
  "You are generating candidate bad outputs for one eval case.",
  "",
  "Use only the confirmed Quality Contract rules.",
  "Only target rules that are applicable to the current input.",
  "Prefer one primary quality failure per candidate.",
  "Preserve unrelated correct information.",
  "Make the smallest plausible change needed to violate the rule.",
  "Prefer realistic, subtle failures over absurd failures.",
  "Do not invent new quality rules.",
  "Do not change the task.",
  "Do not produce JavaScript functions or executable mutation code.",
  "Return declarative candidate outputs only.",
  "Every attack must cite one confirmed rule ID.",
  "Explain why the candidate is intended to violate that rule.",
  "Use zero attacks when no strong attack is supported.",
  "Prefer fewer strong attacks over many speculative attacks."
].join("\n");

function requireNonEmptyString(
  value,
  label
) {
  if (
    typeof value !==
      "string" ||
    value.trim() === ""
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }
}

function requireScore(
  value,
  label
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be a finite number between 0 and 1.`
    );
  }
}

function hasOwn(
  value,
  key
) {
  return reflectApply(
    hasOwnProperty,
    value,
    [
      key
    ]
  );
}

function captureOptions(
  value
) {
  const label =
    "Contract attack options";

  if (
    value === null ||
    typeof value !==
      "object" ||
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

  const prototype =
    getPrototypeOf(value);

  if (
    prototype !==
      Object.prototype &&
    prototype !== null
  ) {
    throw new Error(
      `${label} must be a plain object.`
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
    if (
      typeof key ===
        "symbol"
    ) {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

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

    if (
      !descriptor.enumerable
    ) {
      throw new Error(
        `${label} must not contain non-enumerable own properties.`
      );
    }
  }

  return descriptors;
}

function readCapturedValue(
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

function requirePlainSnapshotObject(
  value,
  label
) {
  if (
    value === null ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }
}

function normalizeRule(
  rule,
  index,
  ids
) {
  const label =
    `Quality Contract rule at index ${index}`;

  requirePlainSnapshotObject(
    rule,
    label
  );

  const id =
    rule.id;

  const statement =
    rule.statement;

  const kind =
    rule.kind;

  const severity =
    rule.severity;

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (
    ids.has(id)
  ) {
    throw new Error(
      `Duplicate Quality Contract rule id: ${id}`
    );
  }

  ids.add(id);

  requireNonEmptyString(
    statement,
    `${label} statement`
  );

  if (
    typeof kind !==
      "string" ||
    !RULE_KINDS.has(kind)
  ) {
    throw new Error(
      `${label} kind must be one of: required, forbidden, conditional.`
    );
  }

  if (
    typeof severity !==
      "string" ||
    !SEVERITIES.has(
      severity
    )
  ) {
    throw new Error(
      `${label} severity must be one of: critical, major, minor.`
    );
  }

  return objectFreeze({
    id,
    statement,
    kind,
    severity
  });
}

function validateConfirmedContract(
  contract
) {
  const snapshot =
    snapshotAiData(
      contract,
      "Quality Contract"
    );

  requirePlainSnapshotObject(
    snapshot,
    "Quality Contract"
  );

  if (
    snapshot.version !==
      CONTRACT_VERSION
  ) {
    throw new Error(
      `Quality Contract version must be ${CONTRACT_VERSION}.`
    );
  }

  if (
    snapshot.status !==
      "confirmed"
  ) {
    if (
      snapshot.status ===
        "no-active-rules"
    ) {
      throw new Error(
        "Quality Contract must contain active confirmed rules before contract attacks can run."
      );
    }

    throw new Error(
      'Quality Contract status must be "confirmed".'
    );
  }

  requireNonEmptyString(
    snapshot.task,
    "Quality Contract task"
  );

  if (
    !Array.isArray(
      snapshot.rules
    )
  ) {
    throw new Error(
      "Quality Contract rules must be an array."
    );
  }

  if (
    snapshot.rules.length ===
      0
  ) {
    throw new Error(
      "A confirmed Quality Contract must contain at least one active rule."
    );
  }

  if (
    snapshot.rules.length >
      MAX_RULES
  ) {
    throw new Error(
      `Quality Contract must not contain more than ${MAX_RULES} active rules.`
    );
  }

  const ids =
    new Set();

  const rules =
    snapshot.rules.map(
      (
        rule,
        index
      ) =>
        normalizeRule(
          rule,
          index,
          ids
        )
    );

  return objectFreeze({
    version:
      CONTRACT_VERSION,

    status:
      "confirmed",

    task:
      snapshot.task,

    rules:
      objectFreeze(
        rules
      )
  });
}

function requireTrustedCallbacks(
  evaluator,
  generator
) {
  if (
    typeof evaluator !==
      "function"
  ) {
    throw new Error(
      "Evaluator must be a function."
    );
  }

  if (
    typeof generator !==
      "function"
  ) {
    throw new Error(
      "Generator must be a function."
    );
  }
}

function createSafeEvaluator(
  evaluator
) {
  return function safeEvaluator(
    output
  ) {
    const result =
      reflectApply(
        evaluator,
        undefined,
        [
          output
        ]
      );

    if (
      utilTypes.isPromise(
        result
      )
    ) {
      throw new Error(
        "Async checks are not supported by this deterministic engine."
      );
    }

    if (
      typeof result !==
        "boolean"
    ) {
      throw new Error(
        "Evaluator must return a boolean."
      );
    }

    return result;
  };
}

function runPositiveControl(
  evaluator,
  expectedOutput
) {
  const baselineOutput =
    snapshotAiData(
      expectedOutput,
      "Positive-control expected output"
    );

  const baselineMutation = {
    id:
      "__gotcha_contract_attack_baseline__",

    type:
      "positive-control",

    description:
      "Known-good expected output.",

    output:
      baselineOutput,

    severity:
      0,

    realism:
      0,

    subtlety:
      0,

    novelty:
      0,

    fixability:
      0
  };

  const baseline =
    attack(
      evaluator,
      [
        baselineMutation
      ]
    );

  const result =
    baseline.results[0];

  if (
    result === undefined ||
    result.survived !== true
  ) {
    throw new Error(
      "Evaluator must pass expectedOutput before contract attacks can run."
    );
  }

  return true;
}

function buildGeneratorArguments(
  contract,
  input,
  expectedOutput
) {
  return {
    contract:
      cloneAiData(
        contract,
        "Generator contract"
      ),

    input:
      cloneAiData(
        input,
        "Generator input"
      ),

    expectedOutput:
      cloneAiData(
        expectedOutput,
        "Generator expected output"
      ),

    instructions:
      GENERATOR_INSTRUCTIONS
  };
}

function requireSafeNativeGeneratorPromise(
  value
) {
  if (
    getPrototypeOf(value) !==
      promisePrototype
  ) {
    throw new Error(
      "Generator native Promise must use the standard Promise prototype."
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  if (
    hasOwn(
      descriptors,
      "constructor"
    )
  ) {
    throw new Error(
      "Generator native Promise must not shadow constructor."
    );
  }

  if (
    hasOwn(
      descriptors,
      "then"
    )
  ) {
    throw new Error(
      "Generator native Promise must not shadow then."
    );
  }

  const prototypeDescriptors =
    getOwnPropertyDescriptors(
      promisePrototype
    );

  if (
    !hasOwn(
      prototypeDescriptors,
      "constructor"
    )
  ) {
    throw new Error(
      "Promise prototype constructor integrity check failed."
    );
  }

  const inheritedConstructor =
    prototypeDescriptors.constructor;

  if (
    "get" in
      inheritedConstructor ||
    "set" in
      inheritedConstructor ||
    inheritedConstructor.value !==
      promiseConstructor
  ) {
    throw new Error(
      "Promise prototype constructor integrity check failed."
    );
  }
}

function invokeGenerator(
  generator,
  argumentsObject
) {
  const returned =
    reflectApply(
      generator,
      undefined,
      [
        argumentsObject
      ]
    );

  const isNativePromise =
    utilTypes.isPromise(
      returned
    );

  if (
    isNativePromise
  ) {
    requireSafeNativeGeneratorPromise(
      returned
    );
  }

  return objectFreeze({
    returned,
    isNativePromise
  });
}

function normalizeGeneratorAttack(
  attackCandidate,
  index,
  attackIds,
  ruleById
) {
  const label =
    `Generated attack at index ${index}`;

  requirePlainSnapshotObject(
    attackCandidate,
    label
  );

  const id =
    attackCandidate.id;

  const ruleId =
    attackCandidate.ruleId;

  const type =
    attackCandidate.type;

  const description =
    attackCandidate.description;

  const rationale =
    attackCandidate.rationale;

  const scores =
    attackCandidate.scores;

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (
    attackIds.has(id)
  ) {
    throw new Error(
      `Duplicate generated attack id: ${id}`
    );
  }

  attackIds.add(id);

  requireNonEmptyString(
    ruleId,
    `${label} ruleId`
  );

  const rule =
    ruleById.get(
      ruleId
    );

  if (
    rule === undefined
  ) {
    throw new Error(
      `${label} references unknown Quality Contract rule id: ${ruleId}`
    );
  }

  requireNonEmptyString(
    type,
    `${label} type`
  );

  requireNonEmptyString(
    description,
    `${label} description`
  );

  requireNonEmptyString(
    rationale,
    `${label} rationale`
  );

  if (
    !hasOwn(
      attackCandidate,
      "mutatedOutput"
    )
  ) {
    throw new Error(
      `${label} must include mutatedOutput.`
    );
  }

  requirePlainSnapshotObject(
    scores,
    `${label} scores`
  );

  const normalizedScores =
    {};

  for (
    const scoreKey of
      SCORE_KEYS
  ) {
    const score =
      scores[
        scoreKey
      ];

    requireScore(
      score,
      `${label} ${scoreKey}`
    );

    normalizedScores[
      scoreKey
    ] = score;
  }

  const mutatedOutput =
    snapshotAiData(
      attackCandidate
        .mutatedOutput,
      `${label} mutatedOutput`
    );

  return {
    index,

    id,

    ruleId,

    rule,

    type,

    description,

    rationale,

    mutatedOutput,

    scores:
      objectFreeze(
        normalizedScores
      )
  };
}

function validateGeneratorOutput(
  rawOutput,
  contract
) {
  const snapshot =
    snapshotAiData(
      rawOutput,
      "Generator output"
    );

  requirePlainSnapshotObject(
    snapshot,
    "Generator output"
  );

  if (
    snapshot.version !==
      GENERATOR_VERSION
  ) {
    throw new Error(
      `Generator output version must be ${GENERATOR_VERSION}.`
    );
  }

  requireNonEmptyString(
    snapshot.task,
    "Generator output task"
  );

  if (
    snapshot.task !==
      contract.task
  ) {
    throw new Error(
      "Generator output task must exactly match the confirmed Quality Contract task."
    );
  }

  if (
    !Array.isArray(
      snapshot.attacks
    )
  ) {
    throw new Error(
      "Generator output attacks must be an array."
    );
  }

  if (
    snapshot.attacks.length >
      MAX_ATTACKS
  ) {
    throw new Error(
      `Generator output must not contain more than ${MAX_ATTACKS} attacks.`
    );
  }

  const ruleById =
    new Map(
      contract.rules.map(
        (rule) => [
          rule.id,
          rule
        ]
      )
    );

  const attackIds =
    new Set();

  const attacks =
    snapshot.attacks.map(
      (
        attackCandidate,
        index
      ) =>
        normalizeGeneratorAttack(
          attackCandidate,
          index,
          attackIds,
          ruleById
        )
    );

  return objectFreeze({
    version:
      GENERATOR_VERSION,

    task:
      snapshot.task,

    attacks:
      objectFreeze(
        attacks
      )
  });
}

function compileGeneratedAttack(
  candidate
) {
  const rule =
    candidate.rule;

  const severity =
    SEVERITY_SCORES[
      rule.severity
    ];

  const trustedRule =
    objectFreeze({
      id:
        rule.id,

      statement:
        rule.statement,

      kind:
        rule.kind,

      severity:
        rule.severity
    });

  return {
    id:
      candidate.id,

    ruleId:
      candidate.ruleId,

    rule:
      trustedRule,

    type:
      candidate.type,

    description:
      candidate.description,

    rationale:
      candidate.rationale,

    output:
      snapshotAiData(
        candidate
          .mutatedOutput,
        `Generated attack ${candidate.id} output`
      ),

    severity,

    realism:
      candidate.scores
        .realism,

    subtlety:
      candidate.scores
        .subtlety,

    novelty:
      candidate.scores
        .novelty,

    fixability:
      candidate.scores
        .fixability
  };
}

function findDuplicateAttack(
  retained,
  candidate
) {
  return retained.find(
    (existing) =>
      existing.ruleId ===
        candidate.ruleId &&
      isDeepStrictEqual(
        existing.mutatedOutput,
        candidate.mutatedOutput
      )
  );
}

function filterGeneratedAttacks(
  validatedAttacks,
  expectedOutput
) {
  const retained = [];

  const discarded = [];

  for (
    const candidate of
      validatedAttacks
  ) {
    if (
      isDeepStrictEqual(
        candidate.mutatedOutput,
        expectedOutput
      )
    ) {
      discarded.push(
        objectFreeze({
          id:
            candidate.id,

          ruleId:
            candidate.ruleId,

          reason:
            "unchanged-output"
        })
      );

      continue;
    }

    const duplicate =
      findDuplicateAttack(
        retained,
        candidate
      );

    if (
      duplicate !==
        undefined
    ) {
      discarded.push(
        objectFreeze({
          id:
            candidate.id,

          ruleId:
            candidate.ruleId,

          reason:
            "duplicate-attack",

          duplicateOf:
            duplicate.id
        })
      );

      continue;
    }

    retained.push(
      candidate
    );
  }

  return {
    retained:
      objectFreeze(
        retained
      ),

    discarded:
      objectFreeze(
        discarded
      )
  };
}

function compileAllGeneratedAttacks(
  retained
) {
  return retained.map(
    (candidate) =>
      compileGeneratedAttack(
        candidate
      )
  );
}

function buildEmptyAttackResult() {
  return {
    results: [],
    caught: [],
    survivors: []
  };
}

async function runContractAttacks(
  options = {}
) {
  const optionDescriptors =
    captureOptions(
      options
    );

  const contractInput =
    readCapturedValue(
      optionDescriptors,
      "contract"
    );

  const input =
    readCapturedValue(
      optionDescriptors,
      "input"
    );

  const expectedOutputInput =
    readCapturedValue(
      optionDescriptors,
      "expectedOutput"
    );

  const evaluator =
    readCapturedValue(
      optionDescriptors,
      "evaluator"
    );

  const generator =
    readCapturedValue(
      optionDescriptors,
      "generator"
    );

  requireTrustedCallbacks(
    evaluator,
    generator
  );

  const safeEvaluator =
    createSafeEvaluator(
      evaluator
    );

  if (
    !hasOwn(
      optionDescriptors,
      "input"
    )
  ) {
    throw new Error(
      "Contract attack options must include input."
    );
  }

  if (
    !hasOwn(
      optionDescriptors,
      "expectedOutput"
    )
  ) {
    throw new Error(
      "Contract attack options must include expectedOutput."
    );
  }

  if (
    !hasOwn(
      optionDescriptors,
      "contract"
    )
  ) {
    throw new Error(
      "Contract attack options must include contract."
    );
  }

  const contract =
    validateConfirmedContract(
      contractInput
    );

  const validatedInput =
    snapshotAiData(
      input,
      "Contract attack input"
    );

  const expectedOutput =
    snapshotAiData(
      expectedOutputInput,
      "Contract attack expectedOutput"
    );

  runPositiveControl(
    safeEvaluator,
    expectedOutput
  );

  const generatorArguments =
    buildGeneratorArguments(
      contract,
      validatedInput,
      expectedOutput
    );

  const generatorInvocation =
    invokeGenerator(
      generator,
      generatorArguments
    );

  const rawGeneratorOutput =
    generatorInvocation
      .isNativePromise
      ? await generatorInvocation
          .returned
      : generatorInvocation
          .returned;

  const generated =
    validateGeneratorOutput(
      rawGeneratorOutput,
      contract
    );

  const filtered =
    filterGeneratedAttacks(
      generated.attacks,
      expectedOutput
    );

  const generatedAttacks =
    compileAllGeneratedAttacks(
      filtered.retained
    );

  const attackResult =
    generatedAttacks.length ===
      0
      ? buildEmptyAttackResult()
      : attack(
          safeEvaluator,
          generatedAttacks
        );

  const topFinding =
    attackResult
      .survivors[0] ||
    null;

  return {
    version: 1,

    task:
      contract.task,

    baselinePassed:
      true,

    generatedAttacks,

    discardedAttacks:
      filtered.discarded,

    attack:
      attackResult,

    topFinding
  };
}

module.exports = {
  runContractAttacks
};
