"use strict";

const {
  AsyncLocalStorage
} = require("node:async_hooks");

const {
  runInNewContext
} = require("node:vm");
const {
  experimentIntrinsics
} = require("./contract-attacks-core");
const {
  isProxy,
  forbiddenProbes,
  stringConstructor
} = experimentIntrinsics;

const pristineIntrinsics =
  runInNewContext(`({
    arrayIsArray: Array.isArray,
    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    getPrototypeOf: Object.getPrototypeOf,
    isExtensible: Object.isExtensible,
    objectIs: Object.is,
    defineProperty: Object.defineProperty,
    ownKeys: Reflect.ownKeys,
    reflectApply: Reflect.apply,
    numberIsFinite: Number.isFinite,
    stringTrim: String.prototype.trim,
    hasOwnProperty: Object.prototype.hasOwnProperty,
    setHas: Set.prototype.has,
    setAdd: Set.prototype.add,
    mapGet: Map.prototype.get,
    mapSet: Map.prototype.set,
    arrayPush: Array.prototype.push,
    arrayPop: Array.prototype.pop,
    arrayJoin: Array.prototype.join,
    SetConstructor: Set,
    MapConstructor: Map
  })`);

const arrayIsArray =
  pristineIntrinsics.arrayIsArray;
const getOwnPropertyDescriptors =
  pristineIntrinsics.getOwnPropertyDescriptors;
const getOwnPropertyDescriptor =
  pristineIntrinsics.getOwnPropertyDescriptor;
const getPrototypeOf =
  pristineIntrinsics.getPrototypeOf;
const isExtensible =
  pristineIntrinsics.isExtensible;
const objectIs =
  pristineIntrinsics.objectIs;
const defineProperty =
  pristineIntrinsics.defineProperty;
const ownKeys =
  pristineIntrinsics.ownKeys;
const reflectApply =
  pristineIntrinsics.reflectApply;
const numberIsFinite =
  pristineIntrinsics.numberIsFinite;
const stringTrim =
  pristineIntrinsics.stringTrim;
const jsonStringify = JSON.stringify;
const jsonParse = JSON.parse;
const hasOwnProperty =
  pristineIntrinsics.hasOwnProperty;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const objectPrototypeParent =
  getPrototypeOf(objectPrototype);
const SetConstructor =
  pristineIntrinsics.SetConstructor;
const MapConstructor =
  pristineIntrinsics.MapConstructor;
const ArrayConstructor = Array;
const setHas =
  pristineIntrinsics.setHas;
const setAdd =
  pristineIntrinsics.setAdd;
const mapGet =
  pristineIntrinsics.mapGet;
const mapSet =
  pristineIntrinsics.mapSet;
const arrayPush =
  pristineIntrinsics.arrayPush;
const arrayPop =
  pristineIntrinsics.arrayPop;
const arrayJoin =
  pristineIntrinsics.arrayJoin;
const asyncStorageRun =
  AsyncLocalStorage.prototype.run;
const asyncStorageGetStore =
  AsyncLocalStorage.prototype.getStore;

const captureStorage =
  new AsyncLocalStorage();

const NON_REPLAYABLE_CODE =
  "EXPERIMENT_NOT_WIRE_REPLAYABLE";

let capabilityAvailable =
  typeof isProxy === "function";

for (
  let index = 0;
  index < forbiddenProbes.length;
  index += 1
) {
  if (
    typeof forbiddenProbes[index] !==
      "function"
  ) {
    capabilityAvailable = false;
    break;
  }
}

function hasOwn(value, key) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}

function setHasValue(set, value) {
  return reflectApply(
    setHas,
    set,
    [value]
  );
}

function setAddValue(set, value) {
  reflectApply(
    setAdd,
    set,
    [value]
  );
}

function mapGetValue(map, key) {
  return reflectApply(
    mapGet,
    map,
    [key]
  );
}

function mapSetValue(map, key, value) {
  reflectApply(
    mapSet,
    map,
    [key, value]
  );
}

function push(array, value) {
  reflectApply(
    arrayPush,
    array,
    [value]
  );
}

