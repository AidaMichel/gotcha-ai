"use strict";

const {
  types: utilTypes
} = require("node:util");

const experiment = require(
  "./contract-experiment"
);

const arrayPrototype = Array.prototype;
const arrayIteratorSymbol = Symbol.iterator;
const defineProperty = Object.defineProperty;
const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;
const hasOwnProperty =
  Object.prototype.hasOwnProperty;
const reflectApply = Reflect.apply;
const arrayIsArray = Array.isArray;
const isProxy = utilTypes.isProxy;
const MapConstructor = Map;

const capturedArrayIteratorDescriptor =
  getOwnPropertyDescriptor(
    arrayPrototype,
    arrayIteratorSymbol
  );

const RAW_ATTACK_KEYS = [
  "id",
  "mutatedOutput",
  "scores"
];

const SCORE_KEYS = [
  "realism",
  "subtlety",
  "novelty",
  "fixability"
];

function hasOwn(value, key) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}

function sameDescriptor(left, right) {
  if (
    left === undefined ||
    right === undefined
  ) {
    return left === right;
  }

  return (
    left.value === right.value &&
    left.get === right.get &&
    left.set === right.set &&
    left.writable === right.writable &&
    left.enumerable === right.enumerable &&
    left.configurable === right.configurable
  );
}

function makeNonReplayableCapture() {
  return {
    seed: {
      replayable: false,
      contract: null,
      input: null,
      expectedOutput: null
    },
    generatorCaptured: false,
    generatorEvidenceValid: false,
    rawAttackById: new MapConstructor()
  };
}

function createExperimentCapture(options) {
  const currentDescriptor =
    getOwnPropertyDescriptor(
      arrayPrototype,
      arrayIteratorSymbol
    );

  if (
    sameDescriptor(
      currentDescriptor,
      capturedArrayIteratorDescriptor
    )
  ) {
    return experiment.createExperimentCapture(
      options
    );
  }

  if (
    currentDescriptor !== undefined &&
    currentDescriptor.configurable !== true
  ) {
    return makeNonReplayableCapture();
  }

  try {
    if (
      capturedArrayIteratorDescriptor ===
        undefined
    ) {
      delete arrayPrototype[
        arrayIteratorSymbol
      ];
    } else {
      defineProperty(
        arrayPrototype,
        arrayIteratorSymbol,
        capturedArrayIteratorDescriptor
      );
    }

    return experiment.createExperimentCapture(
      options
    );
  } finally {
    if (currentDescriptor === undefined) {
      delete arrayPrototype[
        arrayIteratorSymbol
      ];
    } else {
      defineProperty(
        arrayPrototype,
        arrayIteratorSymbol,
        currentDescriptor
      );
    }
  }
}

function rawAttackSurfaceIsSafe(rawAttack) {
  if (
    rawAttack === null ||
    typeof rawAttack !== "object" ||
    isProxy(rawAttack)
  ) {
    return false;
  }

  const descriptors =
    getOwnPropertyDescriptors(rawAttack);

  for (
    let index = 0;
    index < RAW_ATTACK_KEYS.length;
    index += 1
  ) {
    if (
      !hasOwn(
        descriptors,
        RAW_ATTACK_KEYS[index]
      )
    ) {
      return false;
    }
  }

  const scoresDescriptor =
    descriptors.scores;

  if (
    !hasOwn(scoresDescriptor, "value") ||
    scoresDescriptor.value === null ||
    typeof scoresDescriptor.value !==
      "object" ||
    isProxy(scoresDescriptor.value)
  ) {
    return true;
  }

  const scoreDescriptors =
    getOwnPropertyDescriptors(
      scoresDescriptor.value
    );

  for (
    let index = 0;
    index < SCORE_KEYS.length;
    index += 1
  ) {
    if (
      !hasOwn(
        scoreDescriptors,
        SCORE_KEYS[index]
      )
    ) {
      return false;
    }
  }

  return true;
}

function generatorSurfaceIsSafe(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    isProxy(value)
  ) {
    return false;
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  if (!hasOwn(descriptors, "attacks")) {
    return false;
  }

  const attacksDescriptor =
    descriptors.attacks;

  if (!hasOwn(attacksDescriptor, "value")) {
    return true;
  }

  const attacks = attacksDescriptor.value;

  if (!arrayIsArray(attacks)) {
    return true;
  }

  const attackDescriptors =
    getOwnPropertyDescriptors(attacks);

  if (!hasOwn(attackDescriptors, "length")) {
    return false;
  }

  for (
    let index = 0;
    index < attacks.length;
    index += 1
  ) {
    const key = String(index);

    if (
      !hasOwn(attackDescriptors, key) ||
      !hasOwn(
        attackDescriptors[key],
        "value"
      ) ||
      !rawAttackSurfaceIsSafe(
        attackDescriptors[key].value
      )
    ) {
      return false;
    }
  }

  return true;
}

function captureGeneratorOutputForActiveExperiment(
  value,
  label
) {
  if (label !== "Generator output") {
    return experiment
      .captureGeneratorOutputForActiveExperiment(
        value,
        label
      );
  }

  if (!generatorSurfaceIsSafe(value)) {
    return;
  }

  return experiment
    .captureGeneratorOutputForActiveExperiment(
      value,
      label
    );
}

module.exports = {
  buildExperiment: experiment.buildExperiment,
  captureGeneratorOutputForActiveExperiment,
  createExperimentCapture,
  withExperimentCapture:
    experiment.withExperimentCapture
};
