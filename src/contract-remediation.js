"use strict";

const {
  types: utilTypes
} = require("node:util");

const CapturedPromise = Promise;
const CapturedTypeError = TypeError;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getPrototypeOf = Object.getPrototypeOf;
const isExtensible = Object.isExtensible;
const objectIs = Object.is;
const defineProperty = Object.defineProperty;
const ownKeys = Reflect.ownKeys;
const reflectApply = Reflect.apply;
const arrayIsArray = Array.isArray;
const stringTrim = String.prototype.trim;
const numberIsFinite = Number.isFinite;
const jsonStringify = JSON.stringify;
const jsonParse = JSON.parse;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const objectPrototypeParent = getPrototypeOf(objectPrototype);
const bufferIsBuffer = Buffer.isBuffer;

const mandatoryBrandProbeNames = [
  "isDate",
  "isRegExp",
  "isMap",
  "isSet",
  "isWeakMap",
  "isWeakSet",
  "isPromise",
  "isNativeError",
  "isAnyArrayBuffer",
  "isDataView",
  "isTypedArray",
  "isBoxedPrimitive",
  "isArgumentsObject",
  "isGeneratorObject",
  "isModuleNamespaceObject",
  "isMapIterator",
  "isSetIterator",
  "isExternal"
];

const mandatoryBrandProbes = [];
let wireAuthorityAvailable =
  typeof utilTypes.isProxy === "function" &&
  typeof bufferIsBuffer === "function";

for (
  let index = 0;
  index < mandatoryBrandProbeNames.length;
  index += 1
) {
  const probe = utilTypes[mandatoryBrandProbeNames[index]];
  mandatoryBrandProbes.push(probe);

  if (typeof probe !== "function") {
    wireAuthorityAvailable = false;
  }
}

function boundaryError() {
  return new CapturedTypeError(
    "Invalid M10 contract-remediation boundary."
  );
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    reflectApply(
      stringTrim,
      value,
      []
    ).length > 0
  );
}

function isWireNumber(value) {
  return (
    typeof value === "number" &&
    numberIsFinite(value) === true &&
    objectIs(value, -0) === false
  );
}

function hasForbiddenBrand(value) {
  for (
    let index = 0;
    index < mandatoryBrandProbes.length;
    index += 1
  ) {
    if (mandatoryBrandProbes[index](value) === true) {
      return true;
    }
  }

  return bufferIsBuffer(value) === true;
}

function assertPrototypeBaseline() {
  if (
    getPrototypeOf(objectPrototype) !== objectPrototypeParent ||
    getPrototypeOf(arrayPrototype) !== objectPrototype
  ) {
    throw boundaryError();
  }

  const objectDescriptors =
    getOwnPropertyDescriptors(objectPrototype);
  const arrayDescriptors =
    getOwnPropertyDescriptors(arrayPrototype);

  if (
    objectDescriptors.toJSON !== undefined ||
    arrayDescriptors.toJSON !== undefined
  ) {
    throw boundaryError();
  }
}

function ordinaryDescriptor(descriptor) {
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.writable === true &&
    descriptor.enumerable === true &&
    descriptor.configurable === true
  );
}