function pop(array) {
  return reflectApply(
    arrayPop,
    array,
    []
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
    if (
      reflectApply(
        forbiddenProbes[index],
        undefined,
        [value]
      )
    ) {
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
    isProxy(value)
  ) {
    throw new Error("invalid-array-surface");
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype !== arrayPrototype ||
    isExtensible(value) !== true
  ) {
    throw new Error("invalid-array-surface");
  }

  if (isForbiddenBrand(value)) {
    throw new Error("invalid-array-brand");
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
    const key = stringConstructor(index);

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

function validateExactRecordSurface(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value) ||
    isProxy(value)
  ) {
    throw new Error("invalid-record-surface");
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype !== objectPrototype ||
    isExtensible(value) !== true
  ) {
    throw new Error("invalid-record-surface");
  }

  if (isForbiddenBrand(value)) {
    throw new Error("invalid-record-brand");
  }

  return getOwnPropertyDescriptors(value);
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
    isProxy(value)
  ) {
    throw new Error("invalid-wire-node");
  }

  const isArray = arrayIsArray(value);
  let descriptors;

  if (isArray) {
    descriptors =
      validateExactArraySurface(value);
  } else {
    descriptors =
      validateExactRecordSurface(value);
  }

  if (setHasValue(seen, value)) {
    throw new Error("invalid-wire-tree");
  }

  setAddValue(seen, value);

  if (isArray) {
    const target =
      new ArrayConstructor(value.length);
    const entries = [];

    for (
      let index = 0;
      index < value.length;
      index += 1
    ) {
      push(entries, {
        key: stringConstructor(index),
        value:
          descriptors[stringConstructor(index)].value
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

    push(entries, {
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
      pop(stack);
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
      push(stack, child.frame);
    }
  }

  return root.value;
}

function expectedKeyExists(
  expectedKeys,
  candidate
) {
  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    if (expectedKeys[index] === candidate) {
      return true;
    }
  }

  return false;
}

function requireExactRecord(
  value,
  expectedKeys
) {
  const descriptors =
    validateExactRecordSurface(value);
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
      !expectedKeyExists(
        expectedKeys,
        key
      )
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
    !(
      kind === "required" ||
      kind === "forbidden" ||
      kind === "conditional"
    ) ||
    !(
      severity === "critical" ||
      severity === "major" ||
      severity === "minor"
    )
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
      ruleDescriptors[stringConstructor(index)].value
    );

    if (setHasValue(ids, rule.id)) {
      throw new Error("duplicate-rule");
    }

    setAddValue(ids, rule.id);
    push(rules, rule);
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

  if (!capabilityAvailable) {
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

    const seedKeys = [
      "contract",
      "input",
      "expectedOutput"
    ];

    for (
      let keyIndex = 0;
      keyIndex < seedKeys.length;
      keyIndex += 1
    ) {
      const key = seedKeys[keyIndex];

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
    mapGetValue(rawAttackById, id) !==
      undefined
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

    const scoreKeys = [
      "realism",
      "subtlety",
      "novelty",
      "fixability"
    ];

    for (
      let scoreIndex = 0;
      scoreIndex < scoreKeys.length;
      scoreIndex += 1
    ) {
      const key = scoreKeys[scoreIndex];
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

  mapSetValue(
    rawAttackById,
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

    if (
      !arrayIsArray(attacks) ||
      isProxy(attacks)
    ) {
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
        attackDescriptors[stringConstructor(index)];

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

  const context = reflectApply(
    asyncStorageGetStore,
    captureStorage,
    []
  );

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
  return reflectApply(
    asyncStorageRun,
    captureStorage,
    [context, callback]
  );
}

function isPrototypeBaselineExact() {
  return (
    getPrototypeOf(objectPrototype) ===
      objectPrototypeParent &&
    getPrototypeOf(arrayPrototype) ===
      objectPrototype &&
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
    const current = pop(stack);

    if (
      current === null ||
      typeof current !== "object"
    ) {
      continue;
    }

    if (setHasValue(seen, current)) {
      throw new Error("non-tree");
    }

    setAddValue(seen, current);

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
        push(stack, descriptor.value);
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
    const current = pop(experimentStack);

    if (
      current === null ||
      typeof current !== "object" ||
      setHasValue(
        experimentNodes,
        current
      )
    ) {
      continue;
    }

    setAddValue(
      experimentNodes,
      current
    );

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
        push(
          experimentStack,
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
      push(legacyStack, descriptor.value);
    }
  }

  while (legacyStack.length > 0) {
    const current = pop(legacyStack);

    if (
      current === null ||
      typeof current !== "object" ||
      setHasValue(legacySeen, current)
    ) {
      continue;
    }

    if (
      setHasValue(
        experimentNodes,
        current
      )
    ) {
      throw new Error("experiment-alias");
    }

    setAddValue(legacySeen, current);

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
        push(legacyStack, descriptor.value);
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

function encodeWireScalar(value) {
  const encoded = jsonStringify(value);

  if (typeof encoded !== "string") {
    throw new Error("invalid-json-scalar");
  }

  return encoded;
}

function stringifyWireTreeStackSafe(root) {
  const operations = [
    {
      kind: "value",
      value: root
    }
  ];
  const parts = [];

  while (operations.length > 0) {
    const operation = pop(operations);

    if (operation.kind === "token") {
      push(parts, operation.value);
      continue;
    }

    const value = operation.value;

    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      push(parts, encodeWireScalar(value));
      continue;
    }

    if (
      value === null ||
      typeof value !== "object"
    ) {
      throw new Error("invalid-json-value");
    }

    const descriptors =
      getOwnPropertyDescriptors(value);

    if (arrayIsArray(value)) {
      push(operations, {
        kind: "token",
        value: "]"
      });

      for (
        let index = value.length - 1;
        index >= 0;
        index -= 1
      ) {
        push(operations, {
          kind: "value",
          value:
            descriptors[stringConstructor(index)].value
        });

        if (index > 0) {
          push(operations, {
            kind: "token",
            value: ","
          });
        }
      }

      push(operations, {
        kind: "token",
        value: "["
      });
      continue;
    }

    const keys = ownKeys(descriptors);

    push(operations, {
      kind: "token",
      value: "}"
    });

    for (
      let index = keys.length - 1;
      index >= 0;
      index -= 1
    ) {
      const key = keys[index];

      if (typeof key !== "string") {
        throw new Error("invalid-json-key");
      }

      push(operations, {
        kind: "value",
        value: descriptors[key].value
      });
      push(operations, {
        kind: "token",
        value: ":"
      });
      push(operations, {
        kind: "token",
        value: encodeWireScalar(key)
      });

      if (index > 0) {
        push(operations, {
          kind: "token",
          value: ","
        });
      }
    }

    push(operations, {
      kind: "token",
      value: "{"
    });
  }

  return reflectApply(
    arrayJoin,
    parts,
    [""]
  );
}

function probeWireRoundTrip(experiment) {
  const wrapper = {
    experiment
  };

  const encoded =
    stringifyWireTreeStackSafe(wrapper);
  const parsed = jsonParse(encoded);

  cloneWireValue(parsed);

  const reencoded =
    stringifyWireTreeStackSafe(parsed);

  if (reencoded !== encoded) {
    throw new Error("wire-roundtrip");
  }
}

function cloneAttackForExperiment(
  attack,
  evidence
) {
  const expectedSeverity =
    attack.rule.severity === "critical"
      ? 1
      : attack.rule.severity === "major"
        ? 0.7
        : attack.rule.severity === "minor"
          ? 0.4
          : undefined;

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

  const retainedScoreKeys = [
    "realism",
    "subtlety",
    "novelty",
    "fixability"
  ];

  for (
    let scoreIndex = 0;
    scoreIndex < retainedScoreKeys.length;
    scoreIndex += 1
  ) {
    const key = retainedScoreKeys[scoreIndex];
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

    push(
      attacks,
      cloneAttackForExperiment(
        attack,
        mapGetValue(
          context.rawAttackById,
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

    push(outcomes, {
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
    push(
      survivorOrderIds,
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
  probeWireRoundTrip(experiment);

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
