"use strict";

const {
  types: utilTypes
} = require("node:util");

const utilIsPromise =
  utilTypes["isPromise"];

const utilIsProxy =
  utilTypes["isProxy"];

const {
  attack
} = require("./engine");

const {
  cloneAiData,
  snapshotAiData
} = require("./ai-data");

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;

const getPrototypeOf =
  Object.getPrototypeOf;

const objectCreate =
  Object.create;

const objectPrototype =
  Object.prototype;

const arrayPrototype =
  Array.prototype;

const arrayIsArray =
  Array.isArray;

const ArrayConstructor =
  Array;

const arrayHasInstanceSymbol =
  Symbol.hasInstance;

const functionHasInstance =
  Function.prototype[
    Symbol.hasInstance
  ];

const arrayHasInstanceDescriptor =
  getOwnPropertyDescriptor(
    ArrayConstructor,
    arrayHasInstanceSymbol
  );

const objectKeys =
  Object.keys;

const functionToString =
  Function.prototype.toString;

const SetConstructor =
  Set;

const MapConstructor =
  Map;

const WeakSetConstructor =
  WeakSet;

const defineProperty =
  Object.defineProperty;

const setPrototypeOf =
  Object.setPrototypeOf;

const isExtensible =
  Object.isExtensible;

const ownKeys =
  Reflect.ownKeys;

const deleteProperty =
  Reflect.deleteProperty;

const reflectApply =
  Reflect.apply;

const objectFreeze =
  Object.freeze;

const arrayMap =
  Array.prototype.map;

const arrayFind =
  Array.prototype.find;

const promisePrototype =
  Promise.prototype;

const promiseConstructor =
  Promise;

const promiseThen =
  Promise.prototype.then;

const promiseSpecies =
  Symbol.species;

const promisePrototypeConstructorDescriptor =
  getOwnPropertyDescriptor(
    promisePrototype,
    "constructor"
  );

const promiseSpeciesDescriptor =
  getOwnPropertyDescriptor(
    promiseConstructor,
    promiseSpecies
  );

const promiseConstructorSource =
  reflectApply(
    functionToString,
    promiseConstructor,
    []
  );

const promiseSpeciesGetterSource =
  promiseSpeciesDescriptor !== undefined &&
  typeof promiseSpeciesDescriptor.get ===
    "function"
    ? reflectApply(
        functionToString,
        promiseSpeciesDescriptor.get,
        []
      )
    : null;

const safePromiseSpeciesContainer = {};

defineProperty(
  safePromiseSpeciesContainer,
  promiseSpecies,
  {
    value:
      promiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  }
);

objectFreeze(
  safePromiseSpeciesContainer
);

const hasOwnProperty =
  Object.prototype.hasOwnProperty;

function buildSafeCallbackPrototype(
  sourcePrototype,
  parentPrototype
) {
  const target =
    objectCreate(parentPrototype);

  const descriptors =
    getOwnPropertyDescriptors(
      sourcePrototype
    );

  for (
    const key of ownKeys(descriptors)
  ) {
    if (
      key === "constructor" ||
      key === "__proto__" ||
      key === Symbol.unscopables
    ) {
      continue;
    }

    const descriptor =
      descriptors[key];

    if (
      !("value" in descriptor) ||
      typeof descriptor.value !==
        "function"
    ) {
      continue;
    }

    defineProperty(
      target,
      key,
      {
        value:
          descriptor.value,
        writable: false,
        enumerable:
          descriptor.enumerable,
        configurable: false
      }
    );
  }

  return objectFreeze(target);
}

const safeCallbackObjectPrototype =
  buildSafeCallbackPrototype(
    objectPrototype,
    null
  );

const safeCallbackArrayPrototype =
  buildSafeCallbackPrototype(
    arrayPrototype,
    safeCallbackObjectPrototype
  );

function safeArrayHasInstance(
  value
) {
  if (arrayIsArray(value)) {
    return true;
  }

  return reflectApply(
    functionHasInstance,
    ArrayConstructor,
    [value]
  );
}

