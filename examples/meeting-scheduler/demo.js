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

function attack(evaluator, mutations) {
  const results = mutations.map((mutation) => {
    const passed = evaluator(mutation.output);

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

  return {
    results,
    caught,
    survivors
  };
}

// ----------------------------------------
// FIRST ATTACK
// ----------------------------------------

const mutations = generateMutations(example.expectedOutput);

const before = attack(weakEvaluator, mutations);

console.log("\n================================");
console.log("GOTCHA — ATTACK");
console.log("================================\n");

console.log("User:");
console.log(example.userInput);

console.log("\nExpected:");
console.log(example.expectedOutput);

console.log(`\nAttacks generated: ${mutations.length}`);

console.log("\n================================");
console.log("ATTACK RESULTS");
console.log("================================");

before.results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.id}`);
  console.log(`Mutation: ${result.output}`);

  if (result.survived) {
    console.log("Result: 🚨 SURVIVED");
  } else {
    console.log("Result: ✅ CAUGHT");
  }
});

console.log("\n================================");
console.log("BEFORE FIX");
console.log("================================\n");

console.log(`Caught: ${before.caught.length}`);
console.log(`Survived: ${before.survivors.length}`);

before.survivors.forEach((survivor, index) => {
  console.log(
    `\n#${index + 1} ${survivor.id} — score ${survivor.rankScore.toFixed(2)}`
  );
  console.log(survivor.output);
});

// ----------------------------------------
// TOP GOTCHA
// ----------------------------------------

const topFinding = before.survivors[0];

console.log("\n================================");
console.log("🚨 TOP GOTCHA");
console.log("================================\n");

console.log(topFinding.output);

console.log("\nWhy it matters:");
console.log(topFinding.description);

// ----------------------------------------
// CATCH THIS
// ----------------------------------------

console.log("\n================================");
console.log("CATCH THIS");
console.log("================================\n");

const proposedProtection =
  "The scheduled meeting time must match the time explicitly requested by the user.";

console.log("Proposed protection:");
console.log(proposedProtection);

// ----------------------------------------
// IMPROVED EVALUATOR
// ----------------------------------------

function improvedEvaluator(output) {
  const hasCorrectPerson = output.includes("Sara");
  const hasCorrectDay = output.includes("Tuesday");
  const hasCorrectTime = output.includes("3 PM");

  return (
    hasCorrectPerson &&
    hasCorrectDay &&
    hasCorrectTime
  );
}

// ----------------------------------------
// RE-ATTACK EVERYTHING
// ----------------------------------------

const after = attack(improvedEvaluator, mutations);

console.log("\n================================");
console.log("GOTCHA — RE-ATTACK");
console.log("================================\n");

after.results.forEach((result, index) => {
  console.log(`\n${index + 1}. ${result.id}`);

  if (result.survived) {
    console.log("Result: 🚨 STILL SURVIVED");
  } else {
    console.log("Result: ✅ CAUGHT");
  }
});

// ----------------------------------------
// FINAL RESULT
// ----------------------------------------

console.log("\n================================");
console.log("RESULT");
console.log("================================\n");

console.log("Before protection:");
console.log(`Caught: ${before.caught.length}`);
console.log(`Survived: ${before.survivors.length}`);

console.log("\nAfter protection:");
console.log(`Caught: ${after.caught.length}`);
console.log(`Survived: ${after.survivors.length}`);

const improvement =
  before.survivors.length - after.survivors.length;

console.log(
  `\n✅ ${improvement} additional bad behavior(s) are now caught.`
);

if (after.survivors.length > 0) {
  console.log("\n⚠️ Gotcha is not claiming the system is perfect.");

  console.log(
    `${after.survivors.length} blind spot(s) still remain:`
  );

  after.survivors.forEach((survivor) => {
    console.log(`- ${survivor.id}`);
  });
} else {
  console.log("\n✅ No current mutations survived.");
}
