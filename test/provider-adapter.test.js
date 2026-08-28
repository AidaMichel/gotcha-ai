"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const {
  createStructuredProviderAdapter,
  draftQualityContract,
  runContractAttacks
} = require("../src");

const task = "Schedule meetings from natural-language requests.";
const examples = [
  {
    id: "example-1",
    type: "judgment",
    input: "Schedule Sara on Tuesday at 3 PM.",
    output: "Meeting scheduled with Sara on Tuesday at 3 PM.",
    judgment: "good"
  },
  {
    id: "example-2",
    type: "judgment",
    input: "Schedule Sara on Tuesday at 3 PM.",
    output: "Meeting scheduled with Sara on Tuesday at 4 PM.",
    judgment: "bad"
  }
];

function qualityOutput() {
  return {
    version: 1,
    task,
    rules: [
      {
        id: "rule-1",
        statement: "The scheduled time must match the requested time.",
        kind: "required",
        severity: "critical",
        confidence: "high",
        rationale: "The bad example changes the requested time.",
        evidence: [
          {
            type: "example",
            exampleId: "example-2"
          }
        ]
      }
    ]
  };
}

function response(output) {
  return {
    version: 1,
    kind: "gotcha-provider-response",
    output
  };
}

function contract() {
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

test("factory validates options synchronously without calling transport", () => {
  let calls = 0;
  const transport = () => {
    calls += 1;
  };
  const generator = createStructuredProviderAdapter({
    transport,
    model: "test-model",
    mode: "quality-contract"
  });
  assert.equal(typeof generator, "function");
  assert.equal(calls, 0);

  const accessor = {};
  Object.defineProperty(accessor, "transport", {
    get() {
      throw new Error("must not run");
    },
    enumerable: true
  });
  Object.defineProperty(accessor, "model", { value: "x", enumerable: true });
  Object.defineProperty(accessor, "mode", { value: "quality-contract", enumerable: true });
  assert.throws(() => createStructuredProviderAdapter(accessor), TypeError);
  assert.equal(calls, 0);

  assert.throws(() => createStructuredProviderAdapter({ transport, model: " x ", mode: "quality-contract" }), TypeError);
  assert.throws(() => createStructuredProviderAdapter({ transport, model: "x", mode: "other" }), TypeError);
});

test("quality-contract adapter integrates with M7 and forwards exact authority once", async () => {
  let calls = 0;
  let seen;
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "quality-contract",
    transport(request) {
      calls += 1;
      seen = request;
      return response(qualityOutput());
    }
  });

  const draft = await draftQualityContract({ task, examples, generator });
  assert.equal(draft.rules[0].id, "rule-1");
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(seen), [
    "version", "kind", "mode", "model", "instructions", "outputFormat", "input"
  ]);
  assert.equal(seen.version, 1);
  assert.equal(seen.kind, "gotcha-provider-request");
  assert.equal(seen.mode, "quality-contract");
  assert.equal(seen.model, "fake-model");
  assert.deepEqual(Object.keys(seen.input), ["task", "examples"]);
  assert.equal(Object.hasOwn(seen.input, "instructions"), false);
  assert.equal(seen.outputFormat.version, 1);
  assert.equal(seen.outputFormat.kind, "gotcha-output-format");
  assert.equal(seen.outputFormat.schema.dialect, "gotcha-structured-v1");
  assert.equal(seen.outputFormat.schema.properties.rules.maxItems, 7);
});

test("contract-attacks adapter integrates with M8 callback-isolated inputs", async () => {
  const confirmed = contract();
  let calls = 0;
  let seen;
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-attacks",
    transport(request) {
      calls += 1;
      seen = request;
      return response({
        version: 1,
        task: confirmed.task,
        attacks: [
          {
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "Violates the confirmed rule.",
            mutatedOutput: { time: "4 PM" },
            scores: {
              realism: 0.9,
              subtlety: 0.8,
              novelty: 0.7,
              fixability: 0.9
            }
          }
        ]
      });
    }
  });

  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "Schedule the meeting." },
    expectedOutput: { time: "3 PM" },
    evaluator(output) {
      return output.time === "3 PM";
    },
    generator
  });

  assert.equal(calls, 1);
  assert.equal(result.generatedAttacks.length, 1);
  assert.deepEqual(Object.keys(seen.input), ["contract", "input", "expectedOutput"]);
  assert.equal(seen.outputFormat.schema.properties.attacks.maxItems, 20);
});

