"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { cloneAiData } = require("../src/ai-data");
const { runContractAttacks } = require("../src/contract-attacks");

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

function validGeneratorOutput() {
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
        mutatedOutput: { time: "4 PM" },
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

function makeOptions(generator, input = { request: "3 PM" }) {
  return {
    contract: makeContract(),
    input,
    expectedOutput: { time: "3 PM" },
    evaluator() {
      return true;
    },
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

test("Headers and FormData brands remain rejected when own data is added", () => {
  const candidates = [];
  if (typeof Headers === "function") {
    candidates.push(new Headers());
  }
  if (typeof FormData === "function") {
    candidates.push(new FormData());
  }

  for (const value of candidates) {
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);
    assert.throws(
      () => cloneAiData(value)
    );
  }
});

test("WebAssembly hidden-slot families fail closed without structuredClone fallback", () => {
  const candidates = [];
  if (typeof WebAssembly.Memory === "function") {
    candidates.push(new WebAssembly.Memory({ initial: 1 }));
  }
  if (typeof WebAssembly.Table === "function") {
    candidates.push(new WebAssembly.Table({ initial: 1, element: "anyfunc" }));
  }
  if (typeof WebAssembly.Global === "function") {
    candidates.push(new WebAssembly.Global({ value: "i32", mutable: true }, 1));
  }

  for (const value of candidates) {
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);
    assert.throws(
      () => cloneAiData(value)
    );
  }
});

test("non-extensible cross-realm rejected Promises are observed", async () => {
  const unhandled = await captureUnhandled(async () => {
    const promise = vm.runInNewContext(`
      (() => {
        const value = Promise.reject(new Error("foreign rejection"));
        Object.preventExtensions(value);
        return value;
      })()
    `);

    await assert.rejects(
      runContractAttacks(
        makeOptions(() => promise)
      ),
      /foreign rejection/
    );
  });

  assert.equal(unhandled, null);
});

test("generator data uses detached safe prototypes without exposing shared built-ins", async () => {
  const result = await runContractAttacks(
    makeOptions(
      ({ contract, input, expectedOutput }) => {
        const inputPrototype = Object.getPrototypeOf(input);
        const contractPrototype = Object.getPrototypeOf(contract);
        const rulesPrototype = Object.getPrototypeOf(contract.rules);
        const outputPrototype = Object.getPrototypeOf(expectedOutput);

        assert.notEqual(inputPrototype, Array.prototype);
        assert.notEqual(rulesPrototype, Array.prototype);
        assert.notEqual(contractPrototype, Object.prototype);
        assert.notEqual(outputPrototype, Object.prototype);

        assert.equal(typeof input.map, "function");
        assert.equal(typeof contract.rules.map, "function");

        assert.equal(
          Object.getPrototypeOf(
            Object.getPrototypeOf(inputPrototype)
          ),
          null
        );
        assert.equal(
          Object.getPrototypeOf(contractPrototype),
          null
        );
        assert.equal(
          Object.getPrototypeOf(outputPrototype),
          null
        );

        return validGeneratorOutput();
      },
      ["3 PM"]
    )
  );

  assert.equal(result.generatedAttacks.length, 1);
});

test("callback-time Promise intrinsic tampering observes rejection before failing closed", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const modulePath = path.resolve(__dirname, "../src/contract-attacks.js");
  const script = `
    const { runContractAttacks } = require(${JSON.stringify(modulePath)});
    const species = Symbol.species;
    const originalSpecies = Object.getOwnPropertyDescriptor(Promise, species);
    let unhandled = false;
    process.on("unhandledRejection", () => { unhandled = true; });

    const options = {
      contract: {
        version: 1,
        status: "confirmed",
        task: "Return the approved time.",
        rules: [{
          id: "time-rule",
          statement: "Time must be 3 PM.",
          kind: "required",
          severity: "critical"
        }]
      },
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator() { return true; },
      generator() {
        Object.defineProperty(Promise, species, {
          configurable: true,
          get() { throw new Error("hostile species"); }
        });
        return Promise.reject(new Error("generator rejection"));
      }
    };

    const result = runContractAttacks(options);
    Object.defineProperty(Promise, species, originalSpecies);
    result.then(
      () => { console.error("unexpected resolve"); process.exitCode = 2; },
      (error) => {
        if (!/Promise intrinsic integrity check failed/.test(String(error && error.message))) {
          console.error(error);
          process.exitCode = 3;
        }
      }
    );

    setImmediate(() => {
      if (unhandled) {
        console.error("unhandled rejection leaked");
        process.exitCode = 4;
      }
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

  assert.equal(child.status, 0, child.stderr || child.stdout);
});
