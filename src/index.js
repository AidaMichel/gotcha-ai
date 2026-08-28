const {
  runImprovementLoop
} = require("./engine");

const {
  compileMutationPack
} = require("./mutation-pack");

const {
  draftQualityContract,
  confirmQualityContract
} = require("./quality-contract");

const {
  runContractAttacks
} = require("./contract-attacks");

const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("./contract-remediation");

const {
  createStructuredProviderAdapter
} = require("./provider-adapter");

function runGotcha({
  evaluator,
  expectedOutput,
  mutationPack
}) {
  const mutations =
    compileMutationPack({
      output: expectedOutput,
      pack: mutationPack
    });

  return runImprovementLoop({
    evaluator,
    mutations,
    knownGoodOutput:
      expectedOutput
  });
}

module.exports = {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection,
  createStructuredProviderAdapter
};
