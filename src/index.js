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
  confirmQualityContract
};
