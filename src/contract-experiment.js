"use strict";

const {
  types: utilTypes
} = require("node:util");

const {
  isProxy,
  isDate,
  isRegExp,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isPromise,
  isNativeError,
  isAnyArrayBuffer,
  isDataView,
  isTypedArray,
  isBoxedPrimitive,
  isArgumentsObject,
  isGeneratorObject,
  isModuleNamespaceObject,
  isMapIterator,
  isSetIterator,
  isExternal
} = utilTypes;

const arrayIsArray = Array.isArray;
const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;
const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const getPrototypeOf =
  Object.getPrototypeOf;
const isExtensible =
  Object.isExtensible;
const objectIs =
  Object.is;
const ownKeys =
  Reflect.ownKeys;
const numberIsFinite =
  Number.isFinite;
const jsonStringify =
  JSON.stringify;
const jsonParse =
  JSON.parse;
const objectPrototype =
  Object.prototype;
const arrayPrototype =
  Array.prototype;
const objectPrototypeParent =
  getPrototypeOf(objectPrototype);
const arrayPrototypeParent =
  getPrototypeOf(arrayPrototype);
const bufferIsBuffer =
  Buffer.isBuffer;

const FORBIDDEN_PROBES = [
  isDate,
  isRegExp,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isPromise,
  isNativeError,
  isAnyArrayBuffer,
  isDataView,
  isTypedArray,
  isBoxedPrimitive,
  isArgumentsObject,
  isGeneratorObject,
  isModuleNamespaceObject,
  isMapIterator,
  isSetIterator,
  isExternal,
  bufferIsBuffer
];

const CAPABILITY_AVAILABLE =
  typeof isProxy === "function" &&
  FORBIDDEN_PROBES.every(
    (probe) => typeof probe === "function"
  );

const NON_REPLAYABLE_CODE =
  "EXPERIMENT_NOT_WIRE_REPLAYABLE";

function hasOwn(
  value,
  key
) {
  return Object.prototype.hasOwnProperty.call(
    value,
    key
  );
}

function isForbiddenBrand(
  value
) {
  for (const probe of FORBIDDEN_PROBES) {
    if (probe(value)) {
      return true;
    }
  }

  return false;
}

function requireOrdinaryDataDescriptor(
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

function cloneWireValue(
  value,
  seen
) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (
      numberIsFinite(value) !== true ||
      objectIs(value, -0)
    ) {
      throw new Error("non-wire-number");
    }

    return value;
  }

  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) ||
    isForbiddenBrand(value) ||
    seen.has(value)
  ) {
    throw new Error("non-wire-value");
  }

  seen.add(value);

  if (arrayIsArray(value)) {
    if (
      getPrototypeOf(value) !== arrayPrototype ||
      !isExtensible(value)
    ) {
      throw new Error("non-wire-array");
    }

    const descriptors =
      getOwnPropertyDescriptors(value);
    const lengthDescriptor =
      descriptors.length;
    const length = value.length;
    const keys = ownKeys(descriptors);

    if (
      lengthDescriptor === undefined ||
      lengthDescriptor.value !== length ||
      lengthDescriptor.writable !== true ||
      lengthDescriptor.enumerable !== false ||
      lengthDescriptor.configurable !== false ||
      keys.length !== length + 1
    ) {
      throw new Error("non-wire-array-surface");
    }

    const target = new Array(length);

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const key = String(index);
      const descriptor =
        descriptors[key];

      if (!requireOrdinaryDataDescriptor(descriptor)) {
        throw new Error("non-wire-array-index");
      }

      target[index] =
        cloneWireValue(
          descriptor.value,
          seen
        );
    }

    return target;
  }

  if (
    getPrototypeOf(value) !== objectPrototype ||
    !isExtensible(value)
  ) {
    throw new Error("non-wire-record");
  }

  const descriptors =
    getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  const target = {};

  for (const key of keys) {
    if (
      typeof key !== "string" ||
      !requireOrdinaryDataDescriptor(
        descriptors[key]
      )
    ) {
      throw new Error("non-wire-record-surface");
    }

    Object.defineProperty(
      target,
      key,
      {
        value:
          cloneWireValue(
            descriptors[key].value,
            seen
          ),
        writable: true,
        enumerable: true,
        configurable: true
      }
    );
  }

  return target;
}

