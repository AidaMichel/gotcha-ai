const {
  runImprovementLoop
} = require("../../src/engine");

const {
  compileMutationPack
} = require("../../src/mutation-pack");

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

const mutationPack = [
  {
    id: "wrong-category",
    type: "entity-substitution",
    description:
      "Changes the ticket category.",

    mutate() {
      return (
        "Category: technical\n" +
        "Priority: high"
      );
    },

    scores: {
      severity: 1.0,
      realism: 1.0,
      subtlety: 0.95,
      novelty: 1.0,
      fixability: 1.0
    },

    protection: {
      description:
        "The ticket category must match the expected category.",

      check(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Category"
          ) === example.expected.category
        );
      }
    }
  },

  {
    id: "wrong-priority",
    type: "value-substitution",
    description:
      "Changes the ticket priority.",

    mutate() {
      return (
        "Category: billing\n" +
        "Priority: low"
      );
    },

    scores: {
      severity: 0.95,
      realism: 0.95,
      subtlety: 0.9,
      novelty: 0.9,
      fixability: 1.0
    },

    protection: {
      description:
        "The ticket priority must match the expected priority.",

      check(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Priority"
          ) === example.expected.priority
        );
      }
    }
  },

  {
    id: "missing-category",
    type: "missing-information",
    description:
      "Removes the ticket category.",

    mutate() {
      return "Priority: high";
    },

    scores: {
      severity: 0.9,
      realism: 0.95,
      subtlety: 0.85,
      novelty: 0.9,
      fixability: 0.95
    },

    protection: {
      description:
        "Every classified ticket must include a category.",

      check(candidateOutput) {
        return (
          extractField(
            candidateOutput,
            "Category"
          ) !== null
        );
      }
    }
  },

  {
    id: "unsupported-refund-promise",
    type: "unsupported-information",
    description:
      "Adds a refund promise that the classifier was never asked to make.",

    mutate(output) {
      return (
        output +
        "\nAction: Refund will be issued."
      );
    },

    scores: {
      severity: 0.7,
      realism: 0.8,
      subtlety: 0.7,
      novelty: 0.85,
      fixability: 0.75
    },

    protection: {
      description:
        "The classifier must not invent customer-service actions.",

      check(candidateOutput) {
        return !candidateOutput.includes(
          "Refund will be issued."
        );
      }
    }
  }
];

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
  compileMutationPack({
    output: example.expectedOutput,
    pack: mutationPack
  });

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
