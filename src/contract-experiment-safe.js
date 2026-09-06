"use strict";

const runtimeAuthority = require("./runtime-authority");
const {
  experimentIntrinsics
} = require("./contract-attacks-core");
const {
  isProxy,
  stringConstructor
} = experimentIntrinsics;

const experiment = require(
  "./contract-experiment"
);

// Capture every underlying experiment authority before any trusted callback can
// replace the module's exported properties. Recorder closures use only these
// lexical references afterwards.
const experimentBuildExperiment =
  experiment.buildExperiment;
const experimentCreateExperimentCapture =
  experiment.createExperimentCapture;
const experimentWithExperimentCapture =
  experiment.withExperimentCapture;
const experimentCaptureGeneratorOutput =
  experiment.captureGeneratorOutputForActiveExperiment;

const pristineIntrinsics =
  runtimeAuthority.consumerPrimordials;

const getOwnPropertyDescriptors =
  pristineIntrinsics.getOwnPropertyDescriptors;
const hasOwnProperty =
  pristineIntrinsics.hasOwnProperty;
const reflectApply =
  pristineIntrinsics.reflectApply;
const arrayIsArray =
  pristineIntrinsics.arrayIsArray;
const numberIsFinite =
  pristineIntrinsics.numberIsFinite;
const objectIs =
  pristineIntrinsics.objectIs;

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

function createExperimentCapture(options) {
  return experimentCreateExperimentCapture(
    options
  );
}

function isWireScore(value) {
  return (
    typeof value === "number" &&
    numberIsFinite(value) &&
    !objectIs(value, -0) &&
    value >= 0 &&
    value <= 1
  );
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

  // Index-based validation here is an authenticated precondition for the
  // underlying recorder. Ambient Array iteration cannot skip raw signed-zero
  // or invalid score evidence before M8 normalizes it.
  for (
    let index = 0;
    index < SCORE_KEYS.length;
    index += 1
  ) {
    const key = SCORE_KEYS[index];

    if (
      !hasOwn(scoreDescriptors, key) ||
      !hasOwn(
        scoreDescriptors[key],
        "value"
      ) ||
      !isWireScore(
        scoreDescriptors[key].value
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

  if (isProxy(attacks)) {
    return false;
  }

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
    const key = stringConstructor(index);

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

function createGeneratorEvidenceRecorder(
  context
) {
  return function recordGeneratorEvidence(
    value
  ) {
    if (!generatorSurfaceIsSafe(value)) {
      return value;
    }

    experimentWithExperimentCapture(
      context,
      () =>
        experimentCaptureGeneratorOutput(
          value,
          "Generator output"
        )
    );

    return value;
  };
}

module.exports = {
  buildExperiment: experimentBuildExperiment,
  createExperimentCapture,
  createGeneratorEvidenceRecorder
};
