function calculateRankScore(mutation) {
  return (
    0.30 * mutation.severity +
    0.25 * mutation.realism +
    0.20 * mutation.subtlety +
    0.15 * mutation.novelty +
    0.10 * mutation.fixability
  );
}

function attack(evaluator, mutations) {
  const results = mutations.map((mutation) => {
    const passed = evaluator(mutation.output);

    if (
      passed !== null &&
      typeof passed === "object" &&
      typeof passed.then === "function"
    ) {
      throw new Error(
        "Async evaluators are not supported by this deterministic engine."
      );
    }

    if (typeof passed !== "boolean") {
      throw new Error(
        "Evaluator must return a boolean."
      );
    }

    return {
      ...mutation,
      evaluatorResult: passed ? "PASS" : "FAIL",
      survived: passed
    };
  });

  const caught = results.filter(
    (result) => !result.survived
  );

  const survivors = results
    .filter((result) => result.survived)
    .map((survivor) => ({
      ...survivor,
      rankScore: calculateRankScore(survivor)
    }))
    .sort(
      (a, b) => b.rankScore - a.rankScore
    );

  return {
    results,
    caught,
    survivors
  };
}

module.exports = {
  attack,
  calculateRankScore
};