function requireExactRecord(
  value,
  keys
) {
  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value) ||
    isProxy(value) ||
    isForbiddenBrand(value) ||
    getPrototypeOf(value) !== objectPrototype ||
    !isExtensible(value)
  ) {
    throw new Error("non-exact-record");
  }

  const descriptors =
    getOwnPropertyDescriptors(value);
  const actualKeys =
    ownKeys(descriptors);

  if (
    actualKeys.length !== keys.length ||
    actualKeys.some(
      (key) =>
        typeof key !== "string" ||
        !keys.includes(key)
    )
  ) {
    throw new Error("non-exact-record-keys");
  }

  for (const key of keys) {
    if (
      !requireOrdinaryDataDescriptor(
        descriptors[key]
      )
    ) {
      throw new Error("non-exact-record-surface");
    }
  }

  return descriptors;
}

function cloneRule(
  value
) {
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

  const rule = {
    id: descriptors.id.value,
    statement:
      descriptors.statement.value,
    kind: descriptors.kind.value,
    severity:
      descriptors.severity.value
  };

  if (
    typeof rule.id !== "string" ||
    rule.id.trim() === "" ||
    typeof rule.statement !== "string" ||
    rule.statement.trim() === "" ||
    ![
      "required",
      "forbidden",
      "conditional"
    ].includes(rule.kind) ||
    ![
      "critical",
      "major",
      "minor"
    ].includes(rule.severity)
  ) {
    throw new Error("invalid-rule");
  }

  return rule;
}

function cloneContract(
  value
) {
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

  if (
    descriptors.version.value !== 1 ||
    descriptors.status.value !== "confirmed" ||
    typeof descriptors.task.value !== "string" ||
    descriptors.task.value.trim() === ""
  ) {
    throw new Error("invalid-contract");
  }

  const sourceRules =
    descriptors.rules.value;

  if (
    !arrayIsArray(sourceRules) ||
    sourceRules.length < 1 ||
    sourceRules.length > 7 ||
    getPrototypeOf(sourceRules) !==
      arrayPrototype ||
    !isExtensible(sourceRules)
  ) {
    throw new Error("invalid-rules");
  }

  const ruleIds = new Set();
  const rules = sourceRules.map(
    (sourceRule) => {
      const rule = cloneRule(sourceRule);

      if (ruleIds.has(rule.id)) {
        throw new Error("duplicate-rule");
      }

      ruleIds.add(rule.id);
      return rule;
    }
  );

  return {
    version: 1,
    status: "confirmed",
    task: descriptors.task.value,
    rules
  };
}

