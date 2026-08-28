"use strict";

const {
  runContractAttacks: runContractAttacksCore,
  experimentIntrinsics: authority
} = require("./contract-attacks-core");

const {
  isProxy,
  forbiddenProbes,
  stringConstructor,
  defineProperty,
  jsonStringify,
  jsonParse,
  ArrayConstructor,
  ArrayPrototype: arrayPrototype,
  ObjectPrototype: objectPrototype,
  ObjectPrototypeParent: objectPrototypeParent,
  PromiseConstructor,
  TypeErrorConstructor,
  getOwnPropertyDescriptors,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  isExtensible,
  objectIs,
  ownKeys,
  reflectApply,
  deleteProperty,
  arrayIsArray,
  stringTrim,
  numberIsFinite,
  numberIsInteger,
  SetConstructor,
  setHas,
  setAdd,
  MapConstructor,
  mapGet,
  mapSet,
  PromiseThen: promiseThen,
  PromiseSpecies: promiseSpecies
} = authority;

const MAX_RULES_V1 = 7;
const MAX_ATTACKS_V1 = 20;

let wireAuthorityAvailable = true;

const requiredFunctions = [
  isProxy,
  stringConstructor,
  defineProperty,
  jsonStringify,
  jsonParse,
  PromiseConstructor,
  TypeErrorConstructor,
  getOwnPropertyDescriptors,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  isExtensible,
  objectIs,
  ownKeys,
  reflectApply,
  deleteProperty,
  arrayIsArray,
  stringTrim,
  numberIsFinite,
  numberIsInteger,
  SetConstructor,
  setHas,
  setAdd,
  MapConstructor,
  mapGet,
  mapSet,
  promiseThen
];

for (let index = 0; index < requiredFunctions.length; index += 1) {
  if (typeof requiredFunctions[index] !== "function") {
    wireAuthorityAvailable = false;
    break;
  }
}

if (!arrayIsArray(forbiddenProbes)) {
  wireAuthorityAvailable = false;
} else {
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (typeof forbiddenProbes[index] !== "function") {
      wireAuthorityAvailable = false;
      break;
    }
  }
}

function boundaryError() {
  return new TypeErrorConstructor(
    "Invalid M10 contract-remediation boundary."
  );
}

const safePromiseSpeciesContainer = {};
defineProperty(safePromiseSpeciesContainer, promiseSpecies, {
  value: PromiseConstructor,
  writable: false,
  enumerable: false,
  configurable: false
});

function observeInternalPromise(promise, onFulfilled, onRejected) {
  const previousConstructor = getOwnPropertyDescriptor(
    promise,
    "constructor"
  );

  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });

  try {
    return reflectApply(promiseThen, promise, [
      onFulfilled,
      onRejected
    ]);
  } finally {
    if (previousConstructor === undefined) {
      deleteProperty(promise, "constructor");
    } else {
      defineProperty(
        promise,
        "constructor",
        previousConstructor
      );
    }
  }
}

function call(method, receiver, args) {
  return reflectApply(method, receiver, args);
}

function setHasValue(set, value) {
  return call(setHas, set, [value]);
}

function setAddValue(set, value) {
  call(setAdd, set, [value]);
}

function mapGetValue(map, key) {
  return call(mapGet, map, [key]);
}

function mapSetValue(map, key, value) {
  call(mapSet, map, [key, value]);
}

function append(array, value) {
  defineProperty(array, stringConstructor(array.length), {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function defineOrdinary(record, key, value) {
  defineProperty(record, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function makeRecord(entries) {
  const record = {};

  for (let index = 0; index < entries.length; index += 1) {
    defineOrdinary(record, entries[index][0], entries[index][1]);
  }

  return record;
}

function makeArray(values) {
  const array = new ArrayConstructor();

  for (let index = 0; index < values.length; index += 1) {
    append(array, values[index]);
  }

  return array;
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    call(stringTrim, value, []).length > 0
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
  try {
    for (let index = 0; index < forbiddenProbes.length; index += 1) {
      if (forbiddenProbes[index](value) === true) {
        return true;
      }
    }
  } catch {
    throw boundaryError();
  }

  return false;
}

function assertPrototypeBaseline() {
  if (
    getPrototypeOf(objectPrototype) !== objectPrototypeParent ||
    getPrototypeOf(arrayPrototype) !== objectPrototype
  ) {
    throw boundaryError();
  }

  const objectDescriptors = getOwnPropertyDescriptors(objectPrototype);
  const arrayDescriptors = getOwnPropertyDescriptors(arrayPrototype);

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

function exactArray(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) === true ||
    arrayIsArray(value) !== true ||
    getPrototypeOf(value) !== arrayPrototype ||
    isExtensible(value) !== true
  ) {
    return false;
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  const lengthDescriptor = descriptors.length;

  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.writable !== true ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false ||
    numberIsInteger(lengthDescriptor.value) !== true ||
    lengthDescriptor.value < 0 ||
    keys.length !== lengthDescriptor.value + 1
  ) {
    return false;
  }

  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    if (!ordinaryDescriptor(descriptors[stringConstructor(index)])) {
      return false;
    }
  }

  return true;
}

function exactRecord(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) === true ||
    arrayIsArray(value) === true ||
    hasForbiddenBrand(value) ||
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

  for (let index = 0; index < keys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[keys[index]])) {
      return false;
    }
  }

  for (let index = 0; index < own.length; index += 1) {
    let found = false;

    if (typeof own[index] !== "string") {
      return false;
    }

    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (own[index] === keys[keyIndex]) {
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }
  }

  return true;
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
    isProxy(value) === true
  ) {
    throw boundaryError();
  }

  if (setHasValue(seen, value)) {
    throw boundaryError();
  }
  setAddValue(seen, value);

  if (arrayIsArray(value) === true) {
    if (!exactArray(value)) {
      throw boundaryError();
    }

    const descriptors = getOwnPropertyDescriptors(value);
    const length = descriptors.length.value;
    const copy = new ArrayConstructor();

    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[stringConstructor(index)];
      append(
        copy,
        cloneCapturedValue(descriptor.value, seen)
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

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const descriptor = descriptors[key];

    if (
      typeof key !== "string" ||
      !ordinaryDescriptor(descriptor)
    ) {
      throw boundaryError();
    }

    defineOrdinary(
      copy,
      key,
      cloneCapturedValue(descriptor.value, seen)
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
    isProxy(options) === true ||
    arrayIsArray(options) === true ||
    hasForbiddenBrand(options) ||
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

  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[expectedKeys[index]])) {
      throw boundaryError();
    }
  }

  for (let index = 0; index < keys.length; index += 1) {
    let found = false;

    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      if (keys[index] === expectedKeys[expectedIndex]) {
        found = true;
        break;
      }
    }

    if (!found) {
      throw boundaryError();
    }
  }

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["experiment", cloneCapturedValue(descriptors.experiment.value, seen)],
    ["sourceAttackId", descriptors.sourceAttackId.value],
    ["proposal", cloneCapturedValue(descriptors.proposal.value, seen)]
  ]);
}

