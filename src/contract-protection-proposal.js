"use strict";

const { runInNewContext } = require("node:vm");
const runtimeAuthority = require("./runtime-authority");

const {
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
  FunctionPrototype: localFunctionPrototype,
  PromiseConstructor,
  PromisePrototype: promisePrototype,
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
const promiseBrandProbe =
  forbiddenProbes !== null &&
  typeof forbiddenProbes === "object"
    ? forbiddenProbes[6]
    : undefined;

const CONTRACT_PROTECTION_INSTRUCTIONS_V1 =
  "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
  "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
  "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
  "The protection statement must describe what the quality system should enforce.\n" +
  "The rationale must explain why this protection addresses the selected survivor.";

let boundaryAuthorityAvailable = true;
const requiredFunctions = [
  isProxy,
  stringConstructor,
  defineProperty,
  jsonStringify,
  jsonParse,
  PromiseConstructor,
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
  promiseThen,
  promiseBrandProbe
];

for (let index = 0; index < requiredFunctions.length; index += 1) {
  if (typeof requiredFunctions[index] !== "function") {
    boundaryAuthorityAvailable = false;
    break;
  }
}

if (
  promiseBrandProbe !== runtimeAuthority.isPromise ||
  isProxy !== runtimeAuthority.isProxy ||
  forbiddenProbes !== runtimeAuthority.forbiddenProbes
) {
  boundaryAuthorityAvailable = false;
}

if (
  typeof arrayIsArray !== "function" ||
  arrayIsArray(forbiddenProbes) !== true
) {
  boundaryAuthorityAvailable = false;
} else {
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (typeof forbiddenProbes[index] !== "function") {
      boundaryAuthorityAvailable = false;
      break;
    }
  }
}

let promiseAuthorityVerified = false;
let trustedPromiseConstructor = null;
try {
  const pristineReflectApply = runInNewContext("Reflect.apply");
  const pristineFunctionToString = runInNewContext("Function.prototype.toString");
  const pristineGetOwnPropertyDescriptor = runInNewContext(
    "Object.getOwnPropertyDescriptor"
  );
  const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");
  const pristinePromiseConstructorSource = runInNewContext(
    "Function.prototype.toString.call(Promise)"
  );
  const pristinePromiseThenSource = runInNewContext(
    "Function.prototype.toString.call(Promise.prototype.then)"
  );
  const localPromiseProbe = (async function m13LocalPromiseProbe() {})();
  const intrinsicPromisePrototype = pristineReflectApply(
    pristineGetPrototypeOf,
    undefined,
    [localPromiseProbe]
  );
  const intrinsicPromiseConstructorDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [intrinsicPromisePrototype, "constructor"]
  );
  const promiseThenDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [intrinsicPromisePrototype, "then"]
  );
  const capturedPromiseConstructorSource = pristineReflectApply(
    pristineFunctionToString,
    PromiseConstructor,
    []
  );
  const intrinsicPromiseConstructorSource =
    intrinsicPromiseConstructorDescriptor !== undefined &&
    typeof intrinsicPromiseConstructorDescriptor.value === "function"
      ? pristineReflectApply(
          pristineFunctionToString,
          intrinsicPromiseConstructorDescriptor.value,
          []
        )
      : null;
  const capturedPromiseThenSource = pristineReflectApply(
    pristineFunctionToString,
    promiseThen,
    []
  );

  const intrinsicPromiseConstructorVerified = (
    intrinsicPromiseConstructorDescriptor !== undefined &&
    typeof intrinsicPromiseConstructorDescriptor.value === "function" &&
    intrinsicPromiseConstructorDescriptor.writable === true &&
    intrinsicPromiseConstructorDescriptor.enumerable === false &&
    intrinsicPromiseConstructorDescriptor.configurable === true &&
    intrinsicPromiseConstructorSource === pristinePromiseConstructorSource
  );

  if (intrinsicPromiseConstructorVerified) {
    trustedPromiseConstructor = intrinsicPromiseConstructorDescriptor.value;
  }

  promiseAuthorityVerified = (
    intrinsicPromiseConstructorVerified &&
    PromiseConstructor === trustedPromiseConstructor &&
    promisePrototype === intrinsicPromisePrototype &&
    capturedPromiseConstructorSource === pristinePromiseConstructorSource &&
    promiseThenDescriptor !== undefined &&
    promiseThenDescriptor.value === promiseThen &&
    promiseThenDescriptor.writable === true &&
    promiseThenDescriptor.enumerable === false &&
    promiseThenDescriptor.configurable === true &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [promiseThen]) === localFunctionPrototype &&
    capturedPromiseThenSource === pristinePromiseThenSource
  );
} catch {
  promiseAuthorityVerified = false;
  trustedPromiseConstructor = null;
}

