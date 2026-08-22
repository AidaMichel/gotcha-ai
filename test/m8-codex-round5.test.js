"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const {
  runContractAttacks
} = require("../src");

const {
  cloneAiData
} = require("../src/ai-data");

function confirmedContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved value.",
    rules: [
      {
        id: "value-rule",
        statement: "Return the approved value.",
        kind: "required",
        severity: "critical"
      }
    ]
  };
}

function generatorOutput(mutatedOutput) {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: [
      {
        id: "wrong-value",
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput,
        scores: {
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        }
      }
    ]
  };
}

function deepValue(depth, leaf) {
  const root = {};
  let cursor = root;

  for (let index = 0; index < depth; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }

  cursor.value = leaf;
  return root;
}

test(
  "deep unchanged outputs use stack-safe equality",
  async () => {
    const expectedOutput =
      deepValue(2500, "approved");

    const result =
      await runContractAttacks({
        contract: confirmedContract(),
        input: { request: "approved" },
        expectedOutput,
        evaluator: () => true,
        generator: () =>
          generatorOutput(
            deepValue(2500, "approved")
          )
      });

    assert.equal(
      result.generatedAttacks.length,
      0
    );
    assert.equal(
      result.discardedAttacks.length,
      1
    );
    assert.equal(
      result.discardedAttacks[0].reason,
      "unchanged-output"
    );
  }
);

test(
  "contextified vm objects fail the AI-data boundary",
  () => {
    const context =
      vm.createContext({
        foo: "bar"
      });

    assert.equal(
      vm.isContext(context),
      true
    );

    assert.throws(
      () =>
        cloneAiData(
          context,
          "context"
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "Promise detection survives callback tampering without unhandled rejection",
  () => {
    const source = String.raw`
      "use strict";
      const util = require("node:util");
      const { runContractAttacks } = require("./src");

      const contract = ${JSON.stringify(confirmedContract())};
      const original = util.types.isPromise;

      (async () => {
        try {
          await runContractAttacks({
            contract,
            input: { request: "approved" },
            expectedOutput: { value: "approved" },
            evaluator: () => true,
            generator() {
              util.types.isPromise = () => false;
              return Promise.reject(
                new Error("captured predicate rejection")
              );
            }
          });
          throw new Error("expected rejection");
        } catch (error) {
          if (!/captured predicate rejection/.test(String(error && error.message))) {
            throw error;
          }
        } finally {
          util.types.isPromise = original;
        }
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    const child = spawnSync(
      process.execPath,
      [
        "--unhandled-rejections=strict",
        "-e",
        source
      ],
      {
        cwd: process.cwd(),
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

test(
  "generator schema rejects inherited required fields",
  () => {
    const source = String.raw`
      "use strict";
      const { runContractAttacks } = require("./src");

      const contract = ${JSON.stringify(confirmedContract())};
      const descriptors = {
        version: Object.getOwnPropertyDescriptor(Object.prototype, "version"),
        task: Object.getOwnPropertyDescriptor(Object.prototype, "task"),
        attacks: Object.getOwnPropertyDescriptor(Object.prototype, "attacks")
      };

      function restore(key) {
        const descriptor = descriptors[key];
        if (descriptor === undefined) {
          delete Object.prototype[key];
        } else {
          Object.defineProperty(Object.prototype, key, descriptor);
        }
      }

      (async () => {
        try {
          await runContractAttacks({
            contract,
            input: { request: "approved" },
            expectedOutput: { value: "approved" },
            evaluator: () => true,
            generator() {
              Object.prototype.version = 1;
              Object.prototype.task = "Return the approved value.";
              Object.prototype.attacks = [${JSON.stringify(generatorOutput({ value: "wrong" }).attacks[0])}];
              return {};
            }
          });
          throw new Error("inherited generator schema was accepted");
        } catch (error) {
          if (!/own data property/.test(String(error && error.message))) {
            throw error;
          }
        } finally {
          restore("version");
          restore("task");
          restore("attacks");
        }
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    const child = spawnSync(
      process.execPath,
      ["-e", source],
      {
        cwd: process.cwd(),
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

test(
  "evaluator-facing arrays preserve instanceof Array",
  async () => {
    let generatorCalled = false;

    const result =
      await runContractAttacks({
        contract: confirmedContract(),
        input: { request: "approved" },
        expectedOutput: [],
        evaluator: (output) =>
          output instanceof Array,
        generator: () => {
          generatorCalled = true;
          return generatorOutput(["wrong"]);
        }
      });

    assert.equal(generatorCalled, true);
    assert.equal(
      result.generatedAttacks.length,
      1
    );
    assert.equal(
      result.topFinding.id,
      "wrong-value"
    );
  }
);
