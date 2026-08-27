"use strict";

const {
  runContractAttacks:
    runContractAttacksCore
} = require("./contract-attacks-core");

const {
  buildExperiment,
  captureExperimentSeed
} = require("./contract-experiment");

const {
  makeExperimentResultView
} = require(
  "./contract-experiment-normalize"
);

async function runContractAttacks(
  options = {}
) {
  const experimentSeed =
    captureExperimentSeed(options);

  const result =
    await runContractAttacksCore(
      options
    );

  const experimentResultView =
    makeExperimentResultView(
      result
    );

  result.experiment =
    buildExperiment(
      experimentSeed,
      experimentResultView
    );

  return result;
}

module.exports = {
  runContractAttacks
};