function cloneCapturedValue(value, seen) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!isWireNumber(value)) {
      throw boundaryError();
    }

    return value;
  }

  if (
    typeof value !== "object" ||
    utilTypes.isProxy(value) === true
  ) {
    throw boundaryError();
  }

  if (seen.has(value)) {
    throw boundaryError();
  }
  seen.add(value);

  if (arrayIsArray(value)) {
    if (
      getPrototypeOf(value) !== arrayPrototype ||
      isExtensible(value) !== true
    ) {
      throw boundaryError();
    }

    const descriptors = getOwnPropertyDescriptors(value);
    const keys = ownKeys(descriptors);
    const lengthDescriptor = descriptors.length;

    if (
      lengthDescriptor === undefined ||
      lengthDescriptor.writable !== true ||
      lengthDescriptor.enumerable !== false ||
      lengthDescriptor.configurable !== false ||
      !Number.isInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      keys.length !== lengthDescriptor.value + 1
    ) {
      throw boundaryError();
    }

    const copy = [];

    for (
      let index = 0;
      index < lengthDescriptor.value;
      index += 1
    ) {
      const key = String(index);
      const descriptor = descriptors[key];

      if (!ordinaryDescriptor(descriptor)) {
        throw boundaryError();
      }

      copy[index] = cloneCapturedValue(
        descriptor.value,
        seen
      );
    }

    return copy;
  }

  if (
    hasForbiddenBrand(value) ||
    getPrototypeOf(value) !== objectPrototype ||
    isExtensible(value) !== true
  ) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  const copy = {};

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];
    const descriptor = descriptors[key];

    if (
      typeof key !== "string" ||
      !ordinaryDescriptor(descriptor)
    ) {
      throw boundaryError();
    }

    defineProperty(
      copy,
      key,
      {
        value: cloneCapturedValue(
          descriptor.value,
          seen
        ),
        writable: true,
        enumerable: true,
        configurable: true
      }
    );
  }

  return copy;
}

function captureDraftInvocation(options) {
  if (!wireAuthorityAvailable) {
    throw boundaryError();
  }

  if (
    options === null ||
    typeof options !== "object" ||
    arrayIsArray(options) ||
    utilTypes.isProxy(options) === true ||
    getPrototypeOf(options) !== objectPrototype ||
    isExtensible(options) !== true
  ) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(options);
  const keys = ownKeys(descriptors);
  const expectedKeys = [
    "experiment",
    "sourceAttackId",
    "proposal"
  ];

  if (keys.length !== expectedKeys.length) {
    throw boundaryError();
  }

  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    const descriptor = descriptors[expectedKeys[index]];

    if (!ordinaryDescriptor(descriptor)) {
      throw boundaryError();
    }
  }

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    if (!expectedKeys.includes(keys[index])) {
      throw boundaryError();
    }
  }

  const seen = new Set([options]);

  return {
    experiment: cloneCapturedValue(
      descriptors.experiment.value,
      seen
    ),
    sourceAttackId:
      descriptors.sourceAttackId.value,
    proposal: cloneCapturedValue(
      descriptors.proposal.value,
      seen
    )
  };
}

function exactRecord(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value) ||
    getPrototypeOf(value) !== objectPrototype ||
    isExtensible(value) !== true
  ) {
    return false;
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const own = ownKeys(descriptors);

  if (own.length !== keys.length) {
    return false;
  }

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    if (!ordinaryDescriptor(descriptors[keys[index]])) {
      return false;
    }
  }

  for (
    let index = 0;
    index < own.length;
    index += 1
  ) {
    if (
      typeof own[index] !== "string" ||
      !keys.includes(own[index])
    ) {
      return false;
    }
  }

  return true;
}

function validateRule(rule) {
  return (
    exactRecord(
      rule,
      ["id", "statement", "kind", "severity"]
    ) &&
    isNonEmptyString(rule.id) &&
    isNonEmptyString(rule.statement) &&
    ["required", "forbidden", "conditional"]
      .includes(rule.kind) &&
    ["critical", "major", "minor"]
      .includes(rule.severity)
  );
}

