"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks
} = require("../src/contract-attacks");

function makeContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "major"
      }
    ]
  };
}

function makeScores(overrides = {}) {
  return {
    realism: 0.9,
    subtlety: 0.8,
    novelty: 0.7,
    fixability: 0.9,
    ...overrides
  };
}

function makeAttack(overrides = {}) {
  return {
    id: "wrong-time",
    ruleId: "time-rule",
    type: "wrong-time",
    description: "Changes the approved time.",
    rationale: "Violates the confirmed rule.",
    mutatedOutput: {
      time: "4 PM"
    },
    scores: makeScores(),
    ...overrides
  };
}

function makeOptions(overrides = {}) {
  const contract = makeContract();

  return {
    contract,
    input: {
      request: "Schedule the meeting."
    },
    expectedOutput: {
      time: "3 PM"
    },
    evaluator(output) {
      return output.time === "3 PM";
    },
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: []
      };
    },
    ...overrides
  };
}

function generatorFor(contract, attack) {
  return function generator() {
    return {
      version: 1,
      task: contract.task,
      attacks: [attack]
    };
  };
}

test(
  "non-V1 retained attack output falls back without rejecting M8",
  async () => {
    const contract = makeContract();
    const shared = { value: "4 PM" };
    const attack = makeAttack({
      mutatedOutput: {
        a: shared,
        b: shared
      }
    });

    const result = await runContractAttacks(
      makeOptions({
        contract,
        evaluator() {
          return true;
        },
        generator: generatorFor(
          contract,
          attack
        )
      })
    );

    assert.equal(result.baselinePassed, true);
    assert.equal(result.experiment.replayable, false);
  }
);

test(
  "non-ordinary rules array makes only the experiment non-replayable",
  async () => {
    const contract = makeContract();

    Object.defineProperty(
      contract.rules,
      "0",
      {
        value: contract.rules[0],
        writable: false,
        enumerable: true,
        configurable: true
      }
    );

    const result = await runContractAttacks(
      makeOptions({ contract })
    );

    assert.equal(result.baselinePassed, true);
    assert.equal(result.experiment.replayable, false);
  }
);

test(
  "experiment is an own ordinary property despite inherited setter",
  async () => {
    const previous = Object.getOwnPropertyDescriptor(
      Object.prototype,
      "experiment"
    );

    Object.defineProperty(
      Object.prototype,
      "experiment",
      {
        set() {
          throw new Error("inherited setter must not run");
        },
        configurable: true
      }
    );

    try {
      const result = await runContractAttacks(
        makeOptions()
      );
      const descriptor =
        Object.getOwnPropertyDescriptor(
          result,
          "experiment"
        );

      assert.ok(descriptor);
      assert.equal(descriptor.writable, true);
      assert.equal(descriptor.enumerable, true);
      assert.equal(descriptor.configurable, true);
    } finally {
      if (previous === undefined) {
        delete Object.prototype.experiment;
      } else {
        Object.defineProperty(
          Object.prototype,
          "experiment",
          previous
        );
      }
    }
  }
);

test(
  "retention-time frozen output evidence produces non-replayable experiment",
  async () => {
    const contract = makeContract();
    const attack = makeAttack({
      mutatedOutput: Object.freeze({
        time: "4 PM"
      })
    });

    const result = await runContractAttacks(
      makeOptions({
        contract,
        generator: generatorFor(
          contract,
          attack
        )
      })
    );

    assert.equal(result.experiment.replayable, false);
  }
);

test(
  "retention-time negative zero score evidence produces non-replayable experiment",
  async () => {
    const contract = makeContract();
    const attack = makeAttack({
      scores: makeScores({
        novelty: -0
      })
    });

    const result = await runContractAttacks(
      makeOptions({
        contract,
        generator: generatorFor(
          contract,
          attack
        )
      })
    );

    assert.equal(result.experiment.replayable, false);
  }
);

test(
  "captured trim intrinsic controls experiment string validation",
  async () => {
    const previous = String.prototype.trim;

    String.prototype.trim = function tamperedTrim() {
      return "";
    };

    try {
      const result = await runContractAttacks(
        makeOptions()
      );

      assert.equal(result.experiment.replayable, true);
    } finally {
      String.prototype.trim = previous;
    }
  }
);

test(
  "deep valid wire trees do not depend on JavaScript recursion depth",
  async () => {
    const contract = makeContract();
    const root = {};
    let cursor = root;

    for (let index = 0; index < 12000; index += 1) {
      cursor.next = {};
      cursor = cursor.next;
    }

    cursor.time = "4 PM";

    const attack = makeAttack({
      mutatedOutput: root
    });

    const result = await runContractAttacks(
      makeOptions({
        contract,
        evaluator() {
          return true;
        },
        generator: generatorFor(
          contract,
          attack
        )
      })
    );

    assert.equal(result.experiment.replayable, true);
  }
);
