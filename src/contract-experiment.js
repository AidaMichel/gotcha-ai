"use strict";

const {
  AsyncLocalStorage
} = require("node:async_hooks");

const {
  types: utilTypes
} = require("node:util");

const isProxy = utilTypes.isProxy;
const forbiddenProbes = [
  utilTypes.isDate,
  utilTypes.isRegExp,
  utilTypes.isMap,
  utilTypes.isSet,
  utilTypes.isWeakMap,
  utilTypes.isWeakSet,
  utilTypes.isPromise,
  utilTypes.isNativeError,
  utilTypes.isAnyArrayBuffer,
  utilTypes.isDataView,
  utilTypes.isTypedArray,
  utilTypes.isBoxedPrimitive,
  utilTypes.isArgumentsObject,
  utilTypes.isGeneratorObject,
  utilTypes.isModuleNamespaceObject,
  utilTypes.isMapIterator,
  utilTypes.isSetIterator,
  utilTypes.isExternal,
  Buffer.isBuffer
];

const arrayIsArray = Array.isArray;
const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;
const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const getPrototypeOf = Object.getPrototypeOf;
const isExtensible = Object.isExtensible;
const objectIs = Object.is;
const defineProperty = Object.defineProperty;
const ownKeys = Reflect.ownKeys;
const reflectApply = Reflect.apply;
const numberIsFinite = Number.isFinite;
const stringTrim = String.prototype.trim;
const jsonStringify = JSON.stringify;
const jsonParse = JSON.parse;
const hasOwnProperty =
  Object.prototype.hasOwnProperty;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const objectPrototypeParent =
  getPrototypeOf(objectPrototype);
const arrayPrototypeParent =
  getPrototypeOf(arrayPrototype);
const SetConstructor = Set;
const MapConstructor = Map;

const captureStorage =
  new AsyncLocalStorage();

const NON_REPLAYABLE_CODE =
  "EXPERIMENT_NOT_WIRE_REPLAYABLE";

const CAPABILITY_AVAILABLE =
  typeof isProxy === "function" &&
  forbiddenProbes.every(
    (probe) => typeof probe === "function"
  );

function hasOwn(value, key) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
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

function isForbiddenBrand(value) {
  for (
    let index = 0;
    index < forbiddenProbes.length;
    index += 1
  ) {
    if (forbiddenProbes[index](value)) {
      return true;
    }
  }

  return false;
}

function isOrdinaryDataDescriptor(
  descriptor
) {
  return (
    descriptor !== undefined &&
    hasOwn(descriptor, "value") &&
    descriptor.writable === true &&
    descriptor.enumerable === true &&
    descriptor.configurable === true
  );
}

function validateExactArraySurface(value) {
  if (
    !arrayIsArray(value) ||
    isProxy(value) ||
    getPrototypeOf(value) !== arrayPrototype ||
    isExtensible(value) !== true
  ) {
    throw new Error("invalid-array-surface");
  }

  const descriptors =
    getOwnPropertyDescriptors(value);
  const length = value.length;
  const keys = ownKeys(descriptors);
  const lengthDescriptor =
    descriptors.length;

  if (
    keys.length !== length + 1 ||
    lengthDescriptor === undefined ||
    lengthDescriptor.value !== length ||
    lengthDescriptor.writable !== true ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false
  ) {
    throw new Error("invalid-array-length");
  }

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const key = String(index);

    if (
      keys[index] !== key ||
      !isOrdinaryDataDescriptor(
        descriptors[key]
      )
    ) {
      throw new Error("invalid-array-index");
    }
  }

  if (keys[length] !== "length") {
    throw new Error("invalid-array-keys");
  }

  return descriptors;
}