function captureConfirmInvocation(options) {
  if (!wireAuthorityAvailable) {
    throw boundaryError();
  }

  if (
    options === null ||
    typeof options !== "object" ||
    isProxy(options) === true ||
    arrayIsArray(options) === true ||
    hasForbiddenBrand(options) ||
    getPrototypeOf(options) !== objectPrototype ||
    isExtensible(options) !== true
  ) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(options);
  const keys = ownKeys(descriptors);
  const expectedKeys = ["draft", "decision"];

  if (keys.length !== expectedKeys.length) {
    throw boundaryError();
  }

  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[expectedKeys[index]])) {
      throw boundaryError();
    }
  }

  for (let index = 0; index < keys.length; index += 1) {
    let found = false;
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      if (keys[index] === expectedKeys[expectedIndex]) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw boundaryError();
    }
  }

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["draft", cloneCapturedValue(descriptors.draft.value, seen)],
    ["decision", cloneCapturedValue(descriptors.decision.value, seen)]
  ]);
}

function validateRule(rule) {
  if (
    !exactRecord(rule, ["id", "statement", "kind", "severity"]) ||
    !isNonEmptyString(rule.id) ||
    !isNonEmptyString(rule.statement)
  ) {
    return false;
  }

  const kindOk =
    rule.kind === "required" ||
    rule.kind === "forbidden" ||
    rule.kind === "conditional";
  const severityOk =
    rule.severity === "critical" ||
    rule.severity === "major" ||
    rule.severity === "minor";

  return kindOk && severityOk;
}

function wireEqualM8(a, b) {
  const stack = new ArrayConstructor();
  append(stack, makeRecord([["a", a], ["b", b]]));

  for (let cursor = 0; cursor < stack.length; cursor += 1) {
    const pair = stack[cursor];
    const left = pair.a;
    const right = pair.b;

    if (left === null || typeof left !== "object") {
      if (!objectIs(left, right)) {
        return false;
      }
      continue;
    }

    if (right === null || typeof right !== "object") {
      return false;
    }

    const leftArray = arrayIsArray(left) === true;
    const rightArray = arrayIsArray(right) === true;

    if (leftArray !== rightArray) {
      return false;
    }

    const leftDescriptors = getOwnPropertyDescriptors(left);
    const rightDescriptors = getOwnPropertyDescriptors(right);

    if (leftArray) {
      if (left.length !== right.length) {
        return false;
      }

      for (let index = 0; index < left.length; index += 1) {
        append(stack, makeRecord([
          ["a", leftDescriptors[stringConstructor(index)].value],
          ["b", rightDescriptors[stringConstructor(index)].value]
        ]));
      }
      continue;
    }

    const leftKeys = ownKeys(leftDescriptors);
    const rightKeys = ownKeys(rightDescriptors);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (let index = 0; index < leftKeys.length; index += 1) {
      const key = leftKeys[index];
      const rightDescriptor = getOwnPropertyDescriptor(right, key);

      if (rightDescriptor === undefined) {
        return false;
      }

      append(stack, makeRecord([
        ["a", leftDescriptors[key].value],
        ["b", rightDescriptor.value]
      ]));
    }
  }

  return true;
}

function rankScore(attack) {
  return (
    0.30 * attack.severity +
    0.25 * attack.realism +
    0.20 * attack.subtlety +
    0.15 * attack.novelty +
    0.10 * attack.fixability
  );
}

