const {
  runGotcha
} = require("../src");

// 1. Replace this with a known-good output
// from your own AI product or workflow.
const expectedOutput = {
  result: "correct",
  importantValue: 100
};

// 2. Replace this with your CURRENT evaluator.
//
// Gotcha attacks what your evaluator currently
// considers "good."
function evaluator(output) {
  return (
    output.result === "correct"
  );
}

// 3. Define attacks that should matter
// for your business or quality definition.
const mutationPack = [
  {
    id: "wrong-important-value",

    type: "value-substitution",

    description:
      "Changes an important value while preserving what the current evaluator checks.",

    mutate(output) {
      output.importantValue = 999;

      return output;
    },

    scores: {
      severity: 1,
      realism: 0.9,
      subtlety: 0.9,
      novelty: 0.7,
      fixability: 1
    },

    protection: {
      description:
        "The important value must remain correct.",

      check(output) {
        return (
          output.importantValue === 100
        );
      }
    }
  }
];

// Gotcha itself does not need to know
// what business domain this belongs to.
const result =
  runGotcha({
    evaluator,
    expectedOutput,
    mutationPack
  });

console.log(
  `Survivors before: ${JSON.stringify(
    result.before.survivors.map(
      (finding) => finding.id
    )
  )}`
);

if (result.topFinding) {
  console.log(
    `Top Gotcha: ${result.topFinding.id}`
  );

  console.log(
    `Protection: ${result.proposedProtection}`
  );

  if (
    result.positiveControlPassed === false
  ) {
    console.log(
      "Protection rejected: it also rejects the known-good output."
    );
  } else {
    console.log(
      `Survivors after: ${JSON.stringify(
        result.after.survivors.map(
          (finding) => finding.id
        )
      )}`
    );
  }
} else {
  console.log(
    "No mutation survived the current evaluator."
  );
}