if (
  !promiseAuthorityVerified ||
  typeof promiseSpecies !== "symbol" ||
  runtimeAuthority.promiseAuthorityAvailable !== true ||
  trustedPromiseConstructor !== runtimeAuthority.promiseConstructor ||
  !runtimeAuthority.hasTrustedLocalPromiseSpecies(
    trustedPromiseConstructor,
    promiseSpecies
  )
) {
  boundaryAuthorityAvailable = false;
}

function boundaryError() {
  try {
    null.m13Boundary;
  } catch (error) {
    return error;
  }
  return null;
}

let safePromiseSpeciesContainer = null;
if (boundaryAuthorityAvailable) {
  try {
    safePromiseSpeciesContainer = {};
    defineProperty(safePromiseSpeciesContainer, promiseSpecies, {
      value: trustedPromiseConstructor,
      writable: false,
      enumerable: false,
      configurable: false
    });
  } catch {
    safePromiseSpeciesContainer = null;
    boundaryAuthorityAvailable = false;
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

function makeNullRecord(entries) {
  const record = { __proto__: null };
  for (let index = 0; index < entries.length; index += 1) {
    defineOrdinary(record, entries[index][0], entries[index][1]);
  }
  return record;
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

function isPromiseBrand(value) {
  try {
    return promiseBrandProbe(value) === true;
  } catch {
    throw boundaryError();
  }
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
  return recordDescriptorSurface(value, keys);
}

function exactCandidateRecord(value, keys) {
  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) === true ||
    arrayIsArray(value) === true ||
    hasForbiddenBrand(value) ||
    (getPrototypeOf(value) !== objectPrototype && getPrototypeOf(value) !== null) ||
    isExtensible(value) !== true
  ) {
    return false;
  }
  return recordDescriptorSurface(value, keys);
}

function recordDescriptorSurface(value, keys) {
  const descriptors = getOwnPropertyDescriptors(value);
  const own = ownKeys(descriptors);
  if (own.length !== keys.length) return false;
  for (let index = 0; index < keys.length; index += 1) {
    if (!ordinaryDescriptor(descriptors[keys[index]])) return false;
  }
  for (let index = 0; index < own.length; index += 1) {
    if (typeof own[index] !== "string") return false;
    let found = false;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      if (own[index] === keys[keyIndex]) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function prepareCapturedNode(value, seen) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return makeRecord([["value", value], ["entries", null]]);
  }
  if (typeof value === "number") {
    if (!isWireNumber(value)) throw boundaryError();
    return makeRecord([["value", value], ["entries", null]]);
  }
  if (typeof value !== "object" || isProxy(value) === true) {
    throw boundaryError();
  }
  if (setHasValue(seen, value)) throw boundaryError();
  setAddValue(seen, value);

  const entries = new ArrayConstructor();
  let target;

  if (arrayIsArray(value) === true) {
    if (!exactArray(value)) throw boundaryError();
    const descriptors = getOwnPropertyDescriptors(value);
    const length = descriptors.length.value;
    target = new ArrayConstructor();
    for (let index = 0; index < length; index += 1) {
      append(entries, makeRecord([
        ["key", stringConstructor(index)],
        ["value", descriptors[stringConstructor(index)].value]
      ]));
    }
  } else {
    if (
      hasForbiddenBrand(value) ||
      getPrototypeOf(value) !== objectPrototype ||
      isExtensible(value) !== true
    ) {
      throw boundaryError();
    }
    const descriptors = getOwnPropertyDescriptors(value);
    const keys = ownKeys(descriptors);
    target = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (typeof key !== "string" || !ordinaryDescriptor(descriptor)) {
        throw boundaryError();
      }
      append(entries, makeRecord([
        ["key", key],
        ["value", descriptor.value]
      ]));
    }
  }

  return makeRecord([["value", target], ["entries", entries]]);
}

