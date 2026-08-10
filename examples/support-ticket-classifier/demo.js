const {
  runImprovementLoop
} = require("../../src/engine");

const example = {
  userInput: "My card was charged twice.",
  expectedOutput:
    "Category: billing\nPriority: high",
  expected: {
    category: "billing",
    priority: "high"
  }
};

function extractField(output, field) {
  const pattern = new RegExp(
    `^${field}:\\s*(.+)$`,
    "im"
  );

  const match = output.match(pattern);

  return match
    ? match[1].trim().toLowerCase()
    : null;
}

function generateMutations(output) {
  return [
    {
      id: "wrong-category",
      type: "entity-substitution",
      description:
        "Changes the ticket category.",

      output:
        "Category: technical\nPriority: high",

      severity: 1.0,
      realism: 1.0,
      subtlety: 0.95,
      novelty: 1.0,
      fixability: 1.0,

      protection:
        "The ticket category must match the expected category.",

      protectionCheck(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Category"
          ) === example.expected.category
        );
      }
    },

    {
      id: "wrong-priority",
      type: "value-substitution",
      description:
        "Changes the ticket priority.",

      output:
        "Category: billing\nPriority: low",

      severity: 0.95,
      realism: 0.95,
      subtlety: 0.9,
      novelty: 0.9,
      fixability: 1.0,

      protection:
        "The ticket priority must match the expected priority.",

      protectionCheck(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Priority"
          ) === example.expected.priority
        );
      }
    },

    {
      id: "missing-category",
      type: "missing-information",
      description:
        "Removes the ticket category.",

      output:
        "Priority: high",

      severity: 0.9,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 0.9,
      fixability: 0.95,

      protection:
        "Every classified ticket must include a category.",

      protectionCheck(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Category"
          ) !== null
        );
      }
    },

    {
      id: "unsupported-refund-promise",
      type: "unsupported-information",
      description:
        "Adds a refund promise that the classifier was never asked to make.",

      output:
        output +
        "\nAction: Refund will be issued.",

      severity: 0.7,
      realism: 0.8,
      subtlety: 0.7,
      novelty: 0.85,
      fixability: 0.75,

      protection:
        "The classifier must not invent customer-service actions.",

      protectionCheck(candidateOutput) {
        return !candidateOutput.includes(
          "Refund will be issued."
        );
      }
    }
  ];
}

// Deliberately weak.
// It checks only the priority.
function weakEvaluator(output) {
  return (
    extractField(
      output,
      "Priority"
    ) === example.expected.priority
  );
}

const mutations =
  generateMutations(example.expectedOutput);

const result = runImprovementLoop({
  evaluator: weakEvaluator,
  mutations,
  knownGoodOutput: example.expectedOutput
});

console.log("\nSUPPORT TICKET CLASSIFIER");
console.log("=========================\n");

console.log("User:");
console.log(example.userInput);

console.log("\nExpected:");
console.log(example.expectedOutput);

console.log("\nBefore protection:");
console.log(
  `Caught: ${result.before.caught.length}`
);
console.log(
  `Survived: ${result.before.survivors.length}`
);

console.log("\nTop Gotcha:");
console.log(result.topFinding.id);

console.log("\nProposed protection:");
console.log(result.proposedProtection);

console.log("\nPositive control:");
console.log(
  result.positiveControlPassed
    ? "✅ PASS"
    : "❌ FAIL"
);

console.log("\nAfter protection:");
console.log(
  `Caught: ${result.after.caught.length}`
);
console.log(
  `Survived: ${result.after.survivors.length}`
);

console.log(
  `\n✅ ${result.improvement} additional bad behavior(s) are now caught.`
);

if (result.after.survivors.length > 0) {
  console.log("\nRemaining blind spots:");

  result.after.survivors.forEach(
    (finding) => {
      console.log(`- ${finding.id}`);
    }
  );
}
