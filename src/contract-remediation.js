"use strict";

const {
  types: utilTypes
} = require("node:util");

const {
  snapshotAiData
} = require("./ai-data");

const {
  runContractAttacks
} = require("./contract-attacks");

const CONTRACT_VERSION = 1;
const PROTECTION_VERSION = 1;
const MAX_RULES = 7;

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

const SEVERITY_SCORES = Object.freeze({
  critical: 1,
  major: 0.7,
  minor: 0.4
});

const PROTECTION_GENERATOR_INSTRUCTIONS = [
  "You are proposing one evaluator protection intent for one confirmed-contract finding.",
  "",
  "The confirmed Quality Contract rule is authoritative.",
  "Do not add, remove, rewrite, or reprioritize Quality Contract rules.",
  "Propose one narrow protection for the selected finding and rule.",
  "Preserve unrelated correct behavior.",
  "Prefer a rule-level protection over blacklisting the exact bad output.",
  "Do not write JavaScript, functions, callbacks, ASTs, patches, shell commands, or executable code.",
  "Return declarative data only.",
  "Do not claim the protection has been proven effective.",
  "Do not claim the production model produced the finding.",
  "A human must confirm the protection intent before verification."
].join("\n");

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

function requireScore(
  value,
  label
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be a finite number between 0 and 1.`
    );
  }
}

function requirePlainObject(
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

  const prototype =
    Object.getPrototypeOf(value);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(
      `${label} must be a plain object.`
    );
  }
}

function requireOwn(
  value,
  key,
  label
) {
  if (
    !Object.prototype.hasOwnProperty.call(
      value,
      key
    )
  ) {
    throw new Error(
      `${label} must include ${key}.`
    );
  }
}

function requireExactKeys(
  value,
  expectedKeys,
  label
) {
  const actual =
    Object.keys(value).sort();
  const expected =
    [...expectedKeys].sort();

  if (
    actual.length !== expected.length ||
    actual.some(
      (key, index) =>
        key !== expected[index]
    )
  ) {
    throw new Error(
      `${label} contains unsupported fields.`
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

  requirePlainObject(
    rule,
    label
  );

  requireExactKeys(
    rule,
    [
      "id",
      "statement",
      "kind",
      "severity"
    ],
    label
  );

  requireNonEmptyString(
    rule.id,
    `${label} id`
  );

  if (ids.has(rule.id)) {
    throw new Error(
      `Duplicate Quality Contract rule id: ${rule.id}`
    );
  }

  ids.add(rule.id);

  requireNonEmptyString(
    rule.statement,
    `${label} statement`
  );

  if (!RULE_KINDS.has(rule.kind)) {
    throw new Error(
      `${label} kind must be one of: required, forbidden, conditional.`
    );
  }

  if (!SEVERITIES.has(rule.severity)) {
    throw new Error(
      `${label} severity must be one of: critical, major, minor.`
    );
  }

  return Object.freeze({
    id: rule.id,
    statement: rule.statement,
    kind: rule.kind,
    severity: rule.severity
  });
}

function validateConfirmedContract(
  input
) {
  const contract =
    snapshotAiData(
      input,
      "Quality Contract"
    );

  requirePlainObject(
    contract,
    "Quality Contract"
  );

  requireExactKeys(
    contract,
    [
      "version",
      "status",
      "task",
      "rules"
    ],
    "Quality Contract"
  );

  if (
    contract.version !==
      CONTRACT_VERSION
  ) {
    throw new Error(
      `Quality Contract version must be ${CONTRACT_VERSION}.`
    );
  }

  if (contract.status !== "confirmed") {
    throw new Error(
      'Quality Contract status must be "confirmed".'
    );
  }

  requireNonEmptyString(
    contract.task,
    "Quality Contract task"
  );

  if (!Array.isArray(contract.rules)) {
    throw new Error(
      "Quality Contract rules must be an array."
    );
  }

  if (
    contract.rules.length === 0 ||
    contract.rules.length > MAX_RULES
  ) {
    throw new Error(
      `Quality Contract must contain between 1 and ${MAX_RULES} active rules.`
    );
  }

  const ids = new Set();
  const rules = contract.rules.map(
    (rule, index) =>
      normalizeRule(
        rule,
        index,
        ids
      )
  );

  return Object.freeze({
    version: CONTRACT_VERSION,
    status: "confirmed",
    task: contract.task,
    rules: Object.freeze(rules)
  });
}

function getRuleById(
  contract,
  ruleId
) {
  return contract.rules.find(
    (rule) => rule.id === ruleId
  );
}

function assertRuleSnapshotMatches(
  rule,
  expectedRule,
  label
) {
  requirePlainObject(
    rule,
    `${label} rule`
  );

  requireExactKeys(
    rule,
    [
      "id",
      "statement",
      "kind",
      "severity"
    ],
    `${label} rule`
  );

  if (
    rule.id !== expectedRule.id ||
    rule.statement !== expectedRule.statement ||
    rule.kind !== expectedRule.kind ||
    rule.severity !== expectedRule.severity
  ) {
    throw new Error(
      `${label} rule must exactly match the confirmed Quality Contract rule.`
    );
  }
}

function validateGeneratedAttack(
  input,
  contract,
  label
) {
  const attack =
    snapshotAiData(
      input,
      label
    );

  requirePlainObject(
    attack,
    label
  );

  for (
    const key of [
      "id",
      "ruleId",
      "rule",
      "type",
      "description",
      "rationale",
      "output",
      "severity",
      "realism",
      "subtlety",
      "novelty",
      "fixability"
    ]
  ) {
    requireOwn(
      attack,
      key,
      label
    );
  }

  requireNonEmptyString(
    attack.id,
    `${label} id`
  );

  requireNonEmptyString(
    attack.ruleId,
    `${label} ruleId`
  );

  const rule =
    getRuleById(
      contract,
      attack.ruleId
    );

  if (rule === undefined) {
    throw new Error(
      `${label} references unknown Quality Contract rule id: ${attack.ruleId}`
    );
  }

  assertRuleSnapshotMatches(
    attack.rule,
    rule,
    label
  );

  requireNonEmptyString(
    attack.type,
    `${label} type`
  );

  requireNonEmptyString(
    attack.description,
    `${label} description`
  );

  requireNonEmptyString(
    attack.rationale,
    `${label} rationale`
  );

  if (
    attack.severity !==
      SEVERITY_SCORES[
        rule.severity
      ]
  ) {
    throw new Error(
      `${label} severity must match the confirmed Quality Contract rule.`
    );
  }

  for (
    const key of [
      "realism",
      "subtlety",
      "novelty",
      "fixability"
    ]
  ) {
    requireScore(
      attack[key],
      `${label} ${key}`
    );
  }

  const output =
    snapshotAiData(
      attack.output,
      `${label} output`
    );

  return Object.freeze({
    id: attack.id,
    ruleId: attack.ruleId,
    rule,
    type: attack.type,
    description: attack.description,
    rationale: attack.rationale,
    output,
    severity: attack.severity,
    realism: attack.realism,
    subtlety: attack.subtlety,
    novelty: attack.novelty,
    fixability: attack.fixability
  });
}

function validateAttackSet(
  input,
  contract
) {
  const attacks =
    snapshotAiData(
      input,
      "Contract remediation attack set"
    );

  if (!Array.isArray(attacks)) {
    throw new Error(
      "Contract remediation attacks must be an array."
    );
  }

  if (attacks.length === 0) {
    throw new Error(
      "Contract remediation attacks must contain at least one attack."
    );
  }

  const ids = new Set();

  const normalized = attacks.map(
    (attack, index) => {
      const result =
        validateGeneratedAttack(
          attack,
          contract,
          `Contract remediation attack at index ${index}`
        );

      if (ids.has(result.id)) {
        throw new Error(
          `Duplicate contract remediation attack id: ${result.id}`
        );
      }

      ids.add(result.id);
      return result;
    }
  );

  return Object.freeze(normalized);
}

async function invokeProtectionGenerator(
  generator,
  argumentsObject
) {
  if (typeof generator !== "function") {
    throw new Error(
      "Protection generator must be a function."
    );
  }

  const returned =
    Reflect.apply(
      generator,
      undefined,
      [argumentsObject]
    );

  const settled =
    utilTypes.isPromise(returned)
      ? await returned
      : returned;

  return snapshotAiData(
    settled,
    "Protection generator output"
  );
}

function validateProtectionGeneratorOutput(
  input,
  contract,
  finding
) {
  requirePlainObject(
    input,
    "Protection generator output"
  );

  requireExactKeys(
    input,
    [
      "version",
      "task",
      "sourceAttackId",
      "ruleId",
      "protection"
    ],
    "Protection generator output"
  );

  if (
    input.version !==
      PROTECTION_VERSION
  ) {
    throw new Error(
      `Protection generator output version must be ${PROTECTION_VERSION}.`
    );
  }

  if (input.task !== contract.task) {
    throw new Error(
      "Protection generator output task must exactly match the confirmed Quality Contract task."
    );
  }

  if (
    input.sourceAttackId !==
      finding.id
  ) {
    throw new Error(
      "Protection generator output sourceAttackId must exactly match the selected finding."
    );
  }

  if (
    input.ruleId !==
      finding.ruleId
  ) {
    throw new Error(
      "Protection generator output ruleId must exactly match the selected finding rule."
    );
  }

  requirePlainObject(
    input.protection,
    "Protection generator output protection"
  );

  requireExactKeys(
    input.protection,
    [
      "statement",
      "rationale"
    ],
    "Protection generator output protection"
  );

  requireNonEmptyString(
    input.protection.statement,
    "Protection statement"
  );

  requireNonEmptyString(
    input.protection.rationale,
    "Protection rationale"
  );

  return Object.freeze({
    statement:
      input.protection.statement,
    rationale:
      input.protection.rationale
  });
}

async function draftContractProtection(
  options = {}
) {
  requirePlainObject(
    options,
    "Contract protection draft options"
  );

  requireExactKeys(
    options,
    [
      "contract",
      "input",
      "expectedOutput",
      "attacks",
      "sourceAttackId",
      "generator"
    ],
    "Contract protection draft options"
  );

  requireNonEmptyString(
    options.sourceAttackId,
    "Contract protection sourceAttackId"
  );

  const contract =
    validateConfirmedContract(
      options.contract
    );

  const input =
    snapshotAiData(
      options.input,
      "Contract protection input"
    );

  const expectedOutput =
    snapshotAiData(
      options.expectedOutput,
      "Contract protection expectedOutput"
    );

  const attacks =
    validateAttackSet(
      options.attacks,
      contract
    );

  const finding =
    attacks.find(
      (attack) =>
        attack.id ===
          options.sourceAttackId
    );

  if (finding === undefined) {
    throw new Error(
      "sourceAttackId must identify an attack in the complete original attack set."
    );
  }

  const generatorArguments =
    snapshotAiData(
      {
        contract,
        input,
        expectedOutput,
        finding,
        instructions:
          PROTECTION_GENERATOR_INSTRUCTIONS
      },
      "Protection generator arguments"
    );

  const rawOutput =
    await invokeProtectionGenerator(
      options.generator,
      generatorArguments
    );

  const generatedProtection =
    validateProtectionGeneratorOutput(
      rawOutput,
      contract,
      finding
    );

  return snapshotAiData(
    {
      version:
        PROTECTION_VERSION,
      status: "draft",
      task: contract.task,
      contract,
      case: {
        input,
        expectedOutput
      },
      attacks,
      source: {
        attackId: finding.id,
        ruleId: finding.ruleId
      },
      rule: finding.rule,
      protection: {
        statement:
          generatedProtection.statement,
        rationale:
          generatedProtection.rationale
      }
    },
    "Contract protection draft"
  );
}

function validateBoundArtifact(
  input,
  expectedStatus,
  label
) {
  const artifact =
    snapshotAiData(
      input,
      label
    );

  requirePlainObject(
    artifact,
    label
  );

  requireExactKeys(
    artifact,
    [
      "version",
      "status",
      "task",
      "contract",
      "case",
      "attacks",
      "source",
      "rule",
      "protection"
    ],
    label
  );

  if (
    artifact.version !==
      PROTECTION_VERSION
  ) {
    throw new Error(
      `${label} version must be ${PROTECTION_VERSION}.`
    );
  }

  if (artifact.status !== expectedStatus) {
    throw new Error(
      `${label} status must be "${expectedStatus}".`
    );
  }

  const contract =
    validateConfirmedContract(
      artifact.contract
    );

  if (artifact.task !== contract.task) {
    throw new Error(
      `${label} task must match the bound Quality Contract task.`
    );
  }

  requirePlainObject(
    artifact.case,
    `${label} case`
  );

  requireExactKeys(
    artifact.case,
    ["input", "expectedOutput"],
    `${label} case`
  );

  const caseInput =
    snapshotAiData(
      artifact.case.input,
      `${label} case input`
    );

  const expectedOutput =
    snapshotAiData(
      artifact.case.expectedOutput,
      `${label} case expectedOutput`
    );

  const attacks =
    validateAttackSet(
      artifact.attacks,
      contract
    );

  requirePlainObject(
    artifact.source,
    `${label} source`
  );

  requireExactKeys(
    artifact.source,
    ["attackId", "ruleId"],
    `${label} source`
  );

  requireNonEmptyString(
    artifact.source.attackId,
    `${label} source attackId`
  );

  requireNonEmptyString(
    artifact.source.ruleId,
    `${label} source ruleId`
  );

  const finding = attacks.find(
    (attack) =>
      attack.id ===
        artifact.source.attackId
  );

  if (finding === undefined) {
    throw new Error(
      `${label} source attackId must exist in the bound attack set.`
    );
  }

  if (
    finding.ruleId !==
      artifact.source.ruleId
  ) {
    throw new Error(
      `${label} source ruleId must match the bound source attack.`
    );
  }

  assertRuleSnapshotMatches(
    artifact.rule,
    finding.rule,
    label
  );

  requirePlainObject(
    artifact.protection,
    `${label} protection`
  );

  if (expectedStatus === "draft") {
    requireExactKeys(
      artifact.protection,
      ["statement", "rationale"],
      `${label} protection`
    );
  } else {
    requireExactKeys(
      artifact.protection,
      [
        "statement",
        "rationale",
        "decision"
      ],
      `${label} protection`
    );
  }

  requireNonEmptyString(
    artifact.protection.statement,
    `${label} protection statement`
  );

  requireNonEmptyString(
    artifact.protection.rationale,
    `${label} protection rationale`
  );

  if (
    expectedStatus === "confirmed" &&
    artifact.protection.decision !== "accept" &&
    artifact.protection.decision !== "edit"
  ) {
    throw new Error(
      `${label} protection decision must be accept or edit.`
    );
  }

  return {
    artifact,
    contract,
    caseInput,
    expectedOutput,
    attacks,
    finding
  };
}

function validateProtectionDraft(
  input
) {
  return validateBoundArtifact(
    input,
    "draft",
    "Contract protection draft"
  );
}

function confirmContractProtection(
  options = {}
) {
  requirePlainObject(
    options,
    "Contract protection confirmation options"
  );

  requireExactKeys(
    options,
    ["draft", "decision"],
    "Contract protection confirmation options"
  );

  const validated =
    validateProtectionDraft(
      options.draft
    );

  const draft =
    validated.artifact;

  const decision =
    snapshotAiData(
      options.decision,
      "Contract protection decision"
    );

  requirePlainObject(
    decision,
    "Contract protection decision"
  );

  requireOwn(
    decision,
    "type",
    "Contract protection decision"
  );

  if (
    decision.type !== "accept" &&
    decision.type !== "edit" &&
    decision.type !== "reject"
  ) {
    throw new Error(
      "Contract protection decision type must be accept, edit, or reject."
    );
  }

  if (decision.type === "edit") {
    requireExactKeys(
      decision,
      ["type", "statement"],
      "Contract protection edit decision"
    );

    requireNonEmptyString(
      decision.statement,
      "Edited protection statement"
    );
  } else {
    requireExactKeys(
      decision,
      ["type"],
      "Contract protection decision"
    );
  }

  const statement =
    decision.type === "edit"
      ? decision.statement
      : draft.protection.statement;

  return snapshotAiData(
    {
      version:
        PROTECTION_VERSION,
      status:
        decision.type === "reject"
          ? "rejected"
          : "confirmed",
      task: draft.task,
      contract: draft.contract,
      case: draft.case,
      attacks: draft.attacks,
      source: draft.source,
      rule: draft.rule,
      protection: {
        statement,
        rationale:
          draft.protection.rationale,
        decision:
          decision.type
      }
    },
    "Contract protection confirmation"
  );
}

function validateConfirmedProtection(
  input
) {
  return validateBoundArtifact(
    input,
    "confirmed",
    "Confirmed contract protection"
  );
}

function buildReplayGeneratorOutput(
  contract,
  attacks
) {
  return snapshotAiData(
    {
      version: 1,
      task: contract.task,
      attacks: attacks.map(
        (attack) => ({
          id: attack.id,
          ruleId: attack.ruleId,
          type: attack.type,
          description:
            attack.description,
          rationale:
            attack.rationale,
          mutatedOutput:
            attack.output,
          scores: {
            realism:
              attack.realism,
            subtlety:
              attack.subtlety,
            novelty:
              attack.novelty,
            fixability:
              attack.fixability
          }
        })
      )
    },
    "Contract remediation replay generator output"
  );
}

function attackIdsByState(
  attackResult,
  survived
) {
  const ids = new Set();

  for (const result of attackResult.results) {
    if (result.survived === survived) {
      ids.add(result.id);
    }
  }

  return ids;
}

function sortedIntersection(
  left,
  right
) {
  return [...left]
    .filter(
      (value) => right.has(value)
    )
    .sort();
}

function sortedDifference(
  left,
  right
) {
  return [...left]
    .filter(
      (value) => !right.has(value)
    )
    .sort();
}

async function verifyContractProtection(
  options = {}
) {
  requirePlainObject(
    options,
    "Contract protection verification options"
  );

  requireExactKeys(
    options,
    [
      "protection",
      "evaluator",
      "improvedEvaluator"
    ],
    "Contract protection verification options"
  );

  if (typeof options.evaluator !== "function") {
    throw new Error(
      "Evaluator must be a function."
    );
  }

  if (
    typeof options.improvedEvaluator !==
      "function"
  ) {
    throw new Error(
      "Improved evaluator must be a function."
    );
  }

  const validated =
    validateConfirmedProtection(
      options.protection
    );

  const artifact =
    validated.artifact;
  const contract =
    validated.contract;
  const input =
    validated.caseInput;
  const expectedOutput =
    validated.expectedOutput;
  const attacks =
    validated.attacks;
  const finding =
    validated.finding;

  const replayOutput =
    buildReplayGeneratorOutput(
      contract,
      attacks
    );

  function replayGenerator() {
    return replayOutput;
  }

  const baseline =
    await runContractAttacks({
      contract,
      input,
      expectedOutput,
      evaluator:
        options.evaluator,
      generator:
        replayGenerator
    });

  const baselineSurvivors =
    attackIdsByState(
      baseline.attack,
      true
    );

  const baselineCaught =
    attackIdsByState(
      baseline.attack,
      false
    );

  const sourceFindingReproduced =
    baselineSurvivors.has(
      finding.id
    );

  let after;

  try {
    after =
      await runContractAttacks({
        contract,
        input,
        expectedOutput,
        evaluator:
          options.improvedEvaluator,
        generator:
          replayGenerator
      });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "Evaluator must pass expectedOutput before contract attacks can run."
    ) {
      return snapshotAiData(
        {
          version:
            PROTECTION_VERSION,
          task: contract.task,
          sourceAttackId:
            finding.id,
          ruleId:
            finding.ruleId,
          protection: artifact,
          baseline: {
            attack:
              baseline.attack,
            topFinding:
              baseline.topFinding
          },
          after: null,
          sourceFindingReproduced,
          sourceFindingCaught: false,
          positiveControlPassed: false,
          improvement: 0,
          eliminatedAttackIds: [],
          regressionAttackIds: [],
          verificationPassed: false,
          state:
            "improved-positive-control-failed"
        },
        "Contract protection verification result"
      );
    }

    throw error;
  }

  const afterSurvivors =
    attackIdsByState(
      after.attack,
      true
    );

  const sourceFindingCaught =
    sourceFindingReproduced &&
    !afterSurvivors.has(
      finding.id
    );

  const eliminatedAttackIds =
    sortedDifference(
      baselineSurvivors,
      afterSurvivors
    );

  const regressionAttackIds =
    sortedIntersection(
      baselineCaught,
      afterSurvivors
    );

  const improvement =
    baseline.attack.survivors.length -
    after.attack.survivors.length;

  const verificationPassed =
    sourceFindingReproduced &&
    sourceFindingCaught &&
    regressionAttackIds.length === 0;

  const state =
    !sourceFindingReproduced
      ? "source-finding-not-reproducible"
      : verificationPassed
        ? "verified"
        : sourceFindingCaught
          ? "regression-detected"
          : "source-finding-still-survives";

  return snapshotAiData(
    {
      version:
        PROTECTION_VERSION,
      task: contract.task,
      sourceAttackId:
        finding.id,
      ruleId:
        finding.ruleId,
      protection: artifact,
      baseline: {
        attack:
          baseline.attack,
        topFinding:
          baseline.topFinding
      },
      after: {
        attack:
          after.attack,
        topFinding:
          after.topFinding
      },
      sourceFindingReproduced,
      sourceFindingCaught,
      positiveControlPassed: true,
      improvement,
      eliminatedAttackIds,
      regressionAttackIds,
      verificationPassed,
      state
    },
    "Contract protection verification result"
  );
}

module.exports = {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
};
