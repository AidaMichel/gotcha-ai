const {
  runGotcha
} = require("../src");

const expectedOutput = {
  product: "Starter Plan",
  price: 20
};

// Current eval only checks the product name.
// It accidentally ignores the price.
function evaluator(output) {
  return (
    output.product ===
    "Starter Plan"
  );
}

const mutationPack = [
  {
    id: "wrong-price",
    type: "value-substitution",

    description:
      "Changes the price while keeping the product correct.",

    mutate(output) {
      output.price = 200;
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
        "Product price must remain correct.",

      check(output) {
        return output.price === 20;
      }
    }
  }
];

const result =
  runGotcha({
    evaluator,
    expectedOutput,
    mutationPack
  });

console.log(
  `Evaluator said: ${
    result.before
      .survivors.length > 0
      ? "PASS"
      : "FAIL"
  }`
);

console.log(
  `Gotcha: ${result.topFinding.id} survived`
);

console.log(
  `Why: ${result.topFinding.description}`
);

console.log(
  `Protection: ${result.proposedProtection}`
);

console.log(
  `Re-attack: ${
    result.after
      .survivors.length === 0
      ? "CAUGHT"
      : "STILL SURVIVES"
  }`
);
