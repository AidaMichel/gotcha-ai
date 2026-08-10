const example = {
  userInput: "Schedule a meeting with Sara on Tuesday at 3 PM.",
  expectedOutput: "Meeting scheduled with Sara on Tuesday at 3 PM."
};

// ----------------------------------------
// ATTACK
// ----------------------------------------

// Gotcha deliberately creates bad behavior.
function mutateTime(output) {
  return output.replace("3 PM", "4 PM");
}

// The user's original evaluator is intentionally weak.
// It checks the person and day,
// but forgets to check the requested time.
function weakEvaluator(output) {
  const hasCorrectPerson = output.includes("Sara");
  const hasCorrectDay = output.includes("Tuesday");

  return hasCorrectPerson && hasCorrectDay;
}

const mutatedOutput = mutateTime(example.expectedOutput);
const firstResult = weakEvaluator(mutatedOutput);

console.log("\n================================");
console.log("GOTCHA — ATTACK");
console.log("================================\n");

console.log("User:");
console.log(example.userInput);

console.log("\nExpected:");
console.log(example.expectedOutput);

console.log("\nMutated output:");
console.log(mutatedOutput);

console.log("\nCurrent evaluator:");
console.log(firstResult ? "PASS ✅" : "FAIL ❌");

if (firstResult) {
  console.log("\n🚨 GOTCHA");
  console.log("A bad output passed the quality check.");

  console.log(
    "\nBlind spot: the evaluator checked the person and day but failed to verify the requested meeting time."
  );
}

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

// This represents the strengthened evaluator.
function strongerEvaluator(output) {
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
// RE-ATTACK
// ----------------------------------------

const secondResult = strongerEvaluator(mutatedOutput);

console.log("\n================================");
console.log("GOTCHA — RE-ATTACK");
console.log("================================\n");

console.log("Testing the same bad output again:");

console.log("\nMutated output:");
console.log(mutatedOutput);

console.log("\nImproved evaluator:");
console.log(secondResult ? "PASS ✅" : "FAIL ❌");

if (!secondResult) {
  console.log("\n✅ CAUGHT");
  console.log(
    "The stronger quality check now rejects the incorrect meeting time."
  );
}

console.log("\n================================");
console.log("RESULT");
console.log("================================\n");

console.log("Before fix: bad behavior survived ❌");
console.log("After fix: bad behavior was caught ✅");
