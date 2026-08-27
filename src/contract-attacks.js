"use strict";

const {
  buildExperiment,
  captureGeneratorOutputForActiveExperiment,
  createExperimentCapture,
  withExperimentCapture
} = require("./contract-experiment");

const aiData = require("./ai-data");
const originalSnapshotAiData =
  aiData.snapshotAiData;

aiData.snapshotAiData =
  function experimentAwareSnapshotAiData(
    value,
    label
  ) {
    captureGeneratorOutputForActiveExperiment(
      value,
      label
    );

    return originalSnapshotAiData(
      value,
      label
    );
  };

let runContractAttacksCore;

try {
  ({
    runContractAttacks:
      runContractAttacksCore
  } = require("./contract-attacks-core"));
} finally {
  aiData.snapshotAiData =
    originalSnapshotAiData;
}

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
        runContractAttacksCore(
          options
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