function cloneCapturedValue(value, seen) {
  const root = prepareCapturedNode(value, seen);
  if (root.entries === null) return root.value;

  const frames = new ArrayConstructor();
  append(frames, makeRecord([
    ["target", root.value],
    ["entries", root.entries]
  ]));

  for (let cursor = 0; cursor < frames.length; cursor += 1) {
    const frame = frames[cursor];
    for (let index = 0; index < frame.entries.length; index += 1) {
      const entry = frame.entries[index];
      const child = prepareCapturedNode(entry.value, seen);
      defineOrdinary(frame.target, entry.key, child.value);
      if (child.entries !== null) {
        append(frames, makeRecord([
          ["target", child.value],
          ["entries", child.entries]
        ]));
      }
    }
  }

  return root.value;
}

function captureInvocation(options) {
  if (!boundaryAuthorityAvailable) throw boundaryError();
  if (!exactRecord(options, ["experiment", "sourceAttackId", "generator"])) {
    throw boundaryError();
  }
  const descriptors = getOwnPropertyDescriptors(options);
  const generator = descriptors.generator.value;
  if (typeof generator !== "function" || isProxy(generator) === true) {
    throw boundaryError();
  }
  const seen = new SetConstructor();
  setAddValue(seen, options);
  return makeRecord([
    ["experiment", cloneCapturedValue(descriptors.experiment.value, seen)],
    ["sourceAttackId", descriptors.sourceAttackId.value],
    ["generator", generator]
  ]);
}

function validateRule(rule) {
  if (
    !exactRecord(rule, ["id", "statement", "kind", "severity"]) ||
    !isNonEmptyString(rule.id) ||
    !isNonEmptyString(rule.statement)
  ) return false;
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
    const left = stack[cursor].a;
    const right = stack[cursor].b;
    if (left === null || typeof left !== "object") {
      if (!objectIs(left, right)) return false;
      continue;
    }
    if (right === null || typeof right !== "object") return false;
    const leftArray = arrayIsArray(left) === true;
    if (leftArray !== (arrayIsArray(right) === true)) return false;
    const leftDescriptors = getOwnPropertyDescriptors(left);
    const rightDescriptors = getOwnPropertyDescriptors(right);
    if (leftArray) {
      if (left.length !== right.length) return false;
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
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      const rightDescriptor = getOwnPropertyDescriptor(right, leftKeys[index]);
      if (rightDescriptor === undefined) return false;
      append(stack, makeRecord([
        ["a", leftDescriptors[leftKeys[index]].value],
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
  ) throw boundaryError();

  const contract = experiment.contract;
  if (
    !exactRecord(contract, ["version", "status", "task", "rules"]) ||
    contract.version !== 1 ||
    contract.status !== "confirmed" ||
    contract.task !== experiment.task ||
    !exactArray(contract.rules) ||
    contract.rules.length < 1 ||
    contract.rules.length > MAX_RULES_V1
  ) throw boundaryError();

  const ruleIds = new SetConstructor();
  const rulesById = new MapConstructor();
  for (let index = 0; index < contract.rules.length; index += 1) {
    const rule = contract.rules[index];
    if (!validateRule(rule) || setHasValue(ruleIds, rule.id)) throw boundaryError();
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
  ) throw boundaryError();

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
    ) throw boundaryError();

    const matchingRule = mapGetValue(rulesById, attack.ruleId);
    if (
      matchingRule === undefined ||
      matchingRule.statement !== attack.rule.statement ||
      matchingRule.kind !== attack.rule.kind ||
      matchingRule.severity !== attack.rule.severity
    ) throw boundaryError();

    const expectedSeverity = matchingRule.severity === "critical"
      ? 1
      : matchingRule.severity === "major" ? 0.7 : 0.4;
    if (!objectIs(attack.severity, expectedSeverity)) throw boundaryError();

    const scoreKeys = ["realism", "subtlety", "novelty", "fixability"];
    for (let scoreIndex = 0; scoreIndex < scoreKeys.length; scoreIndex += 1) {
      const score = attack[scoreKeys[scoreIndex]];
      if (!isWireNumber(score) || score < 0 || score > 1) throw boundaryError();
    }
    if (wireEqualM8(attack.output, experiment.case.expectedOutput)) throw boundaryError();
    for (let previous = 0; previous < index; previous += 1) {
      const earlier = experiment.attacks[previous];
      if (
        earlier.ruleId === attack.ruleId &&
        wireEqualM8(earlier.output, attack.output)
      ) throw boundaryError();
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
  ) throw boundaryError();

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
    ) throw boundaryError();
    if (outcome.survived === true) {
      setAddValue(survivorIds, outcome.attackId);
      append(survivedAttackIndices, index);
    }
  }

  if (baseline.survivorOrderIds.length !== survivedAttackIndices.length) throw boundaryError();
  const seenOrder = new SetConstructor();
  for (let index = 0; index < baseline.survivorOrderIds.length; index += 1) {
    const id = baseline.survivorOrderIds[index];
    if (!isNonEmptyString(id) || !setHasValue(survivorIds, id) || setHasValue(seenOrder, id)) {
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
      if (setHasValue(usedIndices, attackIndex)) continue;
      const score = rankScore(experiment.attacks[attackIndex]);
      if (bestIndex === -1 || score > bestScore) {
        bestIndex = attackIndex;
        bestScore = score;
      }
    }
    if (
      bestIndex === -1 ||
      baseline.survivorOrderIds[rankIndex] !== experiment.attacks[bestIndex].id
    ) throw boundaryError();
    setAddValue(usedIndices, bestIndex);
  }

  const expectedTop = baseline.survivorOrderIds.length > 0
    ? baseline.survivorOrderIds[0]
    : null;
  if (baseline.topFindingId !== expectedTop) throw boundaryError();
  return attacksById;
}

