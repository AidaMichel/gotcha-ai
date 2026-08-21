"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const {
  cloneAiData,
  snapshotAiData
} = require("../src/ai-data");

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
        severity: "critical"
      }
    ]
  };
}

function validGeneratorOutput(mutatedOutput = { time: "4 PM" }) {
  return {
    version: 1,
    task: "Return the approved time.",
    attacks: [
      {
        id: "wrong-time",
        ruleId: "time-rule",
        type: "wrong-time",
        description: "Changes the approved time.",
        rationale: "Proposed violation of the confirmed time rule.",
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

function makeOptions({
  generator,
  evaluator = () => true,
  input = { request: "3 PM" },
  expectedOutput = { time: "3 PM" }
}) {
  return {
    contract: makeContract(),
    input,
    expectedOutput,
    evaluator,
    generator
  };
}

async function captureUnhandled(callback) {
  let unhandled = null;
  const listener = (reason) => {
    unhandled = reason;
  };

  process.once("unhandledRejection", listener);

  try {
    await callback();
    await new Promise((resolve) => setImmediate(resolve));
    return unhandled;
  } finally {
    process.removeListener("unhandledRejection", listener);
  }
}

test("rejected non-extensible foreign Promises with frozen standard prototypes are observed", async () => {
  const unhandled = await captureUnhandled(async () => {
    const promise = vm.runInNewContext(`
      (() => {
        const value = Promise.reject(new Error("frozen foreign rejection"));
        Object.preventExtensions(value);
        Object.freeze(Promise.prototype);
        return value;
      })()
    `);

    await assert.rejects(
      runContractAttacks(
        makeOptions({
          generator: () => promise
        })
      ),
      /frozen foreign rejection/
    );
  });

  assert.equal(unhandled, null);
});

test("prototype-tampered vm.Script remains an unsupported runtime object without executing code", () => {
  const marker = `__gotcha_vm_script_${Date.now()}_${Math.random()}`;
  const script = new vm.Script(`globalThis[${JSON.stringify(marker)}] = true`);

  delete script.sourceURL;
  delete script.sourceMapURL;
  script.foo = "bar";
  Object.setPrototypeOf(script, Object.prototype);

  assert.throws(
    () => cloneAiData(script),
    /unsupported runtime object/
  );

  assert.equal(globalThis[marker], undefined);
});

test("deep acyclic AI-safe objects remain supported without recursive structuredClone probing", () => {
  const root = {};
  let cursor = root;

  for (let index = 0; index < 2500; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }

  cursor.value = "ok";

  const cloned = cloneAiData(root);
  const snapshot = snapshotAiData(root);

  for (const candidate of [cloned, snapshot]) {
    let current = candidate;

    for (let index = 0; index < 2500; index += 1) {
      current = current.next;
    }

    assert.equal(current.value, "ok");
  }
});

test("evaluator-facing arrays cannot expose or mutate the process Array.prototype", async () => {
  let sawAttack = false;

  const result = await runContractAttacks(
    makeOptions({
      input: ["3 PM"],
      expectedOutput: ["3 PM"],
      generator: () => validGeneratorOutput(["4 PM"]),
      evaluator(output) {
        if (Array.isArray(output) && output[0] === "4 PM") {
          sawAttack = true;
          const prototype = Object.getPrototypeOf(output);

          assert.notEqual(prototype, Array.prototype);
          assert.equal(
            Reflect.set(
              prototype,
              "filter",
              () => []
            ),
            false
          );
        }

        return true;
      }
    })
  );

  assert.equal(sawAttack, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.equal(result.topFinding.id, "wrong-time");
  assert.equal(Array.prototype.filter.call([1], () => true).length, 1);
});

test("callback-time Object.freeze tampering cannot disable detached frozen snapshots", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const modulePath = path.resolve(__dirname, "../src/contract-attacks.js");

  const script = `
    "use strict";
    const { runContractAttacks } = require(${JSON.stringify(modulePath)});

    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved time.",
      rules: [{
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "critical"
      }]
    };

    function generatorOutput() {
      return {
        version: 1,
        task: "Return the approved time.",
        attacks: [{
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the approved time.",
          rationale: "Proposed violation.",
          mutatedOutput: { time: "4 PM" },
          scores: { realism: 1, subtlety: 1, novelty: 1, fixability: 1 }
        }]
      };
    }

    runContractAttacks({
      contract,
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator(output) {
        if (output.time === "4 PM") {
          if (Reflect.set(output, "time", "9 PM")) {
            throw new Error("evaluator output was mutable");
          }
        }
        return true;
      },
      generator() {
        Object.freeze = (value) => value;
        return generatorOutput();
      }
    }).then(
      (result) => {
        if (result.generatedAttacks[0].output.time !== "4 PM") {
          throw new Error("generated attack snapshot mutated");
        }
        if (result.attack.results[0].output.time !== "4 PM") {
          throw new Error("stored attack result mutated");
        }
      },
      (error) => {
        console.error(error);
        process.exitCode = 2;
      }
    );
  `;

  const child = spawnSync(
    process.execPath,
    ["-e", script],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});