function validateExperiment(experiment) {
  if (
    !exactRecord(experiment, [
      "version", "kind", "replayable", "task",
      "contract", "case", "attacks", "baseline"
    ]) ||
    experiment.version !== 1 ||
    experiment.kind !== "contract-attack-experiment" ||
    experiment.replayable !== true ||
    !isNonEmptyString(experiment.task)
  ) {
    throw boundaryError();
  }

  const contract = experiment.contract;

  if (
    !exactRecord(contract, ["version", "status", "task", "rules"]) ||
    contract.version !== 1 ||
    contract.status !== "confirmed" ||
    contract.task !== experiment.task ||
    !exactArray(contract.rules) ||
    contract.rules.length < 1 ||
    contract.rules.length > MAX_RULES_V1
  ) {
    throw boundaryError();
  }

  const ruleIds = new SetConstructor();
  const rulesById = new MapConstructor();

  for (let index = 0; index < contract.rules.length; index += 1) {
    const rule = contract.rules[index];

    if (!validateRule(rule) || setHasValue(ruleIds, rule.id)) {
      throw boundaryError();
    }

    setAddValue(ruleIds, rule.id);
    mapSetValue(rulesById, rule.id, rule);
  }

  if (
    !exactRecord(experiment.case, ["input", "expectedOutput", "replay"]) ||
    !exactRecord(experiment.case.replay, ["version", "kind", "strategy"]) ||
    experiment.case.replay.version !== 1 ||
    experiment.case.replay.kind !== "m8-evaluator-case" ||
    experiment.case.replay.strategy !== "json-wire-v1" ||
    !exactArray(experiment.attacks) ||
    experiment.attacks.length > MAX_ATTACKS_V1
  ) {
    throw boundaryError();
  }

  const attackIds = new SetConstructor();
  const attacksById = new MapConstructor();

  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const attack = experiment.attacks[index];

    if (
      !exactRecord(attack, [
        "id", "ruleId", "rule", "type", "description", "rationale",
        "output", "severity", "realism", "subtlety", "novelty", "fixability"
      ]) ||
      !isNonEmptyString(attack.id) ||
      !isNonEmptyString(attack.ruleId) ||
      !isNonEmptyString(attack.type) ||
      !isNonEmptyString(attack.description) ||
      !isNonEmptyString(attack.rationale) ||
      !validateRule(attack.rule) ||
      attack.ruleId !== attack.rule.id ||
      setHasValue(attackIds, attack.id)
    ) {
      throw boundaryError();
    }

    const matchingRule = mapGetValue(rulesById, attack.ruleId);

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

    const scoreKeys = ["realism", "subtlety", "novelty", "fixability"];

    for (let scoreIndex = 0; scoreIndex < scoreKeys.length; scoreIndex += 1) {
      const score = attack[scoreKeys[scoreIndex]];
      if (!isWireNumber(score) || score < 0 || score > 1) {
        throw boundaryError();
      }
    }

    if (wireEqualM8(attack.output, experiment.case.expectedOutput)) {
      throw boundaryError();
    }

    for (let previous = 0; previous < index; previous += 1) {
      const earlier = experiment.attacks[previous];
      if (
        earlier.ruleId === attack.ruleId &&
        wireEqualM8(earlier.output, attack.output)
      ) {
        throw boundaryError();
      }
    }

    setAddValue(attackIds, attack.id);
    mapSetValue(attacksById, attack.id, attack);
  }

  const baseline = experiment.baseline;

  if (
    !exactRecord(baseline, ["outcomes", "survivorOrderIds", "topFindingId"]) ||
    !exactArray(baseline.outcomes) ||
    !exactArray(baseline.survivorOrderIds) ||
    baseline.outcomes.length !== experiment.attacks.length
  ) {
    throw boundaryError();
  }

  const survivorIds = new SetConstructor();
  const survivedAttackIndices = new ArrayConstructor();

  for (let index = 0; index < baseline.outcomes.length; index += 1) {
    const outcome = baseline.outcomes[index];

    if (
      !exactRecord(outcome, ["attackId", "evaluatorResult", "survived"]) ||
      outcome.attackId !== experiment.attacks[index].id ||
      (outcome.evaluatorResult !== "PASS" && outcome.evaluatorResult !== "FAIL") ||
      (outcome.evaluatorResult === "PASS" && outcome.survived !== true) ||
      (outcome.evaluatorResult === "FAIL" && outcome.survived !== false)
    ) {
      throw boundaryError();
    }

    if (outcome.survived === true) {
      setAddValue(survivorIds, outcome.attackId);
      append(survivedAttackIndices, index);
    }
  }

  if (baseline.survivorOrderIds.length !== survivedAttackIndices.length) {
    throw boundaryError();
  }

  const seenOrder = new SetConstructor();

  for (let index = 0; index < baseline.survivorOrderIds.length; index += 1) {
    const id = baseline.survivorOrderIds[index];
    if (
      !isNonEmptyString(id) ||
      !setHasValue(survivorIds, id) ||
      setHasValue(seenOrder, id)
    ) {
      throw boundaryError();
    }
    setAddValue(seenOrder, id);
  }

  const usedIndices = new SetConstructor();

  for (let rankIndex = 0; rankIndex < survivedAttackIndices.length; rankIndex += 1) {
    let bestIndex = -1;
    let bestScore = -Infinity;

    for (let candidatePosition = 0; candidatePosition < survivedAttackIndices.length; candidatePosition += 1) {
      const attackIndex = survivedAttackIndices[candidatePosition];
      if (setHasValue(usedIndices, attackIndex)) {
        continue;
      }

      const score = rankScore(experiment.attacks[attackIndex]);
      if (bestIndex === -1 || score > bestScore) {
        bestIndex = attackIndex;
        bestScore = score;
      }
    }

    if (
      bestIndex === -1 ||
      baseline.survivorOrderIds[rankIndex] !== experiment.attacks[bestIndex].id
    ) {
      throw boundaryError();
    }

    setAddValue(usedIndices, bestIndex);
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

function validateProposal(proposal, experiment, sourceAttackId, selectedAttack) {
  if (
    !exactRecord(proposal, [
      "version", "task", "sourceAttackId", "ruleId", "protection"
    ]) ||
    proposal.version !== 1 ||
    proposal.task !== experiment.task ||
    proposal.sourceAttackId !== sourceAttackId ||
    proposal.ruleId !== selectedAttack.ruleId ||
    !isNonEmptyString(proposal.task) ||
    !isNonEmptyString(proposal.sourceAttackId) ||
    !isNonEmptyString(proposal.ruleId) ||
    !exactRecord(proposal.protection, ["statement", "rationale"]) ||
    !isNonEmptyString(proposal.protection.statement) ||
    !isNonEmptyString(proposal.protection.rationale)
  ) {
    throw boundaryError();
  }
}

function cloneWireValue(value, seen) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (setHasValue(seen, value)) {
    throw boundaryError();
  }
  setAddValue(seen, value);

  if (arrayIsArray(value) === true) {
    const copy = new ArrayConstructor();
    for (let index = 0; index < value.length; index += 1) {
      append(copy, cloneWireValue(value[index], seen));
    }
    return copy;
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  const copy = {};

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    defineOrdinary(copy, key, cloneWireValue(descriptors[key].value, seen));
  }

  return copy;
}

