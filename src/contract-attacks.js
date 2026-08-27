"use strict";

const {
  buildExperiment,
  captureGeneratorOutputForActiveExperiment,
  createExperimentCapture,
  withExperimentCapture
} = require("./contract-experiment-safe");

const {
  withSnapshotCaptureListener
} = require("./contract-experiment-hook");

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

  const result =
    await withExperimentCapture(
      experimentCapture,
      () =>
        withSnapshotCaptureListener(
          captureGeneratorOutputForActiveExperiment,
          () =>
            runContractAttacksCore(
              options
            )
        )
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