function prepareWireNode(
  value,
  seen
) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return {
      value,
      frame: null
    };
  }

  if (typeof value === "number") {
    if (!isWireNumber(value)) {
      throw new Error("invalid-wire-number");
    }

    return {
      value,
      frame: null
    };
  }

  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) ||
    isForbiddenBrand(value) ||
    seen.has(value)
  ) {
    throw new Error("invalid-wire-node");
  }

  seen.add(value);

  if (arrayIsArray(value)) {
    const descriptors =
      validateExactArraySurface(value);
    const target =
      new Array(value.length);
    const entries = [];

    for (
      let index = 0;
      index < value.length;
      index += 1
    ) {
      entries.push({
        key: String(index),
        value:
          descriptors[String(index)].value
      });
    }

    return {
      value: target,
      frame: {
        target,
        entries,
        index: 0
      }
    };
  }

  if (
    getPrototypeOf(value) !== objectPrototype ||
    isExtensible(value) !== true
  ) {
    throw new Error("invalid-wire-record");
  }

  const descriptors =
    getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  const entries = [];

  for (
    let index = 0;
    index < keys.length;
    index += 1
  ) {
    const key = keys[index];

    if (
      typeof key !== "string" ||
      !isOrdinaryDataDescriptor(
        descriptors[key]
      )
    ) {
      throw new Error(
        "invalid-wire-record-surface"
      );
    }

    entries.push({
      key,
      value: descriptors[key].value
    });
  }

  const target = {};

  return {
    value: target,
    frame: {
      target,
      entries,
      index: 0
    }
  };
}

function cloneWireValue(value) {
  const seen = new SetConstructor();
  const root = prepareWireNode(
    value,
    seen
  );

  if (root.frame === null) {
    return root.value;
  }

  const stack = [root.frame];

  while (stack.length > 0) {
    const frame =
      stack[stack.length - 1];

    if (
      frame.index >= frame.entries.length
    ) {
      stack.pop();
      continue;
    }

    const entry =
      frame.entries[frame.index];
    frame.index += 1;

    const child =
      prepareWireNode(
        entry.value,
        seen
      );

    defineProperty(
      frame.target,
      entry.key,
      {
        value: child.value,
        writable: true,
        enumerable: true,
        configurable: true
      }
    );

    if (child.frame !== null) {
      stack.push(child.frame);
    }
  }

  return root.value;
}

function requireExactRecord(
  value,
  expectedKeys
) {
  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value) ||
    isProxy(value) ||
    isForbiddenBrand(value) ||
    getPrototypeOf(value) !== objectPrototype ||
    isExtensible(value) !== true
  ) {
    throw new Error("invalid-record");
  }

  const descriptors =
    getOwnPropertyDescriptors(value);
  const actualKeys = ownKeys(descriptors);

  if (
    actualKeys.length !== expectedKeys.length
  ) {
    throw new Error("invalid-record-keys");
  }

  for (
    let index = 0;
    index < actualKeys.length;
    index += 1
  ) {
    const key = actualKeys[index];

    if (
      typeof key !== "string" ||
      !expectedKeys.includes(key)
    ) {
      throw new Error("invalid-record-key");
    }
  }

  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    if (
      !isOrdinaryDataDescriptor(
        descriptors[expectedKeys[index]]
      )
    ) {
      throw new Error("invalid-record-surface");
    }
  }

  return descriptors;
}

function cloneRule(value) {
  const descriptors =
    requireExactRecord(
      value,
      [
        "id",
        "statement",
        "kind",
        "severity"
      ]
    );

  const id = descriptors.id.value;
  const statement =
    descriptors.statement.value;
  const kind = descriptors.kind.value;
  const severity =
    descriptors.severity.value;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(statement) ||
    ![
      "required",
      "forbidden",
      "conditional"
    ].includes(kind) ||
    ![
      "critical",
      "major",
      "minor"
    ].includes(severity)
  ) {
    throw new Error("invalid-rule");
  }

  return {
    id,
    statement,
    kind,
    severity
  };
}

function cloneContract(value) {
  const descriptors =
    requireExactRecord(
      value,
      [
        "version",
        "status",
        "task",
        "rules"
      ]
    );

  const task = descriptors.task.value;

  if (
    descriptors.version.value !== 1 ||
    descriptors.status.value !== "confirmed" ||
    !isNonEmptyString(task)
  ) {
    throw new Error("invalid-contract");
  }

  const rulesValue =
    descriptors.rules.value;
  const ruleDescriptors =
    validateExactArraySurface(
      rulesValue
    );

  if (
    rulesValue.length < 1 ||
    rulesValue.length > 7
  ) {
    throw new Error("invalid-rule-count");
  }

  const ids = new SetConstructor();
  const rules = [];

  for (
    let index = 0;
    index < rulesValue.length;
    index += 1
  ) {
    const rule = cloneRule(
      ruleDescriptors[String(index)].value
    );

    if (ids.has(rule.id)) {
      throw new Error("duplicate-rule");
    }

    ids.add(rule.id);
    rules.push(rule);
  }

  return {
    version: 1,
    status: "confirmed",
    task,
    rules
  };
}

