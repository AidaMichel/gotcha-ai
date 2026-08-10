const example = {
  userInput: "Schedule a meeting with Sara on Tuesday at 3 PM.",
  expectedOutput: "Meeting scheduled with Sara on Tuesday at 3 PM."
};

// ----------------------------------------
// MUTATION ENGINE
// ----------------------------------------

function generateMutations(output) {
  return [
    {
      id: "wrong-time",
      type: "value-substitution",
      description: "Changes the requested meeting time.",
      output: output.replace("3 PM", "4 PM"),

      severity: 1.0,
      realism: 1.0,
      subtlety: 0.95,
      novelty: 1.0,
      fixability: 1.0
    },

    {
      id: "wrong-person",
      type: "entity-substitution",
      description: "Changes the requested person.",
      output: output.replace("Sara", "Maya"),

      severity: 1.0,
      realism: 0.9,
      subtlety: 0.8,
      novelty: 1.0,
      fixability: 1.0
    },

    {
      id: "wrong-day",
      type: "date-substitution",
      description: "Changes the requested day.",
      output: output.replace("Tuesday", "Wednesday"),

      severity: 1.0,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 1.0,
      fixability: 1.0
    },

    {
      id: "missing-time",
      type: "missing-information",
      description: "Removes the explicitly requested time.",
      output: "Meeting scheduled with Sara on Tuesday.",

      severity: 0.9,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 0.9,
      fixability: 0.95
    },

    {
      id: "unsupported-location",
      type: "unsupported-information",
      description:
        "Invents a meeting location that the user never requested.",
      output:
        "Meeting scheduled with Sara on Tuesday at 3 PM in Conference Room B.",

      severity: 0.65,
      realism: 0.8,
      subtlety: 0.7,
      novelty: 0.85,
      fixability: 0.75
    }
  ];
}

// ----------------------------------------
// CURRENT EVALUATOR
// ----------------------------------------

function weakEvaluator(output) {
  const hasCorrectPerson = output.includes("Sara");
  const hasCorrectDay = output.includes("Tuesday");

  return hasCorrectPerson && hasCorrectDay;
}

// ----------------------------------------
// SURVIVOR RANKER
// ----------------------------------------

function calculateRankScore(mutation) {
  return (
    0.30 * mutation.severity +
    0.25 * mutation.realism +
    0.20 * mutation.subtlety +
    0.15 * mutation.novelty +
    0.10 * mutation.fixability
  );
}

// ----------------------------------------
// ATTACK
// ----------------------------------------

const mutations = generateMutations(example.expectedOutput);

const results = mutations.map((mutation) => {
  const passed = weakEvaluator(mutation.output);

  return {
    ...mutation,
    evaluatorResult: passed ? "PASS" : "FAIL",
    survived: passed
  };
});

const caught = results.filter((result) => !result.survived);

const survivors = results
  .filter((result) => result.survived)
  .map((survivor) => ({
    ...survivor,
    rankScore: calculateRankScore(survivor)
  }))
  .sort((a, b) => b.rankScore - a.rankScore);

// ----------------------------------------
// REPORT
// ----------------------------------------

console.log("\n================================");
console.log("GOTCHA — MUTATION ATTACK");
console.log("================================\n");

console.log("User:");
console.log(example.userInput);

console.log("\nExpected:");
console.log(example.expectedOutput);

console.log(`\nAttacks generated: ${mutations.length}`);

console.log("\n================================");
console.log("ATTACK RESULTS");
console.log("================================");

results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.id}`);
  console.log(`Type: ${result.type}`);
  console.log(`Mutation: ${result.output}`);

  if (result.survived) {
    console.log("Evaluator: PASS ✅");
    console.log("Result: 🚨 SURVIVED");
  } else {
    console.log("Evaluator: FAIL ❌");
    console.log("Result: ✅ CAUGHT");
  }
});

// ----------------------------------------
// SUMMARY
// ----------------------------------------

console.log("\n================================");
console.log("SUMMARY");
console.log("================================\n");

console.log(`Total attacks: ${results.length}`);
console.log(`Caught: ${caught.length}`);
console.log(`Survived: ${survivors.length}`);

if (survivors.length > 0) {
  console.log("\n🚨 GOTCHA");
  console.log(
    `${survivors.length} convincing bad behaviors slipped through the current quality checks.`
  );

  console.log("\n================================");
  console.log("RANKED SURVIVORS");
  console.log("================================");

  survivors.forEach((survivor, index) => {
    console.log(`\n#${index + 1} ${survivor.id}`);
    console.log(`Priority score: ${survivor.rankScore.toFixed(2)}`);
    console.log(`Type: ${survivor.type}`);
    console.log(`Output: ${survivor.output}`);
    console.log(`Why it matters: ${survivor.description}`);
  });

  const topFinding = survivors[0];

  console.log("\n================================");
  console.log("TOP GOTCHA");
  console.log("================================\n");

  console.log(`🚨 ${topFinding.id}`);
  console.log(topFinding.output);

  console.log("\nWhy this is the top finding:");
  console.log(topFinding.description);

  console.log(
    "\nGotcha ranked this failure highest based on severity, realism, subtlety, novelty, and fixability."
  );
}