function captureExperimentSeed(
  options
) {
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

    seed.contract =
      cloneContract(
        descriptors.contract.value
      );
    seed.input =
      cloneWireValue(
        descriptors.input.value,
        new Set()
      );
    seed.expectedOutput =
      cloneWireValue(
        descriptors.expectedOutput.value,
        new Set()
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

function cloneAttackForExperiment(
  attack
) {
  const expectedSeverity = {
    critical: 1,
    major: 0.7,
    minor: 0.4
  }[attack.rule.severity];

  if (
    typeof attack.id !== "string" ||
    attack.id.trim() === "" ||
    typeof attack.ruleId !== "string" ||
    attack.ruleId.trim() === "" ||
    typeof attack.type !== "string" ||
    attack.type.trim() === "" ||
    typeof attack.description !== "string" ||
    attack.description.trim() === "" ||
    typeof attack.rationale !== "string" ||
    attack.rationale.trim() === "" ||
    attack.ruleId !== attack.rule.id ||
    attack.severity !== expectedSeverity
  ) {
    throw new Error("invalid-attack");
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
      typeof value !== "number" ||
      !numberIsFinite(value) ||
      objectIs(value, -0) ||
      value < 0 ||
      value > 1
    ) {
      throw new Error("invalid-attack-score");
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
    output:
      cloneWireValue(
        attack.output,
        new Set()
      ),
    severity: attack.severity,
    realism: attack.realism,
    subtlety: attack.subtlety,
    novelty: attack.novelty,
    fixability: attack.fixability
  };
}

function isPrototypeBaselineExact() {
  const objectToJson =
    getOwnPropertyDescriptor(
      objectPrototype,
      "toJSON"
    );
  const arrayToJson =
    getOwnPropertyDescriptor(
      arrayPrototype,
      "toJSON"
    );

  return (
    getPrototypeOf(objectPrototype) ===
      objectPrototypeParent &&
    getPrototypeOf(arrayPrototype) ===
      arrayPrototypeParent &&
    objectToJson === undefined &&
    arrayToJson === undefined
  );
}

function assertTree(
  root
) {
  const seen = new Set();
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

    for (const key of ownKeys(descriptors)) {
      const descriptor = descriptors[key];

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

function assertExperimentDisjoint(
  experiment,
  legacyResult
) {
  const experimentNodes = new Set();
  const stack = [experiment];

  while (stack.length > 0) {
    const current = stack.pop();

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

    for (const key of ownKeys(descriptors)) {
      const descriptor = descriptors[key];

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

  const legacyStack = [
    legacyResult.generatedAttacks,
    legacyResult.discardedAttacks,
    legacyResult.attack,
    legacyResult.topFinding
  ];
  const legacySeen = new Set();

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

    for (const key of ownKeys(descriptors)) {
      const descriptor = descriptors[key];

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

function buildNonReplayableExperiment(
  task
) {
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

function buildExperiment(
  seed,
  result
) {
  if (
    !CAPABILITY_AVAILABLE ||
    seed.replayable !== true
  ) {
    return buildNonReplayableExperiment(
      result.task
    );
  }

  try {
    if (
      seed.contract.task !== result.task ||
      !isPrototypeBaselineExact()
    ) {
      throw new Error("experiment-authority-mismatch");
    }

    const attacks =
      result.generatedAttacks.map(
        cloneAttackForExperiment
      );

    const resultByAttackId = new Map(
      result.attack.results.map(
        (entry) => [entry.id, entry]
      )
    );

    const outcomes = attacks.map(
      (attack) => {
        const entry =
          resultByAttackId.get(attack.id);

        if (entry === undefined) {
          throw new Error("missing-outcome");
        }

        return {
          attackId: attack.id,
          evaluatorResult:
            entry.survived
              ? "PASS"
              : "FAIL",
          survived:
            entry.survived === true
        };
      }
    );

    const survivorOrderIds =
      result.attack.survivors.map(
        (entry) => entry.id
      );

    const experiment = {
      version: 1,
      kind: "contract-attack-experiment",
      replayable: true,
      task: result.task,
      contract: seed.contract,
      case: {
        input: seed.input,
        expectedOutput:
          seed.expectedOutput,
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
          survivorOrderIds.length === 0
            ? null
            : survivorOrderIds[0]
      }
    };

    assertTree(experiment);
    assertExperimentDisjoint(
      experiment,
      result
    );

    const wire =
      jsonStringify({ experiment });
    const parsed =
      jsonParse(wire);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      parsed.experiment === null ||
      typeof parsed.experiment !== "object" ||
      jsonStringify(parsed) !== wire
    ) {
      throw new Error("experiment-wire-drift");
    }

    assertTree(parsed.experiment);

    return experiment;
  } catch {
    return buildNonReplayableExperiment(
      result.task
    );
  }
}

module.exports = {
  buildExperiment,
  captureExperimentSeed
};
