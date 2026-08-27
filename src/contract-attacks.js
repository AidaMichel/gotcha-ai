"use strict";

const {
  buildExperiment,
  createExperimentCapture,
  createGeneratorEvidenceRecorder
} = require("./contract-experiment-safe");

const {
  runContractAttacks:
    runContractAttacksCore
} = require("./contract-attacks-core");

const defineProperty =
  Object.defineProperty;

async function runContractAttacks(
  options = {}
) {
  const experimentCapture =
    createExperimentCapture(options);
  const recordGeneratorEvidence =
    createGeneratorEvidenceRecorder(
      experimentCapture
    );

  const result =
    await runContractAttacksCore(
      options,
      recordGeneratorEvidence
    );

  const experiment =
    buildExperiment(
      experimentCapture,
      result
    );

  defineProperty(
    result,
    "experiment",
    {
      value: experiment,
      writable: true,
      enumerable: true,
      configurable: true
    }
  );

  return result;
}

module.exports = {
  runContractAttacks
};