function assertTreeGraph(root) {
  const seen = new SetConstructor();
  const stack = new ArrayConstructor();
  append(stack, root);
  for (let cursor = 0; cursor < stack.length; cursor += 1) {
    const value = stack[cursor];
    if (value === null || typeof value !== "object") continue;
    if (setHasValue(seen, value)) throw boundaryError();
    setAddValue(seen, value);
    if (arrayIsArray(value)) {
      if (!exactArray(value)) throw boundaryError();
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] !== null && typeof value[index] === "object") append(stack, value[index]);
      }
    } else {
      if (
        isProxy(value) === true ||
        hasForbiddenBrand(value) ||
        getPrototypeOf(value) !== objectPrototype ||
        isExtensible(value) !== true
      ) throw boundaryError();
      const descriptors = getOwnPropertyDescriptors(value);
      const keys = ownKeys(descriptors);
      for (let index = 0; index < keys.length; index += 1) {
        const descriptor = descriptors[keys[index]];
        if (typeof keys[index] !== "string" || !ordinaryDescriptor(descriptor)) throw boundaryError();
        if (descriptor.value !== null && typeof descriptor.value === "object") append(stack, descriptor.value);
      }
    }
  }
}

function exactTreeEqual(a, b) {
  const stack = new ArrayConstructor();
  append(stack, makeRecord([["a", a], ["b", b]]));
  for (let cursor = 0; cursor < stack.length; cursor += 1) {
    const left = stack[cursor].a;
    const right = stack[cursor].b;
    if (left === null || typeof left !== "object") {
      if (!objectIs(left, right)) return false;
      continue;
    }
    if (right === null || typeof right !== "object") return false;
    const leftArray = arrayIsArray(left) === true;
    if (leftArray !== (arrayIsArray(right) === true)) return false;
    if (leftArray) {
      if (left.length !== right.length) return false;
      for (let index = 0; index < left.length; index += 1) {
        append(stack, makeRecord([["a", left[index]], ["b", right[index]]]));
      }
      continue;
    }
    const leftDescriptors = getOwnPropertyDescriptors(left);
    const rightDescriptors = getOwnPropertyDescriptors(right);
    const leftKeys = ownKeys(leftDescriptors);
    const rightKeys = ownKeys(rightDescriptors);
    if (leftKeys.length !== rightKeys.length) return false;
    for (let index = 0; index < leftKeys.length; index += 1) {
      if (leftKeys[index] !== rightKeys[index]) return false;
      append(stack, makeRecord([
        ["a", leftDescriptors[leftKeys[index]].value],
        ["b", rightDescriptors[rightKeys[index]].value]
      ]));
    }
  }
  return true;
}

