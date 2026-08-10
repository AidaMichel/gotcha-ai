function calculateRankScore(mutation) {
  return (
    0.30 * mutation.severity +
    0.25 * mutation.realism +
    0.20 * mutation.subtlety +
    0.15 * mutation.novelty +
    0.10 * mutation.fixability
  );
}

function evaluateBoolean(
  check,
  output,
  label
) {
  const result = check(output);

  if (
    result !== null &&
    typeof result === "object" &&
    typeof result.then === "function"
  ) {
    throw new Error(
      "Async checks are not supported by this deterministic engine."
    );
  }

  if (typeof result !== "boolean") {
    throw new Error(
      `${label} must return a boolean.`
    );
  }

  return result;
}

function attack(evaluator, mutations) {
  const results = mutations.map((mutation) => {
    const passed = evaluateBoolean(
      evaluator,
      mutation.output,
      "Evaluator"
    );

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

function runImprovementLoop({
  evaluator,
  mutations,
  knownGoodOutput
}) {
  const before = attack(
    evaluator,
    mutations
  );

  const topFinding =
    before.survivors[0] || null;

  if (!topFinding) {
    return {
      before,
      topFinding: null,
      proposedProtection: null,
      positiveControlPassed: null,
      after: null,
      improvement: 0
    };
  }

  if (
    typeof topFinding.protectionCheck !==
    "function"
  ) {
    throw new Error(
      "Top finding must provide a protectionCheck function."
    );
  }

  function improvedEvaluator(output) {
    const passesExistingChecks =
      evaluateBoolean(
        evaluator,
        output,
        "Evaluator"
      );

    if (!passesExistingChecks) {
      return false;
    }

    return evaluateBoolean(
      topFinding.protectionCheck,
      output,
      "Protection check"
    );
  }

  const positiveControlPassed =
    improvedEvaluator(knownGoodOutput);

  if (!positiveControlPassed) {
    return {
      before,
      topFinding,
      proposedProtection:
        topFinding.protection,
      positiveControlPassed: false,
      after: null,
      improvement: 0
    };
  }

  const after = attack(
    improvedEvaluator,
    mutations
  );

  const improvement =
    before.survivors.length -
    after.survivors.length;

  return {
    before,
    topFinding,
    proposedProtection:
      topFinding.protection,
    positiveControlPassed: true,
    after,
    improvement
  };
}

module.exports = {
  attack,
  calculateRankScore,
  runImprovementLoop
};