function captureSeed(options) {
  const seed = {
    replayable: false,
    contract: null,
    input: null,
    expectedOutput: null
  };

  if (!CAPABILITY_AVAILABLE) {
    return seed;
  }

  try {
    if (
      options === null ||
      typeof options !== "object" ||
      arrayIsArray(options) ||
      isProxy(options)
    ) {
      return seed;
    }

    const descriptors =
      getOwnPropertyDescriptors(options);

    for (
      const key of [
        "contract",
        "input",
        "expectedOutput"
      ]
    ) {
      if (
        !hasOwn(descriptors, key) ||
        !hasOwn(descriptors[key], "value")
      ) {
        return seed;
      }
    }

    seed.contract = cloneContract(
      descriptors.contract.value
    );
    seed.input = cloneWireValue(
      descriptors.input.value
    );
    seed.expectedOutput =
      cloneWireValue(
        descriptors.expectedOutput.value
      );
    seed.replayable = true;
  } catch {
    seed.replayable = false;
    seed.contract = null;
    seed.input = null;
    seed.expectedOutput = null;
  }

  return seed;
}

function createExperimentCapture(options) {
  return {
    seed: captureSeed(options),
    generatorCaptured: false,
    generatorEvidenceValid: false,
    rawAttackById:
      new MapConstructor()
  };
}

function captureRawAttackEvidence(
  rawAttackById,
  rawAttack
) {
  if (
    rawAttack === null ||
    typeof rawAttack !== "object" ||
    isProxy(rawAttack)
  ) {
    throw new Error("invalid-raw-attack");
  }

  const descriptors =
    getOwnPropertyDescriptors(rawAttack);
  const idDescriptor = descriptors.id;
  const outputDescriptor =
    descriptors.mutatedOutput;
  const scoresDescriptor =
    descriptors.scores;

  if (
    idDescriptor === undefined ||
    !hasOwn(idDescriptor, "value") ||
    outputDescriptor === undefined ||
    !hasOwn(outputDescriptor, "value") ||
    scoresDescriptor === undefined ||
    !hasOwn(scoresDescriptor, "value")
  ) {
    throw new Error("missing-raw-attack-field");
  }

  const id = idDescriptor.value;

  if (
    !isNonEmptyString(id) ||
    rawAttackById.has(id)
  ) {
    throw new Error("invalid-raw-attack-id");
  }

  let output = null;
  let wireValid = true;

  try {
    output = cloneWireValue(
      outputDescriptor.value
    );
  } catch {
    wireValid = false;
  }

  const scores = scoresDescriptor.value;

  if (
    scores === null ||
    typeof scores !== "object" ||
    isProxy(scores)
  ) {
    wireValid = false;
  } else {
    const scoreDescriptors =
      getOwnPropertyDescriptors(scores);

    for (
      const key of [
        "realism",
        "subtlety",
        "novelty",
        "fixability"
      ]
    ) {
      const descriptor =
        scoreDescriptors[key];
      const value =
        descriptor !== undefined &&
        hasOwn(descriptor, "value")
          ? descriptor.value
          : undefined;

      if (
        !isWireNumber(value) ||
        value < 0 ||
        value > 1
      ) {
        wireValid = false;
      }
    }
  }

  rawAttackById.set(
    id,
    {
      wireValid,
      output
    }
  );
}

function captureGeneratorOutput(
  context,
  rawOutput
) {
  context.generatorCaptured = true;
  context.generatorEvidenceValid = false;
  context.rawAttackById =
    new MapConstructor();

  try {
    if (
      rawOutput === null ||
      typeof rawOutput !== "object" ||
      isProxy(rawOutput)
    ) {
      return;
    }

    const descriptors =
      getOwnPropertyDescriptors(rawOutput);
    const attacksDescriptor =
      descriptors.attacks;

    if (
      attacksDescriptor === undefined ||
      !hasOwn(attacksDescriptor, "value")
    ) {
      return;
    }

    const attacks = attacksDescriptor.value;

    if (!arrayIsArray(attacks)) {
      return;
    }

    const attackDescriptors =
      getOwnPropertyDescriptors(attacks);
    const lengthDescriptor =
      attackDescriptors.length;

    if (
      lengthDescriptor === undefined ||
      !hasOwn(lengthDescriptor, "value") ||
      lengthDescriptor.value !== attacks.length
    ) {
      return;
    }

    for (
      let index = 0;
      index < attacks.length;
      index += 1
    ) {
      const descriptor =
        attackDescriptors[String(index)];

      if (
        descriptor === undefined ||
        !hasOwn(descriptor, "value")
      ) {
        return;
      }

      captureRawAttackEvidence(
        context.rawAttackById,
        descriptor.value
      );
    }

    context.generatorEvidenceValid = true;
  } catch {
    context.generatorEvidenceValid = false;
    context.rawAttackById =
      new MapConstructor();
  }
}