function stringifyWireValue(root) {
  let encoded = "";
  const frames = new ArrayConstructor();
  append(frames, makeRecord([
    ["value", root],
    ["entered", false],
    ["array", false],
    ["descriptors", null],
    ["keys", null],
    ["index", 0],
    ["length", 0]
  ]));

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    const value = frame.value;

    if (frame.entered !== true) {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number"
      ) {
        if (typeof value === "number" && !isWireNumber(value)) {
          throw boundaryError();
        }
        const primitive = jsonStringify(value);
        if (typeof primitive !== "string") throw boundaryError();
        encoded += primitive;
        frames.length -= 1;
        continue;
      }

      if (typeof value !== "object" || isProxy(value) === true) {
        throw boundaryError();
      }

      if (arrayIsArray(value) === true) {
        if (!exactArray(value)) throw boundaryError();
        frame.entered = true;
        frame.array = true;
        frame.descriptors = getOwnPropertyDescriptors(value);
        frame.length = frame.descriptors.length.value;
        encoded += "[";
        if (frame.length === 0) {
          encoded += "]";
          frames.length -= 1;
        }
        continue;
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
      for (let index = 0; index < keys.length; index += 1) {
        if (
          typeof keys[index] !== "string" ||
          !ordinaryDescriptor(descriptors[keys[index]])
        ) {
          throw boundaryError();
        }
      }
      frame.entered = true;
      frame.descriptors = descriptors;
      frame.keys = keys;
      frame.length = keys.length;
      encoded += "{";
      if (frame.length === 0) {
        encoded += "}";
        frames.length -= 1;
      }
      continue;
    }

    if (frame.index >= frame.length) {
      encoded += frame.array === true ? "]" : "}";
      frames.length -= 1;
      continue;
    }

    if (frame.index > 0) encoded += ",";

    let child;
    if (frame.array === true) {
      const key = stringConstructor(frame.index);
      child = frame.descriptors[key].value;
    } else {
      const key = frame.keys[frame.index];
      const encodedKey = jsonStringify(key);
      if (typeof encodedKey !== "string") throw boundaryError();
      encoded += encodedKey + ":";
      child = frame.descriptors[key].value;
    }
    frame.index += 1;
    append(frames, makeRecord([
      ["value", child],
      ["entered", false],
      ["array", false],
      ["descriptors", null],
      ["keys", null],
      ["index", 0],
      ["length", 0]
    ]));
  }

  return encoded;
}

function completeExperimentAuthority(experiment) {
  assertPrototypeBaseline();
  const attacksById = validateExperiment(experiment);
  assertTreeGraph(experiment);
  const encoded = stringifyWireValue(makeRecord([["experiment", experiment]]));
  const parsed = jsonParse(encoded);
  if (!exactRecord(parsed, ["experiment"])) throw boundaryError();
  assertPrototypeBaseline();
  validateExperiment(parsed.experiment);
  assertTreeGraph(parsed.experiment);
  if (!exactTreeEqual(experiment, parsed.experiment)) throw boundaryError();
  return attacksById;
}

function sourceIsSurvivor(experiment, sourceAttackId) {
  for (let index = 0; index < experiment.baseline.survivorOrderIds.length; index += 1) {
    if (experiment.baseline.survivorOrderIds[index] === sourceAttackId) return true;
  }
  return false;
}

function cloneWireValue(value, seen) {
  return cloneCapturedValue(value, seen);
}

function cloneRule(rule) {
  return makeRecord([
    ["id", rule.id],
    ["statement", rule.statement],
    ["kind", rule.kind],
    ["severity", rule.severity]
  ]);
}

