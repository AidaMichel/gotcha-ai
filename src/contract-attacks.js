"use strict";

const {
  runContractAttacks:
    runContractAttacksCore
} = require("./contract-attacks-core");

const {
  buildExperiment,
  captureExperimentSeed
} = require("./contract-experiment");

async function runContractAttacks(
  options = {}
) {
  const experimentSeed =
    captureExperimentSeed(options);

  const result =
    await runContractAttacksCore(
      options
    );

  result.experiment =
    buildExperiment(
      experimentSeed,
      result
    );

  return result;
}

module.exports = {
  runContractAttacks
};