function cloneRuleCanonical(rule) {
  return makeRecord([
    ["id", rule.id],
    ["statement", rule.statement],
    ["kind", rule.kind],
    ["severity", rule.severity]
  ]);
}

function cloneExperimentCanonical(experiment) {
  const rules = new ArrayConstructor();
  for (let index = 0; index < experiment.contract.rules.length; index += 1) {
    append(rules, cloneRuleCanonical(experiment.contract.rules[index]));
  }

  const attacks = new ArrayConstructor();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const attack = experiment.attacks[index];
    append(attacks, makeRecord([
      ["id", attack.id],
      ["ruleId", attack.ruleId],
      ["rule", cloneRuleCanonical(attack.rule)],
      ["type", attack.type],
      ["description", attack.description],
      ["rationale", attack.rationale],
      ["output", cloneWireValue(attack.output, new SetConstructor())],
      ["severity", attack.severity],
      ["realism", attack.realism],
      ["subtlety", attack.subtlety],
      ["novelty", attack.novelty],
      ["fixability", attack.fixability]
    ]));
  }

  const outcomes = new ArrayConstructor();
  for (let index = 0; index < experiment.baseline.outcomes.length; index += 1) {
    const outcome = experiment.baseline.outcomes[index];
    append(outcomes, makeRecord([
      ["attackId", outcome.attackId],
      ["evaluatorResult", outcome.evaluatorResult],
      ["survived", outcome.survived]
    ]));
  }

  const survivorOrderIds = new ArrayConstructor();
  for (let index = 0; index < experiment.baseline.survivorOrderIds.length; index += 1) {
    append(survivorOrderIds, experiment.baseline.survivorOrderIds[index]);
  }

  return makeRecord([
    ["version", 1],
    ["kind", "contract-attack-experiment"],
    ["replayable", true],
    ["task", experiment.task],
    ["contract", makeRecord([
      ["version", 1],
      ["status", "confirmed"],
      ["task", experiment.contract.task],
      ["rules", rules]
    ])],
    ["case", makeRecord([
      ["input", cloneWireValue(experiment.case.input, new SetConstructor())],
      ["expectedOutput", cloneWireValue(experiment.case.expectedOutput, new SetConstructor())],
      ["replay", makeRecord([
        ["version", 1],
        ["kind", "m8-evaluator-case"],
        ["strategy", "json-wire-v1"]
      ])]
    ])],
    ["attacks", attacks],
    ["baseline", makeRecord([
      ["outcomes", outcomes],
      ["survivorOrderIds", survivorOrderIds],
      ["topFindingId", experiment.baseline.topFindingId]
    ])]
  ]);
}

function validateDraftArtifact(draft) {
  if (
    !exactRecord(draft, [
      "version", "kind", "status", "task",
      "experiment", "source", "rule", "protection"
    ]) ||
    draft.version !== 1 ||
    draft.kind !== "contract-protection" ||
    draft.status !== "draft" ||
    draft.task !== draft.experiment.task ||
    !exactRecord(draft.source, ["attackId", "ruleId"]) ||
    !validateRule(draft.rule) ||
    !exactRecord(draft.protection, ["statement", "rationale"]) ||
    !isNonEmptyString(draft.protection.statement) ||
    !isNonEmptyString(draft.protection.rationale)
  ) {
    throw boundaryError();
  }

  const attacksById = validateExperiment(draft.experiment);
  const selectedAttack = mapGetValue(attacksById, draft.source.attackId);

  if (
    selectedAttack === undefined ||
    draft.source.ruleId !== selectedAttack.ruleId ||
    draft.rule.id !== selectedAttack.rule.id ||
    draft.rule.statement !== selectedAttack.rule.statement ||
    draft.rule.kind !== selectedAttack.rule.kind ||
    draft.rule.severity !== selectedAttack.rule.severity
  ) {
    throw boundaryError();
  }
}