function buildRequest(experiment, sourceAttackId, selectedAttack) {
  return makeRecord([
    ["task", experiment.task],
    ["case", makeRecord([
      ["input", cloneWireValue(experiment.case.input, new SetConstructor())],
      ["expectedOutput", cloneWireValue(experiment.case.expectedOutput, new SetConstructor())]
    ])],
    ["source", makeRecord([
      ["attackId", sourceAttackId],
      ["ruleId", selectedAttack.ruleId]
    ])],
    ["rule", cloneRule(selectedAttack.rule)],
    ["attack", makeRecord([
      ["id", selectedAttack.id],
      ["ruleId", selectedAttack.ruleId],
      ["type", selectedAttack.type],
      ["description", selectedAttack.description],
      ["rationale", selectedAttack.rationale],
      ["output", cloneWireValue(selectedAttack.output, new SetConstructor())]
    ])],
    ["instructions", CONTRACT_PROTECTION_INSTRUCTIONS_V1]
  ]);
}

function normalizeCandidate(candidate, experiment, sourceAttackId, selectedAttack) {
  if (
    !exactCandidateRecord(candidate, [
      "version", "task", "sourceAttackId", "ruleId", "protection"
    ]) ||
    !exactCandidateRecord(candidate.protection, ["statement", "rationale"]) ||
    candidate.version !== 1 ||
    candidate.task !== experiment.task ||
    candidate.sourceAttackId !== sourceAttackId ||
    candidate.ruleId !== selectedAttack.ruleId ||
    !isNonEmptyString(candidate.task) ||
    !isNonEmptyString(candidate.sourceAttackId) ||
    !isNonEmptyString(candidate.ruleId) ||
    !isNonEmptyString(candidate.protection.statement) ||
    !isNonEmptyString(candidate.protection.rationale)
  ) throw boundaryError();

  if (candidate.protection === candidate) throw boundaryError();

  return makeRecord([
    ["version", 1],
    ["task", candidate.task],
    ["sourceAttackId", candidate.sourceAttackId],
    ["ruleId", candidate.ruleId],
    ["protection", makeRecord([
      ["statement", candidate.protection.statement],
      ["rationale", candidate.protection.rationale]
    ])]
  ]);
}

function buildPublicResult(proposal) {
  const result = makeNullRecord([
    ["version", 1],
    ["kind", "contract-protection-proposal-result"],
    ["state", "proposal-ready"],
    ["proposal", proposal]
  ]);
  if (
    getPrototypeOf(result) !== null ||
    isExtensible(result) !== true
  ) throw boundaryError();
  const keys = ownKeys(result);
  const expected = ["version", "kind", "state", "proposal"];
  if (keys.length !== expected.length) throw boundaryError();
  for (let index = 0; index < expected.length; index += 1) {
    if (keys[index] !== expected[index] || !ordinaryDescriptor(getOwnPropertyDescriptor(result, expected[index]))) {
      throw boundaryError();
    }
  }
  return result;
}

function trustedPromiseConstructorDescriptor(descriptor) {
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === trustedPromiseConstructor &&
    runtimeAuthority.hasTrustedLocalPromiseSpecies(
      trustedPromiseConstructor,
      promiseSpecies
    )
  );
}

function constructorDescriptorUsesSafeDefaultSpecies(descriptor) {
  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor
  ) return false;
  if (descriptor.value === undefined) return true;
  return trustedPromiseConstructorDescriptor(descriptor);
}

function inheritedConstructorUsesSafeDefaultSpecies(promise) {
  let prototype = getPrototypeOf(promise);
  while (prototype !== null) {
    if (isProxy(prototype) === true) return false;
    const constructorDescriptor = getOwnPropertyDescriptor(prototype, "constructor");
    if (constructorDescriptor !== undefined) {
      if ("get" in constructorDescriptor || "set" in constructorDescriptor) return false;
      const constructor = constructorDescriptor.value;
      if (constructor === undefined) return true;
      if (constructor === trustedPromiseConstructor) {
        return runtimeAuthority.hasTrustedLocalPromiseSpecies(
          constructor,
          promiseSpecies
        );
      }
      const objectConstructorDescriptor = getOwnPropertyDescriptor(objectPrototype, "constructor");
      const objectConstructor =
        objectConstructorDescriptor !== undefined &&
        !("get" in objectConstructorDescriptor) &&
        !("set" in objectConstructorDescriptor)
          ? objectConstructorDescriptor.value
          : null;
      if (constructor !== objectConstructor || typeof constructor !== "function" || isProxy(constructor) === true) {
        return false;
      }
      const speciesDescriptor = getOwnPropertyDescriptor(constructor, promiseSpecies);
      return speciesDescriptor === undefined;
    }
    prototype = getPrototypeOf(prototype);
  }
  return true;
}

