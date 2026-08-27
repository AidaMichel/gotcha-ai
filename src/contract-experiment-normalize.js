"use strict";

const {
  types: utilTypes
} = require("node:util");

const isProxy = utilTypes.isProxy;
const arrayIsArray = Array.isArray;
const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;
const getPrototypeOf =
  Object.getPrototypeOf;
const ownKeys = Reflect.ownKeys;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const numberIsFinite = Number.isFinite;
const objectIs = Object.is;

function cloneTrustedWireSnapshot(
  value,
  seen = new Set()
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
      !numberIsFinite(value) ||
      objectIs(value, -0)
    ) {
      throw new Error(
        "Trusted M8 snapshot contains a non-wire number."
      );
    }

    return value;
  }

  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value) ||
    seen.has(value)
  ) {
    throw new Error(
      "Trusted M8 snapshot is not a V1 tree."
    );
  }

  seen.add(value);

  const isArray = arrayIsArray(value);
  const prototype = getPrototypeOf(value);

  if (
    (isArray && prototype !== arrayPrototype) ||
    (!isArray && prototype !== objectPrototype)
  ) {
    throw new Error(
      "Trusted M8 snapshot has non-local prototype semantics."
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  if (isArray) {
    const length = value.length;
    const target = new Array(length);

    for (
      let index = 0;
      index < length;
      index += 1
    ) {
      const descriptor =
        descriptors[String(index)];

      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        throw new Error(
          "Trusted M8 snapshot must be dense data only."
        );
      }

      target[index] =
        cloneTrustedWireSnapshot(
          descriptor.value,
          seen
        );
    }

    return target;
  }

  const target = {};

  for (const key of ownKeys(descriptors)) {
    const descriptor = descriptors[key];

    if (
      typeof key !== "string" ||
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      throw new Error(
        "Trusted M8 snapshot must use enumerable string data properties only."
      );
    }

    Object.defineProperty(
      target,
      key,
      {
        value:
          cloneTrustedWireSnapshot(
            descriptor.value,
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

function cloneAttack(
  attack
) {
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
      cloneTrustedWireSnapshot(
        attack.output
      ),
    severity: attack.severity,
    realism: attack.realism,
    subtlety: attack.subtlety,
    novelty: attack.novelty,
    fixability: attack.fixability
  };
}

function makeExperimentResultView(
  result
) {
  return {
    task: result.task,
    generatedAttacks:
      result.generatedAttacks.map(
        cloneAttack
      ),
    discardedAttacks:
      result.discardedAttacks,
    attack: result.attack,
    topFinding: result.topFinding
  };
}

module.exports = {
  makeExperimentResultView
};
