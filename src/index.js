const {
  runImprovementLoop
} = require("./engine");

const {
  compileMutationPack
} = require("./mutation-pack");

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
  runGotcha
};