function validateProtectionArtifact(artifact, expectedStatus) {
  if (
    !exactRecord(artifact, [
      "version", "kind", "status", "task",
      "experiment", "source", "rule", "protection"
    ]) ||
    artifact.version !== 1 ||
    artifact.kind !== "contract-protection" ||
    artifact.status !== expectedStatus ||
    artifact.task !== artifact.experiment.task ||
    !isNonEmptyString(artifact.task) ||
    !exactRecord(artifact.source, ["attackId", "ruleId"]) ||
    !isNonEmptyString(artifact.source.attackId) ||
    !isNonEmptyString(artifact.source.ruleId) ||
    !validateRule(artifact.rule) ||
    !exactRecord(artifact.protection, ["statement", "rationale"]) ||
    !isNonEmptyString(artifact.protection.statement) ||
    !isNonEmptyString(artifact.protection.rationale)
  ) {
    throw boundaryError();
  }

  const attacksById = validateExperiment(artifact.experiment);
  const selectedAttack = mapGetValue(attacksById, artifact.source.attackId);

  if (
    selectedAttack === undefined ||
    !sourceIsSurvivor(artifact.experiment, artifact.source.attackId) ||
    artifact.source.ruleId !== selectedAttack.ruleId ||
    artifact.rule.id !== artifact.source.ruleId ||
    artifact.rule.id !== selectedAttack.rule.id ||
    artifact.rule.statement !== selectedAttack.rule.statement ||
    artifact.rule.kind !== selectedAttack.rule.kind ||
    artifact.rule.severity !== selectedAttack.rule.severity
  ) {
    throw boundaryError();
  }
}

function validateDecision(decision) {
  if (!exactRecord(decision, ["type"])) {
    if (
      exactRecord(decision, ["type", "statement"]) &&
      decision.type === "edit" &&
      isNonEmptyString(decision.statement)
    ) {
      return;
    }
    throw boundaryError();
  }

  if (decision.type !== "accept" && decision.type !== "reject") {
    throw boundaryError();
  }
}

function buildConfirmation(capture) {
  assertPrototypeBaseline();
  validateDraftArtifact(capture.draft);
  validateDecision(capture.decision);

  const decision = capture.decision;
  const status = decision.type === "reject" ? "rejected" : "confirmed";
  const statement = decision.type === "edit"
    ? decision.statement
    : capture.draft.protection.statement;

  const artifact = makeRecord([
    ["version", 1],
    ["kind", "contract-protection"],
    ["status", status],
    ["task", capture.draft.task],
    ["experiment", cloneExperimentCanonical(capture.draft.experiment)],
    ["source", makeRecord([
      ["attackId", capture.draft.source.attackId],
      ["ruleId", capture.draft.source.ruleId]
    ])],
    ["rule", cloneRuleCanonical(capture.draft.rule)],
    ["protection", makeRecord([
      ["statement", statement],
      ["rationale", capture.draft.protection.rationale]
    ])]
  ]);

  validateProtectionArtifact(artifact, status);
  assertPrototypeBaseline();
  const encoded = jsonStringify(artifact);
  const parsed = jsonParse(encoded);
  validateProtectionArtifact(parsed, status);

  if (
    parsed.protection.statement !== artifact.protection.statement ||
    parsed.protection.rationale !== artifact.protection.rationale
  ) {
    throw boundaryError();
  }

  return artifact;
}

function sourceIsSurvivor(experiment, sourceAttackId) {
  for (let index = 0; index < experiment.baseline.survivorOrderIds.length; index += 1) {
    if (experiment.baseline.survivorOrderIds[index] === sourceAttackId) {
      return true;
    }
  }
  return false;
}

function buildDraft(capture) {
  assertPrototypeBaseline();

  const attacksById = validateExperiment(capture.experiment);

  if (
    !isNonEmptyString(capture.sourceAttackId) ||
    !sourceIsSurvivor(capture.experiment, capture.sourceAttackId)
  ) {
    throw boundaryError();
  }

  const selectedAttack = mapGetValue(attacksById, capture.sourceAttackId);
  if (selectedAttack === undefined) {
    throw boundaryError();
  }

  validateProposal(
    capture.proposal,
    capture.experiment,
    capture.sourceAttackId,
    selectedAttack
  );

  const draft = makeRecord([
    ["version", 1],
    ["kind", "contract-protection"],
    ["status", "draft"],
    ["task", capture.experiment.task],
    ["experiment", cloneExperimentCanonical(capture.experiment)],
    ["source", makeRecord([
      ["attackId", capture.sourceAttackId],
      ["ruleId", selectedAttack.ruleId]
    ])],
    ["rule", cloneRuleCanonical(selectedAttack.rule)],
    ["protection", makeRecord([
      ["statement", capture.proposal.protection.statement],
      ["rationale", capture.proposal.protection.rationale]
    ])]
  ]);

  validateDraftArtifact(draft);

  assertPrototypeBaseline();
  const encoded = jsonStringify(draft);
  const parsed = jsonParse(encoded);
  validateDraftArtifact(parsed);

  return draft;
}

function settleArtifact(resolve, artifact) {
  defineProperty(artifact, "then", {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true
  });

  try {
    resolve(artifact);
  } finally {
    deleteProperty(artifact, "then");
  }
}

function captureVerifyInvocation(options) {
  if (!wireAuthorityAvailable) {
    throw boundaryError();
  }

  if (
    options === null ||
    typeof options !== "object" ||
    isProxy(options) === true ||
    arrayIsArray(options) === true ||
    hasForbiddenBrand(options) ||
    getPrototypeOf(options) !== objectPrototype ||
    isExtensible(options) !== true
  ) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(options);
  const keys = ownKeys(descriptors);
  const expectedKeys = ["protection", "evaluator", "improvedEvaluator"];

  if (keys.length !== expectedKeys.length) {
    throw boundaryError();
  }

  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[expectedKeys[index]])) {
      throw boundaryError();
    }
  }

  for (let index = 0; index < keys.length; index += 1) {
    let found = false;
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      if (keys[index] === expectedKeys[expectedIndex]) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw boundaryError();
    }
  }

  const evaluator = descriptors.evaluator.value;
  const improvedEvaluator = descriptors.improvedEvaluator.value;
  if (
    typeof evaluator !== "function" ||
    isProxy(evaluator) === true ||
    typeof improvedEvaluator !== "function" ||
    isProxy(improvedEvaluator) === true
  ) {
    throw boundaryError();
  }

  const seen = new SetConstructor();
  setAddValue(seen, options);

  return makeRecord([
    ["protection", cloneCapturedValue(descriptors.protection.value, seen)],
    ["evaluator", evaluator],
    ["improvedEvaluator", improvedEvaluator]
  ]);
}

