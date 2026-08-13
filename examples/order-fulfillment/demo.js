const {
  runGotcha
} = require("../../src");

const expectedOutput = {
  orderId: "ORD-1042",
  decision: "ship",
  quantity: 2,
  warehouse: "DXB-1"
};

function evaluator(output) {
  return (
    output.orderId === "ORD-1042" &&
    output.decision === "ship"
  );
}

const mutationPack = [
  {
    id: "wrong-quantity",
    type: "value-substitution",
    description:
      "Changes the shipment quantity while preserving the expected order and decision.",

    mutate(output) {
      output.quantity = 20;
      return output;
    },

    scores: {
      severity: 1,
      realism: 0.95,
      subtlety: 0.9,
      novelty: 0.8,
      fixability: 1
    },

    protection: {
      description:
        "Shipment quantity must match the approved quantity.",

      check(output) {
        return output.quantity === 2;
      }
    }
  },

  {
    id: "wrong-warehouse",
    type: "entity-substitution",
    description:
      "Changes the fulfillment warehouse while preserving the expected order and decision.",

    mutate(output) {
      output.warehouse = "LON-9";
      return output;
    },

    scores: {
      severity: 0.9,
      realism: 0.9,
      subtlety: 0.85,
      novelty: 0.75,
      fixability: 0.95
    },

    protection: {
      description:
        "Warehouse must match the approved fulfillment location.",

      check(output) {
        return output.warehouse === "DXB-1";
      }
    }
  },

  {
    id: "wrong-decision",
    type: "decision-substitution",
    description:
      "Changes the fulfillment decision from ship to hold.",

    mutate(output) {
      output.decision = "hold";
      return output;
    },

    scores: {
      severity: 1,
      realism: 0.8,
      subtlety: 0.4,
      novelty: 0.5,
      fixability: 1
    },

    protection: {
      description:
        "Fulfillment decision must remain correct.",

      check(output) {
        return output.decision === "ship";
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
  "Business domain: Order Fulfillment"
);

console.log(
  `Survivors before: ${JSON.stringify(
    result.before.survivors.map(
      (finding) => finding.id
    )
  )}`
);

console.log(
  `Top Gotcha: ${result.topFinding.id}`
);

console.log(
  `Protection: ${result.proposedProtection}`
);

console.log(
  `Survivors after: ${JSON.stringify(
    result.after.survivors.map(
      (finding) => finding.id
    )
  )}`
);

console.log(
  `Improvement: ${result.improvement}`
);
