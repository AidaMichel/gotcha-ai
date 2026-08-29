"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks,
  generateContractProtectionProposal,
  createStructuredProviderAdapter
} = require("../src");

const INSTRUCTIONS =
  "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
  "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
  "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
  "The protection statement must describe what the quality system should enforce.\n" +
  "The rationale must explain why this protection addresses the selected survivor.";

function response(output) {
  return { version: 1, kind: "gotcha-provider-response", output };
}

async function experiment() {
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
  const result = await runContractAttacks({
    contract,
    input: { z: 1, a: 2 },
    expectedOutput: { time: "3 PM" },
    evaluator() { return true; },
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: [{
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the approved time.",
          rationale: "Violates the confirmed rule.",
          mutatedOutput: { z: "wrong", a: "still-second" },
          scores: { realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.9 }
        }]
      };
    }
  });
  return result.experiment;
}

function proposal() {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId: "wrong-time",
    ruleId: "time-rule",
    protection: {
      statement: "Reject any output whose time is not exactly 3 PM.",
      rationale: "The surviving attack changed the approved time."
    }
  };
}

test("contract-protection provider mode integrates end-to-end with M13", async () => {
  const exp = await experiment();
  let calls = 0;
  let seen;
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport(request) {
      calls += 1;
      seen = request;
      return response(proposal());
    }
  });

  const generated = await generateContractProtectionProposal({
    experiment: exp,
    sourceAttackId: "wrong-time",
    generator
  });

  assert.equal(calls, 1);
  assert.equal(generated.state, "proposal-ready");
  assert.deepEqual(Object.keys(seen), [
    "version", "kind", "mode", "model", "instructions", "outputFormat", "input"
  ]);
  assert.equal(seen.mode, "contract-protection");
  assert.equal(seen.model, "fake-model");
  assert.equal(seen.instructions, INSTRUCTIONS);
  assert.deepEqual(Object.keys(seen.input), ["task", "case", "source", "rule", "attack"]);
  assert.equal(Object.hasOwn(seen.input, "instructions"), false);
  assert.deepEqual(Object.keys(seen.input.case.input), ["z", "a"]);
  assert.deepEqual(Object.keys(seen.input.attack.output), ["z", "a"]);
  assert.equal(seen.outputFormat.version, 1);
  assert.equal(seen.outputFormat.kind, "gotcha-output-format");
  assert.equal(seen.outputFormat.mode, "contract-protection");
  assert.equal(seen.outputFormat.schema.dialect, "gotcha-structured-v1");
  assert.equal(seen.outputFormat.schema.additionalProperties, false);
  assert.deepEqual(seen.outputFormat.schema.required, [
    "version", "task", "sourceAttackId", "ruleId", "protection"
  ]);
  assert.deepEqual(seen.outputFormat.schema.properties.protection.required, [
    "statement", "rationale"
  ]);
});

test("contract-protection adapter rejects altered instructions before transport", async () => {
  let calls = 0;
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport() {
      calls += 1;
      return response(proposal());
    }
  });

  await assert.rejects(
    generator({
      task: "Return the approved time.",
      case: { input: {}, expectedOutput: {} },
      source: { attackId: "wrong-time", ruleId: "time-rule" },
      rule: { id: "time-rule", statement: "x", kind: "required", severity: "major" },
      attack: {
        id: "wrong-time", ruleId: "time-rule", type: "x",
        description: "x", rationale: "x", output: {}
      },
      instructions: INSTRUCTIONS + " altered"
    }),
    TypeError
  );
  assert.equal(calls, 0);
});

test("M13 adapter extension does not remove the two existing M11 modes", () => {
  const transport = () => response({});
  assert.equal(typeof createStructuredProviderAdapter({
    transport, model: "m", mode: "quality-contract"
  }), "function");
  assert.equal(typeof createStructuredProviderAdapter({
    transport, model: "m", mode: "contract-attacks"
  }), "function");
  assert.throws(() => createStructuredProviderAdapter({
    transport, model: "m", mode: "unknown"
  }), TypeError);
});