function cloneProtectionCanonical(artifact) {
  return makeRecord([
    ["version", 1],
    ["kind", "contract-protection"],
    ["status", artifact.status],
    ["task", artifact.task],
    ["experiment", cloneExperimentCanonical(artifact.experiment)],
    ["source", makeRecord([
      ["attackId", artifact.source.attackId],
      ["ruleId", artifact.source.ruleId]
    ])],
    ["rule", cloneRuleCanonical(artifact.rule)],
    ["protection", makeRecord([
      ["statement", artifact.protection.statement],
      ["rationale", artifact.protection.rationale]
    ])]
  ]);
}

function probeProtectionArtifact(artifact, status) {
  validateProtectionArtifact(artifact, status);
  assertPrototypeBaseline();
  const encoded = jsonStringify(artifact);
  const parsed = jsonParse(encoded);
  validateProtectionArtifact(parsed, status);
  if (
    parsed.protection.statement !== artifact.protection.statement ||
    parsed.protection.rationale !== artifact.protection.rationale
  ) {
    throw boundaryError();
  }
}

function projectReplayAttacks(experiment) {
  const projected = new ArrayConstructor();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const attack = experiment.attacks[index];
    append(projected, makeRecord([
      ["id", attack.id],
      ["ruleId", attack.ruleId],
      ["type", attack.type],
      ["description", attack.description],
      ["rationale", attack.rationale],
      ["mutatedOutput", cloneWireValue(attack.output, new SetConstructor())],
      ["scores", makeRecord([
        ["realism", attack.realism],
        ["subtlety", attack.subtlety],
        ["novelty", attack.novelty],
        ["fixability", attack.fixability]
      ])]
    ]));
  }
  return projected;
}

function makeClassifyingEvaluator(callback, failureState) {
  let callIndex = 0;
  return function classifiedEvaluator(output) {
    const phase = callIndex === 0 ? "positive-control" : "attack-evaluation";
    callIndex += 1;
    let value;
    try {
      value = callback(output);
    } catch (error) {
      failureState.phase = phase;
      failureState.reason = "threw";
      throw error;
    }
    if (typeof value !== "boolean") {
      failureState.phase = phase;
      failureState.reason = "non-boolean";
      return value;
    }
    if (phase === "positive-control" && value === false) {
      failureState.phase = phase;
      failureState.reason = "returned-false";
    }
    return value;
  };
}

function normalizedReplay(result, experiment) {
  const outcomes = new ArrayConstructor();
  for (let index = 0; index < experiment.attacks.length; index += 1) {
    const replayed = result.attack.results[index];
    if (replayed === undefined || replayed.id !== experiment.attacks[index].id) {
      throw boundaryError();
    }
    append(outcomes, makeRecord([
      ["attackId", replayed.id],
      ["evaluatorResult", replayed.evaluatorResult],
      ["survived", replayed.survived]
    ]));
  }

  const survivorOrderIds = new ArrayConstructor();
  for (let index = 0; index < result.attack.survivors.length; index += 1) {
    append(survivorOrderIds, result.attack.survivors[index].id);
  }

  return makeRecord([
    ["outcomes", outcomes],
    ["survivorOrderIds", survivorOrderIds],
    ["topFindingId", survivorOrderIds.length > 0 ? survivorOrderIds[0] : null]
  ]);
}