test("invocation aliases normalize into distinct detached request branches", async () => {
  const shared = { value: 1 };
  let seen;
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-attacks",
    transport(request) {
      seen = request;
      return response({ version: 1, task: "x", attacks: [] });
    }
  });

  await generator({
    contract: { task: "x" },
    input: { a: shared, b: shared },
    expectedOutput: { ok: true },
    instructions: "instructions"
  });

  assert.deepEqual(seen.input.input.a, { value: 1 });
  assert.deepEqual(seen.input.input.b, { value: 1 });
  assert.notStrictEqual(seen.input.input.a, seen.input.input.b);
  shared.value = 2;
  assert.equal(seen.input.input.a.value, 1);
});

test("transport is called once and throw/rejection identity is preserved", async () => {
  const syncReason = { code: "sync" };
  let syncCalls = 0;
  const syncGenerator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport() {
      syncCalls += 1;
      throw syncReason;
    }
  });
  await assert.rejects(
    syncGenerator({ task, examples, instructions: "i" }),
    (error) => error === syncReason
  );
  assert.equal(syncCalls, 1);

  const asyncReason = { code: "async" };
  let asyncCalls = 0;
  const asyncGenerator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport() {
      asyncCalls += 1;
      return Promise.reject(asyncReason);
    }
  });
  await assert.rejects(
    asyncGenerator({ task, examples, instructions: "i" }),
    (error) => error === asyncReason
  );
  assert.equal(asyncCalls, 1);
});

test("malformed outer response rejects before output accessor executes", async () => {
  let getterCalls = 0;
  const envelope = { version: 1, kind: "gotcha-provider-response" };
  Object.defineProperty(envelope, "output", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return qualityOutput();
    }
  });
  const generator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => envelope
  });
  await assert.rejects(generator({ task, examples, instructions: "i" }), TypeError);
  assert.equal(getterCalls, 0);
});

test("returned output is detached in both directions and uses a null prototype root", async () => {
  const transportOutput = qualityOutput();
  const generator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => response(transportOutput)
  });
  const returned = await generator({ task, examples, instructions: "i" });
  assert.equal(Object.getPrototypeOf(returned), null);
  transportOutput.task = "changed";
  assert.equal(returned.task, task);
  returned.rules[0].statement = "changed returned";
  assert.notEqual(transportOutput.rules[0].statement, "changed returned");
});

test("provider output repeated mutable identity rejects", async () => {
  const shared = { type: "task" };
  const output = {
    version: 1,
    task,
    rules: [
      {
        id: "r",
        statement: "s",
        kind: "required",
        severity: "major",
        confidence: "high",
        rationale: "r",
        evidence: [shared, shared]
      }
    ]
  };
  const generator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => response(output)
  });
  await assert.rejects(generator({ task, examples, instructions: "i" }), TypeError);
});

test("unknown thenables and cross-realm Promises reject without assimilation", async () => {
  let thenCalls = 0;
  const thenable = Object.create(null);
  Object.defineProperty(thenable, "then", {
    get() {
      thenCalls += 1;
      throw new Error("must not run");
    }
  });
  const generator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => thenable
  });
  await assert.rejects(generator({ task, examples, instructions: "i" }), TypeError);
  assert.equal(thenCalls, 0);

  const foreignPromise = vm.runInNewContext("Promise.resolve({version:1,kind:'gotcha-provider-response',output:{version:1,task:'x',rules:[]}})");
  const foreignGenerator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => foreignPromise
  });
  await assert.rejects(foreignGenerator({ task, examples, instructions: "i" }), TypeError);
});

test("unshieldable Promise constructor rejects without executing its accessor", async () => {
  let constructorCalls = 0;
  const promise = Promise.resolve(response(qualityOutput()));
  Object.defineProperty(promise, "constructor", {
    configurable: false,
    get() {
      constructorCalls += 1;
      throw new Error("must not run");
    }
  });
  const generator = createStructuredProviderAdapter({
    model: "x",
    mode: "quality-contract",
    transport: () => promise
  });
  await assert.rejects(generator({ task, examples, instructions: "i" }), TypeError);
  assert.equal(constructorCalls, 0);
});

test("public fulfillment does not execute inherited Object.prototype.then", async () => {
  let thenCalls = 0;
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, "then");
  Object.defineProperty(Object.prototype, "then", {
    configurable: true,
    get() {
      thenCalls += 1;
      return undefined;
    }
  });
  try {
    const generator = createStructuredProviderAdapter({
      model: "x",
      mode: "quality-contract",
      transport: () => response(qualityOutput())
    });
    const output = await generator({ task, examples, instructions: "i" });
    assert.equal(output.task, task);
    assert.equal(thenCalls, 0);
  } finally {
    if (previous === undefined) delete Object.prototype.then;
    else Object.defineProperty(Object.prototype, "then", previous);
  }
});
