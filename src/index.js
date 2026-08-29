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
  generateContractProtectionProposal
} = require("./contract-protection-proposal");

const {
  createStructuredProviderAdapter
} = require("./provider-adapter-m13");

const {
  prepareContractQualityLoop,
  completeContractQualityLoop
} = require("./contract-quality-loop");

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
  generateContractProtectionProposal,
  createStructuredProviderAdapter,
  prepareContractQualityLoop,
  completeContractQualityLoop
};