function replayPhase(authorityArtifact, callback) {
  const failure = { phase: null, reason: null };
  const experiment = authorityArtifact.experiment;
  const projectedAttacks = projectReplayAttacks(experiment);
  const evaluator = makeClassifyingEvaluator(callback, failure);

  return new PromiseConstructor((resolve, reject) => {
    let replayPromise;

    try {
      replayPromise = runContractAttacksCore({
        contract: cloneCapturedValue(experiment.contract, new SetConstructor()),
        input: cloneWireValue(experiment.case.input, new SetConstructor()),
        expectedOutput: cloneWireValue(experiment.case.expectedOutput, new SetConstructor()),
        evaluator,
        generator() {
          return makeRecord([
            ["version", 1],
            ["task", experiment.task],
            ["attacks", projectedAttacks]
          ]);
        }
      });
    } catch (error) {
      reject(error);
      return;
    }

    observeInternalPromise(replayPromise,
      (result) => {
        try {
          const phaseResult = makeRecord([
            ["replay", normalizedReplay(result, experiment)],
            ["failure", null]
          ]);
          settleArtifact(resolve, phaseResult);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        if (failure.phase === null) {
          reject(error);
          return;
        }

        try {
          const phaseResult = makeRecord([
            ["replay", null],
            ["failure", makeRecord([
              ["phase", failure.phase],
              ["reason", failure.reason]
            ])]
          ]);
          settleArtifact(resolve, phaseResult);
        } catch (settleError) {
          reject(settleError);
        }
      }
    );
  });
}

function freshEmptyArray() {
  return new ArrayConstructor();
}

function cloneReplayPayload(payload) {
  if (payload === null) {
    return null;
  }
  const outcomes = new ArrayConstructor();
  for (let index = 0; index < payload.outcomes.length; index += 1) {
    const outcome = payload.outcomes[index];
    append(outcomes, makeRecord([
      ["attackId", outcome.attackId],
      ["evaluatorResult", outcome.evaluatorResult],
      ["survived", outcome.survived]
    ]));
  }
  const survivorOrderIds = new ArrayConstructor();
  for (let index = 0; index < payload.survivorOrderIds.length; index += 1) {
    append(survivorOrderIds, payload.survivorOrderIds[index]);
  }
  return makeRecord([
    ["outcomes", outcomes],
    ["survivorOrderIds", survivorOrderIds],
    ["topFindingId", payload.topFindingId]
  ]);
}

function makeFailureReasons(...reasons) {
  const result = new ArrayConstructor();
  for (let index = 0; index < reasons.length; index += 1) {
    if (reasons[index] !== null) {
      append(result, reasons[index]);
    }
  }
  return result;
}

function assertTreeGraph(root) {
  const seen = new SetConstructor();
  const stack = new ArrayConstructor();
  append(stack, root);
  for (let cursor = 0; cursor < stack.length; cursor += 1) {
    const value = stack[cursor];
    if (value === null || typeof value !== "object") {
      continue;
    }
    if (setHasValue(seen, value)) {
      throw boundaryError();
    }
    setAddValue(seen, value);
    if (arrayIsArray(value)) {
      if (!exactArray(value)) {
        throw boundaryError();
      }
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] !== null && typeof value[index] === "object") {
          append(stack, value[index]);
        }
      }
    } else {
      if (
        isProxy(value) === true ||
        hasForbiddenBrand(value) ||
        getPrototypeOf(value) !== objectPrototype ||
        isExtensible(value) !== true
      ) {
        throw boundaryError();
      }
      const descriptors = getOwnPropertyDescriptors(value);
      const keys = ownKeys(descriptors);
      for (let index = 0; index < keys.length; index += 1) {
        const descriptor = descriptors[keys[index]];
        if (typeof keys[index] !== "string" || !ordinaryDescriptor(descriptor)) {
          throw boundaryError();
        }
        if (descriptor.value !== null && typeof descriptor.value === "object") {
          append(stack, descriptor.value);
        }
      }
    }
  }
}

function makeVerificationResult({
  state,
  verificationPassed,
  authorityArtifact,
  baselinePositiveControlPassed,
  improvedPositiveControlPassed,
  baseline,
  after,
  baselineMismatchAttackIds,
  eliminatedAttackIds,
  regressionAttackIds,
  sourceFindingCaught,
  improvement,
  failureReasons
}) {
  const result = makeRecord([
    ["version", 1],
    ["kind", "contract-protection-verification"],
    ["state", state],
    ["verificationPassed", verificationPassed],
    ["task", authorityArtifact.task],
    ["sourceAttackId", authorityArtifact.source.attackId],
    ["sourceRuleId", authorityArtifact.source.ruleId],
    ["protection", makeRecord([
      ["statement", authorityArtifact.protection.statement],
      ["rationale", authorityArtifact.protection.rationale]
    ])],
    ["baselinePositiveControlPassed", baselinePositiveControlPassed],
    ["improvedPositiveControlPassed", improvedPositiveControlPassed],
    ["baseline", cloneReplayPayload(baseline)],
    ["after", cloneReplayPayload(after)],
    ["baselineMismatchAttackIds", baselineMismatchAttackIds],
    ["eliminatedAttackIds", eliminatedAttackIds],
    ["regressionAttackIds", regressionAttackIds],
    ["sourceFindingCaught", sourceFindingCaught],
    ["improvement", improvement],
    ["failureReasons", failureReasons]
  ]);
  assertTreeGraph(result);
  return result;
}

function baselineMismatchIds(experiment, replay) {
  const ids = new ArrayConstructor();
  for (let index = 0; index < experiment.baseline.outcomes.length; index += 1) {
    const expected = experiment.baseline.outcomes[index];
    const actual = replay.outcomes[index];
    if (
      expected.evaluatorResult !== actual.evaluatorResult ||
      expected.survived !== actual.survived
    ) {
      append(ids, expected.attackId);
    }
  }
  return ids;
}