function restoreArrayHasInstance() {
  if (
    arrayHasInstanceDescriptor ===
      undefined
  ) {
    deleteProperty(
      ArrayConstructor,
      arrayHasInstanceSymbol
    );

    return;
  }

  defineProperty(
    ArrayConstructor,
    arrayHasInstanceSymbol,
    arrayHasInstanceDescriptor
  );
}

function withSafeArrayHasInstance(
  callback
) {
  defineProperty(
    ArrayConstructor,
    arrayHasInstanceSymbol,
    {
      value:
        safeArrayHasInstance,
      writable: false,
      enumerable: false,
      configurable: true
    }
  );

  try {
    return callback();
  } finally {
    restoreArrayHasInstance();
  }
}

const MAX_RULES = 7;
const MAX_ATTACKS = 20;
const CONTRACT_VERSION = 1;
const GENERATOR_VERSION = 1;

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

function hasOwn(
  value,
  key
) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}

function requireOwnDataProperty(
  value,
  key,
  label
) {
  const descriptor =
    getOwnPropertyDescriptor(
      value,
      key
    );

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor
  ) {
    throw new Error(
      `${label} must include own data property ${key}.`
    );
  }
}

function samePropertyDescriptor(
  left,
  right
) {
  if (
    left === undefined ||
    right === undefined
  ) {
    return left === right;
  }

  for (
    const key of [
      "value",
      "get",
      "set",
      "writable",
      "enumerable",
      "configurable"
    ]
  ) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

function requirePromiseIntrinsicIntegrity() {
  const currentPrototypeConstructor =
    getOwnPropertyDescriptor(
      promisePrototype,
      "constructor"
    );

  const currentSpecies =
    getOwnPropertyDescriptor(
      promiseConstructor,
      promiseSpecies
    );

  if (
    !samePropertyDescriptor(
      currentPrototypeConstructor,
      promisePrototypeConstructorDescriptor
    ) ||
    !samePropertyDescriptor(
      currentSpecies,
      promiseSpeciesDescriptor
    )
  ) {
    throw new Error(
      "Promise intrinsic integrity check failed."
    );
  }
}

function captureOptions(
  value
) {
  const label =
    "Contract attack options";

  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }

  if (utilIsProxy(value)) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    throw new Error(
      `${label} must be a plain object.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  for (const key of ownKeys(descriptors)) {
    if (typeof key === "symbol") {
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

    if (!descriptor.enumerable) {
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
    typeof value !== "object" ||
    arrayIsArray(value)
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

  const id = rule.id;
  const statement = rule.statement;
  const kind = rule.kind;
  const severity = rule.severity;

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (ids.has(id)) {
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
    typeof kind !== "string" ||
    !RULE_KINDS.has(kind)
  ) {
    throw new Error(
      `${label} kind must be one of: required, forbidden, conditional.`
    );
  }

  if (
    typeof severity !== "string" ||
    !SEVERITIES.has(severity)
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

  if (snapshot.status !== "confirmed") {
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

  if (!arrayIsArray(snapshot.rules)) {
    throw new Error(
      "Quality Contract rules must be an array."
    );
  }

  if (snapshot.rules.length === 0) {
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

  const ids = new SetConstructor();

  const rules =
    snapshot.rules.map(
      (rule, index) =>
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
      objectFreeze(rules)
  });
}

function requireTrustedCallbacks(
  evaluator,
  generator
) {
  if (typeof evaluator !== "function") {
    throw new Error(
      "Evaluator must be a function."
    );
  }

  if (typeof generator !== "function") {
    throw new Error(
      "Generator must be a function."
    );
  }
}

function isAuthenticatedStandardPromisePrototype(
  prototype,
  constructorDescriptor
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype) ||
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    typeof constructorDescriptor.value !==
      "function" ||
    utilIsProxy(
      constructorDescriptor.value
    ) ||
    promiseSpeciesGetterSource === null
  ) {
    return false;
  }

  const constructor =
    constructorDescriptor.value;

  let constructorSource;
  let prototypeDescriptor;
  let speciesDescriptor;
  let speciesGetterSource;

  try {
    constructorSource =
      reflectApply(
        functionToString,
        constructor,
        []
      );

    prototypeDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );

    speciesDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        promiseSpecies
      );

    speciesGetterSource =
      speciesDescriptor !== undefined &&
      typeof speciesDescriptor.get ===
        "function" &&
      !utilIsProxy(
        speciesDescriptor.get
      )
        ? reflectApply(
            functionToString,
            speciesDescriptor.get,
            []
          )
        : null;
  } catch {
    return false;
  }

  return (
    constructorSource ===
      promiseConstructorSource &&
    prototypeDescriptor !==
      undefined &&
    !("get" in prototypeDescriptor) &&
    !("set" in prototypeDescriptor) &&
    prototypeDescriptor.value ===
      prototype &&
    speciesDescriptor !== undefined &&
    !("value" in speciesDescriptor) &&
    speciesDescriptor.set === undefined &&
    speciesGetterSource ===
      promiseSpeciesGetterSource
  );
}

function restorePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(
      holder,
      "constructor"
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    descriptor
  );
}

function canInstallSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    return isExtensible(holder);
  }

  if (descriptor.configurable) {
    return true;
  }

  return (
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.writable
  );
}

function installSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable: false,
        configurable: true
      }
    );

    return;
  }

  if (descriptor.configurable) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable:
          descriptor.enumerable,
        configurable: true
      }
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    {
      value:
        safePromiseSpeciesContainer
    }
  );
}

function withTemporarySafePromiseConstructor(
  holder,
  descriptor,
  callback
) {
  installSafePromiseConstructor(
    holder,
    descriptor
  );

  try {
    return callback();
  } finally {
    restorePromiseConstructor(
      holder,
      descriptor
    );
  }
}

function withSafePromiseConstructor(
  value,
  callback
) {
  if (
    !utilIsPromise(value) ||
    utilIsProxy(value)
  ) {
    throw new Error(
      "Generator native Promise must be a genuine Promise object."
    );
  }

  const ownConstructor =
    getOwnPropertyDescriptor(
      value,
      "constructor"
    );

  if (
    canInstallSafePromiseConstructor(
      value,
      ownConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      value,
      ownConstructor,
      callback
    );
  }

  if (ownConstructor !== undefined) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype)
  ) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototypeConstructor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    canInstallSafePromiseConstructor(
      prototype,
      prototypeConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      prototype,
      prototypeConstructor,
      callback
    );
  }

  if (
    isAuthenticatedStandardPromisePrototype(
      prototype,
      prototypeConstructor
    )
  ) {
    return callback();
  }

  throw new Error(
    "Native Promise cannot be observed safely."
  );
}

function passPromiseValue(
  value
) {
  return value;
}

function rethrowPromiseReason(
  reason
) {
  throw reason;
}

function ignoreRejectedPromise() {
  return undefined;
}

function bridgeNativePromise(
  value
) {
  return new promiseConstructor(
    (resolve, reject) => {
      withSafePromiseConstructor(
        value,
        () =>
          reflectApply(
            promiseThen,
            value,
            [
              resolve,
              reject
            ]
          )
      );
    }
  );
}

function observeNativePromise(
  value
) {
  return withSafePromiseConstructor(
    value,
    () =>
      reflectApply(
        promiseThen,
        value,
        [
          undefined,
          ignoreRejectedPromise
        ]
      )
  );
}

function createEvaluatorSnapshot(
  value
) {
  const cloned =
    cloneAiData(
      value,
      "Evaluator output"
    );

  if (
    cloned === null ||
    typeof cloned !== "object"
  ) {
    return cloned;
  }

  const seen =
    new WeakSetConstructor();

  const stack = [cloned];

  while (stack.length > 0) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );

    for (
      const key of ownKeys(descriptors)
    ) {
      const descriptor =
        descriptors[key];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value ===
          "object"
      ) {
        stack.push(
          descriptor.value
        );
      }
    }

    setPrototypeOf(
      current,
      arrayIsArray(current)
        ? safeCallbackArrayPrototype
        : safeCallbackObjectPrototype
    );

    objectFreeze(current);
  }

  return cloned;
}

function createSafeEvaluator(
  evaluator
) {
  return function safeEvaluator(
    output
  ) {
    const evaluatorOutput =
      createEvaluatorSnapshot(
        output
      );

    const result =
      withSafeArrayHasInstance(
        () =>
          reflectApply(
            evaluator,
            undefined,
            [evaluatorOutput]
          )
      );

    if (utilIsPromise(result)) {
      observeNativePromise(result);
      requirePromiseIntrinsicIntegrity();

      throw new Error(
        "Async checks are not supported by this deterministic engine."
      );
    }

    requirePromiseIntrinsicIntegrity();

    if (typeof result !== "boolean") {
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
    severity: 0,
    realism: 0,
    subtlety: 0,
    novelty: 0,
    fixability: 0
  };

  const baseline =
    attack(
      evaluator,
      [baselineMutation]
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

function isolateGeneratorData(
  value
) {
  const seen =
    new WeakSetConstructor();

  const stack = [value];

  while (stack.length > 0) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );

    for (
      const key of ownKeys(descriptors)
    ) {
      const descriptor =
        descriptors[key];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value ===
          "object"
      ) {
        stack.push(
          descriptor.value
        );
      }
    }

    setPrototypeOf(
      current,
      null
    );
  }

  return value;
}

function buildGeneratorArguments(
  contract,
  input,
  expectedOutput
) {
  return isolateGeneratorData({
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
  });
}

function invokeGenerator(
  generator,
  argumentsObject
) {
  const returned =
    reflectApply(
      generator,
      undefined,
      [argumentsObject]
    );

  const isNativePromise =
    utilIsPromise(returned);

  const bridged =
    isNativePromise
      ? bridgeNativePromise(
          returned
        )
      : returned;

  try {
    requirePromiseIntrinsicIntegrity();
  } catch (error) {
    if (isNativePromise) {
      observeNativePromise(
        bridged
      );
    }

    throw error;
  }

  return objectFreeze({
    returned: bridged,
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

  for (
    const key of [
      "id",
      "ruleId",
      "type",
      "description",
      "rationale",
      "mutatedOutput",
      "scores"
    ]
  ) {
    requireOwnDataProperty(
      attackCandidate,
      key,
      label
    );
  }

  const id = attackCandidate.id;
  const ruleId = attackCandidate.ruleId;
  const type = attackCandidate.type;
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

  if (attackIds.has(id)) {
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
    ruleById.get(ruleId);

  if (rule === undefined) {
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

  const normalizedScores = {};

  for (const scoreKey of SCORE_KEYS) {
    requireOwnDataProperty(
      scores,
      scoreKey,
      `${label} scores`
    );

    const score =
      scores[scoreKey];

    requireScore(
      score,
      `${label} ${scoreKey}`
    );

    normalizedScores[scoreKey] =
      score;
  }

  const mutatedOutput =
    snapshotAiData(
      attackCandidate.mutatedOutput,
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

  for (
    const key of [
      "version",
      "task",
      "attacks"
    ]
  ) {
    requireOwnDataProperty(
      snapshot,
      key,
      "Generator output"
    );
  }

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

  if (snapshot.task !== contract.task) {
    throw new Error(
      "Generator output task must exactly match the confirmed Quality Contract task."
    );
  }

  if (!arrayIsArray(snapshot.attacks)) {
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
    new MapConstructor(
      reflectApply(
        arrayMap,
        contract.rules,
        [
          (rule) => [
            rule.id,
            rule
          ]
        ]
      )
    );

  const attackIds =
    new SetConstructor();

  const attacks =
    reflectApply(
      arrayMap,
      snapshot.attacks,
      [
        (attackCandidate, index) =>
          normalizeGeneratorAttack(
            attackCandidate,
            index,
            attackIds,
            ruleById
          )
      ]
    );

  return objectFreeze({
    version:
      GENERATOR_VERSION,
    task:
      snapshot.task,
    attacks:
      objectFreeze(attacks)
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
        candidate.mutatedOutput,
        `Generated attack ${candidate.id} output`
      ),
    severity,
    realism:
      candidate.scores.realism,
    subtlety:
      candidate.scores.subtlety,
    novelty:
      candidate.scores.novelty,
    fixability:
      candidate.scores.fixability
  };
}

function isAiDataEqual(
  left,
  right
) {
  const stack = [[left, right]];

  while (stack.length > 0) {
    const pair = stack.pop();
    const leftValue = pair[0];
    const rightValue = pair[1];

    if (leftValue === rightValue) {
      continue;
    }

    if (
      leftValue === null ||
      rightValue === null ||
      typeof leftValue !==
        typeof rightValue
    ) {
      return false;
    }

    if (
      typeof leftValue !== "object"
    ) {
      return false;
    }

    if (
      arrayIsArray(leftValue) !==
        arrayIsArray(rightValue)
    ) {
      return false;
    }

    const leftKeys =
      reflectApply(
        objectKeys,
        Object,
        [leftValue]
      );

    const rightKeys =
      reflectApply(
        objectKeys,
        Object,
        [rightValue]
      );

    if (
      leftKeys.length !==
        rightKeys.length
    ) {
      return false;
    }

    for (const key of leftKeys) {
      if (!hasOwn(rightValue, key)) {
        return false;
      }

      const leftDescriptor =
        getOwnPropertyDescriptor(
          leftValue,
          key
        );

      const rightDescriptor =
        getOwnPropertyDescriptor(
          rightValue,
          key
        );

      if (
        leftDescriptor === undefined ||
        rightDescriptor === undefined ||
        !("value" in leftDescriptor) ||
        !("value" in rightDescriptor)
      ) {
        return false;
      }

      stack.push([
        leftDescriptor.value,
        rightDescriptor.value
      ]);
    }
  }

  return true;
}

function findDuplicateAttack(
  retained,
  candidate
) {
  return reflectApply(
    arrayFind,
    retained,
    [
      (existing) =>
        existing.ruleId ===
          candidate.ruleId &&
        isAiDataEqual(
          existing.mutatedOutput,
          candidate.mutatedOutput
        )
    ]
  );
}

function filterGeneratedAttacks(
  validatedAttacks,
  expectedOutput
) {
  const retained = [];
  const discarded = [];

  for (const candidate of validatedAttacks) {
    if (
      isAiDataEqual(
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

    if (duplicate !== undefined) {
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

    retained.push(candidate);
  }

  return {
    retained:
      objectFreeze(retained),
    discarded:
      objectFreeze(discarded)
  };
}

function compileAllGeneratedAttacks(
  retained
) {
  return reflectApply(
    arrayMap,
    retained,
    [
      (candidate) =>
        compileGeneratedAttack(
          candidate
        )
    ]
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
    captureOptions(options);

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

  requirePromiseIntrinsicIntegrity();

  requireTrustedCallbacks(
    evaluator,
    generator
  );

  const safeEvaluator =
    createSafeEvaluator(evaluator);

  if (!hasOwn(optionDescriptors, "input")) {
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
    generatorInvocation.isNativePromise
      ? await generatorInvocation.returned
      : generatorInvocation.returned;

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
    generatedAttacks.length === 0
      ? buildEmptyAttackResult()
      : attack(
          safeEvaluator,
          generatedAttacks
        );

  const topFinding =
    attackResult.survivors[0] ||
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
