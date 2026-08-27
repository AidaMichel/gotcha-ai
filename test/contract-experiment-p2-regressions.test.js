"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  spawnSync
} = require("node:child_process");

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

test(
  "seed capture ignores a tampered Array iterator",
  async () => {
    const previousIterator =
      Array.prototype[Symbol.iterator];

    Array.prototype[Symbol.iterator] =
      function poisonedIterator() {
        if (
          this.length === 3 &&
          this[0] === "contract" &&
          this[1] === "input" &&
          this[2] === "expectedOutput"
        ) {
          throw new Error(
            "mutable Array iterator must not run"
          );
        }

        return Reflect.apply(
          previousIterator,
          this,
          []
        );
      };

    try {
      const result = await runContractAttacks(
        makeOptions()
      );

      assert.equal(
        result.experiment.replayable,
        true
      );
    } finally {
      Array.prototype[Symbol.iterator] =
        previousIterator;
    }
  }
);

test(
  "missing generator attacks does not invoke an inherited getter",
  async () => {
    const previous =
      Object.getOwnPropertyDescriptor(
        Object.prototype,
        "attacks"
      );
    let getterCalls = 0;

    Object.defineProperty(
      Object.prototype,
      "attacks",
      {
        get() {
          getterCalls += 1;
          throw new Error(
            "inherited attacks getter must not run"
          );
        },
        configurable: true
      }
    );

    try {
      await assert.rejects(
        () =>
          runContractAttacks(
            makeOptions({
              generator() {
                return {
                  version: 1,
                  task:
                    "Return the approved time."
                };
              }
            })
          )
      );

      assert.equal(getterCalls, 0);
    } finally {
      if (previous === undefined) {
        delete Object.prototype.attacks;
      } else {
        Object.defineProperty(
          Object.prototype,
          "attacks",
          previous
        );
      }
    }
  }
);

test(
  "experiment capture works when the M8 core is already cached",
  () => {
    const repoRoot = path.resolve(
      __dirname,
      ".."
    );

    const script = String.raw`
      "use strict";
      require("./src/contract-attacks-core");
      const { runContractAttacks } = require("./src/contract-attacks");
      const contract = {
        version: 1,
        status: "confirmed",
        task: "Return the approved time.",
        rules: [{
          id: "time-rule",
          statement: "Time must be 3 PM.",
          kind: "required",
          severity: "major"
        }]
      };
      runContractAttacks({
        contract,
        input: { request: "Schedule the meeting." },
        expectedOutput: { time: "3 PM" },
        evaluator(output) {
          return output.time === "3 PM";
        },
        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: []
          };
        }
      }).then((result) => {
        if (result.experiment.replayable !== true) {
          process.exitCode = 2;
        }
      }).catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    const child = spawnSync(
      process.execPath,
      ["-e", script],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );

    assert.equal(
      child.status,
      0,
      child.stderr || child.stdout
    );
  }
);