function captureGeneratorOutputForActiveExperiment(
  value,
  label
) {
  if (label !== "Generator output") {
    return;
  }

  const context = captureStorage.getStore();

  if (context === undefined) {
    return;
  }

  try {
    captureGeneratorOutput(
      context,
      value
    );
  } catch {
    context.generatorCaptured = true;
    context.generatorEvidenceValid = false;
  }
}

function withExperimentCapture(
  context,
  callback
) {
  return captureStorage.run(
    context,
    callback
  );
}

function isPrototypeBaselineExact() {
  return (
    getPrototypeOf(objectPrototype) ===
      objectPrototypeParent &&
    getPrototypeOf(arrayPrototype) ===
      arrayPrototypeParent &&
    getOwnPropertyDescriptor(
      objectPrototype,
      "toJSON"
    ) === undefined &&
    getOwnPropertyDescriptor(
      arrayPrototype,
      "toJSON"
    ) === undefined
  );
}

function assertTree(root) {
  const seen = new SetConstructor();
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();

    if (
      current === null ||
      typeof current !== "object"
    ) {
      continue;
    }

    if (seen.has(current)) {
      throw new Error("non-tree");
    }

    seen.add(current);

    const descriptors =
      getOwnPropertyDescriptors(current);
    const keys = ownKeys(descriptors);

    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const descriptor =
        descriptors[keys[index]];

      if (
        descriptor !== undefined &&
        hasOwn(descriptor, "value") &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      ) {
        stack.push(descriptor.value);
      }
    }
  }
}

function assertDisjoint(
  experiment,
  legacyResult
) {
  const experimentNodes =
    new SetConstructor();
  const experimentStack = [experiment];

  while (experimentStack.length > 0) {
    const current = experimentStack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      experimentNodes.has(current)
    ) {
      continue;
    }

    experimentNodes.add(current);
    const descriptors =
      getOwnPropertyDescriptors(current);
    const keys = ownKeys(descriptors);

    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const descriptor =
        descriptors[keys[index]];

      if (
        descriptor !== undefined &&
        hasOwn(descriptor, "value") &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      ) {
        experimentStack.push(
          descriptor.value
        );
      }
    }
  }

  const resultDescriptors =
    getOwnPropertyDescriptors(legacyResult);
  const resultKeys = ownKeys(resultDescriptors);
  const legacyStack = [];
  const legacySeen = new SetConstructor();

  for (
    let index = 0;
    index < resultKeys.length;
    index += 1
  ) {
    const key = resultKeys[index];

    if (key === "experiment") {
      continue;
    }

    const descriptor =
      resultDescriptors[key];

    if (
      descriptor !== undefined &&
      hasOwn(descriptor, "value") &&
      descriptor.value !== null &&
      typeof descriptor.value === "object"
    ) {
      legacyStack.push(descriptor.value);
    }
  }

  while (legacyStack.length > 0) {
    const current = legacyStack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      legacySeen.has(current)
    ) {
      continue;
    }

    if (experimentNodes.has(current)) {
      throw new Error("experiment-alias");
    }

    legacySeen.add(current);
    const descriptors =
      getOwnPropertyDescriptors(current);
    const keys = ownKeys(descriptors);

    for (
      let index = 0;
      index < keys.length;
      index += 1
    ) {
      const descriptor =
        descriptors[keys[index]];

      if (
        descriptor !== undefined &&
        hasOwn(descriptor, "value") &&
        descriptor.value !== null &&
        typeof descriptor.value === "object"
      ) {
        legacyStack.push(descriptor.value);
      }
    }
  }
}

function nonReplayable(task) {
  return {
    version: 1,
    kind: "contract-attack-experiment",
    replayable: false,
    task,
    reason: {
      code: NON_REPLAYABLE_CODE
    }
  };
}