function sameStringArray(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

function buildVerification(capture) {
  return new PromiseConstructor((resolve, reject) => {
    let authorityArtifact;
    let experiment;

    try {
      validateProtectionArtifact(capture.protection, "confirmed");
      probeProtectionArtifact(capture.protection, "confirmed");
      authorityArtifact = cloneProtectionCanonical(capture.protection);
      validateProtectionArtifact(authorityArtifact, "confirmed");
      experiment = authorityArtifact.experiment;
    } catch (error) {
      reject(error);
      return;
    }

    const finish = (result) => {
      try {
        settleArtifact(resolve, result);
      } catch (error) {
        reject(error);
      }
    };

    const baselinePromise = replayPhase(authorityArtifact, capture.evaluator);
    observeInternalPromise(baselinePromise,
      (baselinePhase) => {
        try {
          if (baselinePhase.failure !== null) {
            const failure = baselinePhase.failure;
            const positiveReturnedFalse =
              failure.phase === "positive-control" && failure.reason === "returned-false";
            const state = positiveReturnedFalse
              ? "baseline-positive-control-failed"
              : "baseline-execution-failed";
            const baselinePc = positiveReturnedFalse
              ? false
              : failure.phase === "attack-evaluation" ? true : null;
            finish(makeVerificationResult({
              state,
              verificationPassed: false,
              authorityArtifact,
              baselinePositiveControlPassed: baselinePc,
              improvedPositiveControlPassed: null,
              baseline: null,
              after: null,
              baselineMismatchAttackIds: freshEmptyArray(),
              eliminatedAttackIds: freshEmptyArray(),
              regressionAttackIds: freshEmptyArray(),
              sourceFindingCaught: false,
              improvement: null,
              failureReasons: makeFailureReasons(state)
            }));
            return;
          }

          const baseline = baselinePhase.replay;
          const mismatchIds = baselineMismatchIds(experiment, baseline);
          const rankMatches = sameStringArray(
            experiment.baseline.survivorOrderIds,
            baseline.survivorOrderIds
          );
          const topMatches = experiment.baseline.topFindingId === baseline.topFindingId;

          if (mismatchIds.length > 0 || !rankMatches || !topMatches) {
            finish(makeVerificationResult({
              state: "baseline-mismatch",
              verificationPassed: false,
              authorityArtifact,
              baselinePositiveControlPassed: true,
              improvedPositiveControlPassed: null,
              baseline,
              after: null,
              baselineMismatchAttackIds: mismatchIds,
              eliminatedAttackIds: freshEmptyArray(),
              regressionAttackIds: freshEmptyArray(),
              sourceFindingCaught: false,
              improvement: null,
              failureReasons: makeFailureReasons("baseline-mismatch")
            }));
            return;
          }

          const improvedPromise = replayPhase(authorityArtifact, capture.improvedEvaluator);
          observeInternalPromise(improvedPromise,
            (improvedPhase) => {
              try {
                if (improvedPhase.failure !== null) {
                  const failure = improvedPhase.failure;
                  const positiveReturnedFalse =
                    failure.phase === "positive-control" && failure.reason === "returned-false";
                  const state = positiveReturnedFalse
                    ? "improved-positive-control-failed"
                    : "improved-execution-failed";
                  const improvedPc = positiveReturnedFalse
                    ? false
                    : failure.phase === "attack-evaluation" ? true : null;
                  finish(makeVerificationResult({
                    state,
                    verificationPassed: false,
                    authorityArtifact,
                    baselinePositiveControlPassed: true,
                    improvedPositiveControlPassed: improvedPc,
                    baseline,
                    after: null,
                    baselineMismatchAttackIds: freshEmptyArray(),
                    eliminatedAttackIds: freshEmptyArray(),
                    regressionAttackIds: freshEmptyArray(),
                    sourceFindingCaught: false,
                    improvement: null,
                    failureReasons: makeFailureReasons(state)
                  }));
                  return;
                }

                const after = improvedPhase.replay;
                const eliminated = new ArrayConstructor();
                const regressions = new ArrayConstructor();
                let sourceFindingCaught = false;

                for (let index = 0; index < experiment.attacks.length; index += 1) {
                  const attackId = experiment.attacks[index].id;
                  const beforeSurvived = baseline.outcomes[index].survived;
                  const afterSurvived = after.outcomes[index].survived;
                  if (beforeSurvived && !afterSurvived) {
                    append(eliminated, attackId);
                  }
                  if (!beforeSurvived && afterSurvived) {
                    append(regressions, attackId);
                  }
                  if (attackId === authorityArtifact.source.attackId) {
                    sourceFindingCaught = afterSurvived === false;
                  }
                }

                const improvement =
                  baseline.survivorOrderIds.length - after.survivorOrderIds.length;
                const hasRegression = regressions.length > 0;
                const sourceSurvives = !sourceFindingCaught;
                const state = hasRegression
                  ? "regression-detected"
                  : sourceSurvives
                    ? "source-finding-still-survives"
                    : "verified";
                const reasons = makeFailureReasons(
                  hasRegression ? "regression-detected" : null,
                  sourceSurvives ? "source-finding-still-survives" : null
                );

                finish(makeVerificationResult({
                  state,
                  verificationPassed: state === "verified",
                  authorityArtifact,
                  baselinePositiveControlPassed: true,
                  improvedPositiveControlPassed: true,
                  baseline,
                  after,
                  baselineMismatchAttackIds: freshEmptyArray(),
                  eliminatedAttackIds: eliminated,
                  regressionAttackIds: regressions,
                  sourceFindingCaught,
                  improvement,
                  failureReasons: reasons
                }));
              } catch (error) {
                reject(error);
              }
            },
            reject
          );
        } catch (error) {
          reject(error);
        }
      },
      reject
    );
  });
}

function scheduleVerification(capture, resolve, reject) {
  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());

  observeInternalPromise(
    kickoff,
    () => {
      try {
        const verification = buildVerification(capture);
        observeInternalPromise(
          verification,
          (result) => settleArtifact(resolve, result),
          () => reject(boundaryError())
        );
      } catch {
        reject(boundaryError());
      }
    },
    () => reject(boundaryError())
  );
}

function verifyContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureVerifyInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }
    scheduleVerification(capture, resolve, reject);
  });
}

function draftContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureDraftInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    try {
      settleArtifact(resolve, buildDraft(capture));
    } catch {
      reject(boundaryError());
    }
  });
}

function confirmContractProtection(options) {
  let capture;
  let captureFailure = null;

  try {
    capture = captureConfirmInvocation(options);
  } catch {
    captureFailure = boundaryError();
  }

  return new PromiseConstructor((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    try {
      settleArtifact(resolve, buildConfirmation(capture));
    } catch {
      reject(boundaryError());
    }
  });
}

module.exports = {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
};