function consumeRejectedRecognizedPromise(promise) {
  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    previousConstructor !== undefined &&
    previousConstructor.configurable !== true
  ) {
    if (!constructorDescriptorUsesSafeDefaultSpecies(previousConstructor)) return false;
    reflectApply(promiseThen, promise, [undefined, () => {}]);
    return true;
  }
  if (
    previousConstructor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) return false;
    reflectApply(promiseThen, promise, [undefined, () => {}]);
    return true;
  }
  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let consumed = false;
  try {
    reflectApply(promiseThen, promise, [undefined, () => {}]);
    consumed = true;
  } finally {
    if (previousConstructor === undefined) {
      if (deleteProperty(promise, "constructor") !== true) consumed = false;
    } else {
      try {
        defineProperty(promise, "constructor", previousConstructor);
      } catch {
        consumed = false;
      }
    }
  }
  return consumed;
}

function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  if (
    isProxy(promise) === true ||
    !isPromiseBrand(promise)
  ) throw boundaryError();

  if (getPrototypeOf(promise) !== promisePrototype) {
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }

  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    previousConstructor !== undefined &&
    previousConstructor.configurable !== true
  ) {
    if (trustedPromiseConstructorDescriptor(previousConstructor)) {
      reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
      return;
    }
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
  if (
    previousConstructor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) throw boundaryError();
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    return;
  }

  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let observationEstablished = false;
  try {
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    observationEstablished = true;
  } finally {
    if (previousConstructor === undefined) {
      if (deleteProperty(promise, "constructor") !== true) observationEstablished = false;
    } else {
      try {
        defineProperty(promise, "constructor", previousConstructor);
      } catch {
        observationEstablished = false;
      }
    }
  }
  if (!observationEstablished) throw boundaryError();
}

async function rejectBoundaryPromise(error) {
  throw error;
}

function generateContractProtectionProposal(options) {
  if (typeof trustedPromiseConstructor !== "function") {
    return rejectBoundaryPromise(boundaryError());
  }
  return new trustedPromiseConstructor((resolve, reject) => {
    let capture;
    let selectedAttack;
    let generatorReturn;

    try {
      capture = captureInvocation(options);
      const attacksById = completeExperimentAuthority(capture.experiment);
      if (
        !isNonEmptyString(capture.sourceAttackId) ||
        !sourceIsSurvivor(capture.experiment, capture.sourceAttackId)
      ) throw boundaryError();
      selectedAttack = mapGetValue(attacksById, capture.sourceAttackId);
      if (selectedAttack === undefined) throw boundaryError();
      const request = buildRequest(
        capture.experiment,
        capture.sourceAttackId,
        selectedAttack
      );
      try {
        generatorReturn = reflectApply(capture.generator, undefined, [request]);
      } catch (error) {
        reject(error);
        return;
      }
    } catch {
      reject(boundaryError());
      return;
    }

    const settleCandidate = (candidate) => {
      try {
        assertPrototypeBaseline();
        const proposal = normalizeCandidate(
          candidate,
          capture.experiment,
          capture.sourceAttackId,
          selectedAttack
        );
        resolve(buildPublicResult(proposal));
      } catch {
        reject(boundaryError());
      }
    };

    if (
      generatorReturn !== null &&
      (typeof generatorReturn === "object" || typeof generatorReturn === "function")
    ) {
      let promiseResult = false;
      try {
        if (isProxy(generatorReturn) !== true) {
          promiseResult = isPromiseBrand(generatorReturn);
        }
      } catch {
        reject(boundaryError());
        return;
      }
      if (promiseResult) {
        try {
          observeAcceptedPromise(generatorReturn, settleCandidate, reject);
        } catch {
          reject(boundaryError());
        }
        return;
      }
    }

    settleCandidate(generatorReturn);
  });
}

module.exports = {
  generateContractProtectionProposal
};