function cloneAttackForExperiment(
  attack,
  evidence
) {
  const expectedSeverity = {
    critical: 1,
    major: 0.7,
    minor: 0.4
  }[attack.rule.severity];

  if (
    evidence === undefined ||
    evidence.wireValid !== true ||
    !isNonEmptyString(attack.id) ||
    !isNonEmptyString(attack.ruleId) ||
    !isNonEmptyString(attack.type) ||
    !isNonEmptyString(attack.description) ||
    !isNonEmptyString(attack.rationale) ||
    attack.ruleId !== attack.rule.id ||
    !objectIs(
      attack.severity,
      expectedSeverity
    )
  ) {
    throw new Error("invalid-retained-attack");
  }

  for (
    const key of [
      "realism",
      "subtlety",
      "novelty",
      "fixability"
    ]
  ) {
    const value = attack[key];

    if (
      !isWireNumber(value) ||
      value < 0 ||
      value > 1
    ) {
      throw new Error("invalid-retained-score");
    }
  }

  return {
    id: attack.id,
    ruleId: attack.ruleId,
    rule: {
      id: attack.rule.id,
      statement: attack.rule.statement,
      kind: attack.rule.kind,
      severity: attack.rule.severity
    },
    type: attack.type,
    description: attack.description,
    rationale: attack.rationale,
    output: cloneWireValue(
      evidence.output
    ),
    severity: attack.severity,
    realism: attack.realism,
    subtlety: attack.subtlety,
    novelty: attack.novelty,
    fixability: attack.fixability
  };
}

function buildReplayable(
  context,
  result
) {
  if (
    context.seed.replayable !== true ||
    context.generatorCaptured !== true ||
    context.generatorEvidenceValid !== true ||
    !isPrototypeBaselineExact()
  ) {
    throw new Error("capture-not-replayable");
  }

  const attacks = [];

  for (
    let index = 0;
    index < result.generatedAttacks.length;
    index += 1
  ) {
    const attack =
      result.generatedAttacks[index];

    attacks.push(
      cloneAttackForExperiment(
        attack,
        context.rawAttackById.get(
          attack.id
        )
      )
    );
  }

  const outcomes = [];

  for (
    let index = 0;
    index < result.attack.results.length;
    index += 1
  ) {
    const attackResult =
      result.attack.results[index];

    outcomes.push({
      attackId: attackResult.id,
      evaluatorResult:
        attackResult.evaluatorResult,
      survived:
        attackResult.survived
    });
  }

  const survivorOrderIds = [];

  for (
    let index = 0;
    index < result.attack.survivors.length;
    index += 1
  ) {
    survivorOrderIds.push(
      result.attack.survivors[index].id
    );
  }

  const experiment = {
    version: 1,
    kind: "contract-attack-experiment",
    replayable: true,
    task: result.task,
    contract: cloneContract(
      context.seed.contract
    ),
    case: {
      input: cloneWireValue(
        context.seed.input
      ),
      expectedOutput:
        cloneWireValue(
          context.seed.expectedOutput
        ),
      replay: {
        version: 1,
        kind: "m8-evaluator-case",
        strategy: "json-wire-v1"
      }
    },
    attacks,
    baseline: {
      outcomes,
      survivorOrderIds,
      topFindingId:
        survivorOrderIds.length > 0
          ? survivorOrderIds[0]
          : null
    }
  };

  if (
    experiment.task !==
      experiment.contract.task ||
    outcomes.length !== attacks.length
  ) {
    throw new Error("experiment-binding");
  }

  for (
    let index = 0;
    index < attacks.length;
    index += 1
  ) {
    if (
      outcomes[index].attackId !==
        attacks[index].id ||
      (
        outcomes[index].evaluatorResult ===
          "PASS"
      ) !==
        (outcomes[index].survived === true)
    ) {
      throw new Error("baseline-binding");
    }
  }

  assertTree(experiment);
  assertDisjoint(experiment, result);

  const encoded = jsonStringify({
    experiment
  });
  const parsed = jsonParse(encoded);

  cloneWireValue(parsed);

  if (
    jsonStringify(parsed) !== encoded
  ) {
    throw new Error("wire-roundtrip");
  }

  return experiment;
}

function buildExperiment(
  context,
  result
) {
  try {
    return buildReplayable(
      context,
      result
    );
  } catch {
    return nonReplayable(
      result.task
    );
  }
}

module.exports = {
  buildExperiment,
  captureGeneratorOutputForActiveExperiment,
  createExperimentCapture,
  withExperimentCapture
};