function validateExperiment(experiment) {
  if (
    !exactRecord(
      experiment,
      [
        "version",
        "kind",
        "replayable",
        "task",
        "contract",
        "case",
        "attacks",
        "baseline"
      ]
    ) ||
    experiment.version !== 1 ||
    experiment.kind !== "contract-attack-experiment" ||
    experiment.replayable !== true ||
    !isNonEmptyString(experiment.task)
  ) {
    throw boundaryError();
  }

  const contract = experiment.contract;

  if (
    !exactRecord(
      contract,
      ["version", "status", "task", "rules"]
    ) ||
    contract.version !== 1 ||
    contract.status !== "confirmed" ||
    contract.task !== experiment.task ||
    !arrayIsArray(contract.rules) ||
    contract.rules.length < 1 ||
    contract.rules.length > 7
  ) {
    throw boundaryError();
  }

  const ruleIds = new Set();

  for (
    let index = 0;
    index < contract.rules.length;
    index += 1
  ) {
    const rule = contract.rules[index];

    if (
      !validateRule(rule) ||
      ruleIds.has(rule.id)
    ) {
      throw boundaryError();
    }

    ruleIds.add(rule.id);
  }

  if (
    !exactRecord(
      experiment.case,
      ["input", "expectedOutput", "replay"]
    ) ||
    !exactRecord(
      experiment.case.replay,
      ["version", "kind", "strategy"]
    ) ||
    experiment.case.replay.version !== 1 ||
    experiment.case.replay.kind !== "m8-evaluator-case" ||
    experiment.case.replay.strategy !== "json-wire-v1"
  ) {
    throw boundaryError();
  }

  if (!arrayIsArray(experiment.attacks)) {
    throw boundaryError();
  }

  const attackIds = new Set();
  const attacksById = new Map();

  for (
    let index = 0;
    index < experiment.attacks.length;
    index += 1
  ) {
    const attack = experiment.attacks[index];

    if (
      !exactRecord(
        attack,
        [
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
      ) ||
      !isNonEmptyString(attack.id) ||
      !isNonEmptyString(attack.ruleId) ||
      !isNonEmptyString(attack.type) ||
      !isNonEmptyString(attack.description) ||
      !isNonEmptyString(attack.rationale) ||
      !validateRule(attack.rule) ||
      attack.ruleId !== attack.rule.id ||
      attackIds.has(attack.id)
    ) {
      throw boundaryError();
    }

    const matchingRule = contract.rules.find(
      (rule) => rule.id === attack.ruleId
    );

    if (
      matchingRule === undefined ||
      matchingRule.statement !== attack.rule.statement ||
      matchingRule.kind !== attack.rule.kind ||
      matchingRule.severity !== attack.rule.severity
    ) {
      throw boundaryError();
    }

    const expectedSeverity =
      matchingRule.severity === "critical"
        ? 1
        : matchingRule.severity === "major"
          ? 0.7
          : 0.4;

    if (!objectIs(attack.severity, expectedSeverity)) {
      throw boundaryError();
    }

    for (const key of [
      "realism",
      "subtlety",
      "novelty",
      "fixability"
    ]) {
      if (
        !isWireNumber(attack[key]) ||
        attack[key] < 0 ||
        attack[key] > 1
      ) {
        throw boundaryError();
      }
    }

    attackIds.add(attack.id);
    attacksById.set(attack.id, attack);
  }

  const baseline = experiment.baseline;

  if (
    !exactRecord(
      baseline,
      ["outcomes", "survivorOrderIds", "topFindingId"]
    ) ||
    !arrayIsArray(baseline.outcomes) ||
    !arrayIsArray(baseline.survivorOrderIds) ||
    baseline.outcomes.length !== experiment.attacks.length
  ) {
    throw boundaryError();
  }

  const survivors = new Set();

  for (
    let index = 0;
    index < baseline.outcomes.length;
    index += 1
  ) {
    const outcome = baseline.outcomes[index];

    if (
      !exactRecord(
        outcome,
        ["attackId", "evaluatorResult", "survived"]
      ) ||
      outcome.attackId !== experiment.attacks[index].id ||
      !["PASS", "FAIL"].includes(outcome.evaluatorResult) ||
      (outcome.evaluatorResult === "PASS") !==
        (outcome.survived === true)
    ) {
      throw boundaryError();
    }

    if (outcome.survived === true) {
      survivors.add(outcome.attackId);
    }
  }

  if (
    baseline.survivorOrderIds.length !== survivors.size
  ) {
    throw boundaryError();
  }

  for (
    let index = 0;
    index < baseline.survivorOrderIds.length;
    index += 1
  ) {
    const id = baseline.survivorOrderIds[index];

    if (
      !isNonEmptyString(id) ||
      !survivors.has(id)
    ) {
      throw boundaryError();
    }
  }

  const expectedTop =
    baseline.survivorOrderIds.length > 0
      ? baseline.survivorOrderIds[0]
      : null;

  if (baseline.topFindingId !== expectedTop) {
    throw boundaryError();
  }

  return attacksById;
}

function validateProposal(
  proposal,
  experiment,
  sourceAttackId,
  selectedAttack
) {
  if (
    !exactRecord(
      proposal,
      [
        "version",
        "task",
        "sourceAttackId",
        "ruleId",
        "protection"
      ]
    ) ||
    proposal.version !== 1 ||
    proposal.task !== experiment.task ||
    proposal.sourceAttackId !== sourceAttackId ||
    proposal.ruleId !== selectedAttack.ruleId ||
    !isNonEmptyString(proposal.task) ||
    !isNonEmptyString(proposal.sourceAttackId) ||
    !isNonEmptyString(proposal.ruleId) ||
    !exactRecord(
      proposal.protection,
      ["statement", "rationale"]
    ) ||
    !isNonEmptyString(proposal.protection.statement) ||
    !isNonEmptyString(proposal.protection.rationale)
  ) {
    throw boundaryError();
  }
}

function cloneJsonTree(value) {
  return cloneCapturedValue(
    value,
    new Set()
  );
}

function validateDraftArtifact(draft) {
  if (
    !exactRecord(
      draft,
      [
        "version",
        "kind",
        "status",
        "task",
        "experiment",
        "source",
        "rule",
        "protection"
      ]
    ) ||
    draft.version !== 1 ||
    draft.kind !== "contract-protection" ||
    draft.status !== "draft" ||
    draft.task !== draft.experiment.task ||
    !exactRecord(draft.source, ["attackId", "ruleId"]) ||
    !validateRule(draft.rule) ||
    !exactRecord(
      draft.protection,
      ["statement", "rationale"]
    ) ||
    !isNonEmptyString(draft.protection.statement) ||
    !isNonEmptyString(draft.protection.rationale)
  ) {
    throw boundaryError();
  }

  validateExperiment(draft.experiment);
}

function buildDraft(capture) {
  assertPrototypeBaseline();

  const attacksById = validateExperiment(capture.experiment);

  if (!isNonEmptyString(capture.sourceAttackId)) {
    throw boundaryError();
  }

  if (
    !capture.experiment.baseline.survivorOrderIds
      .includes(capture.sourceAttackId)
  ) {
    throw boundaryError();
  }

  const selectedAttack = attacksById.get(
    capture.sourceAttackId
  );

  if (selectedAttack === undefined) {
    throw boundaryError();
  }

  validateProposal(
    capture.proposal,
    capture.experiment,
    capture.sourceAttackId,
    selectedAttack
  );

  const draft = {
    version: 1,
    kind: "contract-protection",
    status: "draft",
    task: capture.experiment.task,
    experiment: cloneJsonTree(capture.experiment),
    source: {
      attackId: capture.sourceAttackId,
      ruleId: selectedAttack.ruleId
    },
    rule: {
      id: selectedAttack.rule.id,
      statement: selectedAttack.rule.statement,
      kind: selectedAttack.rule.kind,
      severity: selectedAttack.rule.severity
    },
    protection: {
      statement: capture.proposal.protection.statement,
      rationale: capture.proposal.protection.rationale
    }
  };

  validateDraftArtifact(draft);

  assertPrototypeBaseline();
  const encoded = jsonStringify(draft);
  const parsed = jsonParse(encoded);
  validateDraftArtifact(parsed);

  return draft;
}

function draftContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureDraftInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new CapturedPromise(
    (resolve, reject) => {
      if (captureFailure !== null) {
        reject(captureFailure);
        return;
      }

      try {
        resolve(buildDraft(capture));
      } catch {
        reject(boundaryError());
      }
    }
  );
}

module.exports = {
  draftContractProtection
};
