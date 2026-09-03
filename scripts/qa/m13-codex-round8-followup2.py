from pathlib import Path

provider_path = Path("test/provider-adapter-m13.test.js")
provider = provider_path.read_text()
old = '''test("contract-protection adapter consumes rejected non-extensible trusted Promises", async () => {
  const reason = { code: "transport-rejected" };
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport() {
      const promise = Promise.reject(reason);
      Object.preventExtensions(promise);
      return promise;
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
      instructions: INSTRUCTIONS
    }),
    (error) => error === reason
  );
});
'''
new = '''test("contract-protection adapter consumes then rejects non-extensible trusted Promises", async () => {
  const reason = { code: "transport-rejected" };
  const generator = createStructuredProviderAdapter({
    model: "fake-model",
    mode: "contract-protection",
    transport() {
      const promise = Promise.reject(reason);
      Object.preventExtensions(promise);
      return promise;
    }
  });
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.once("unhandledRejection", listener);

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
      instructions: INSTRUCTIONS
    }),
    TypeError
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});
'''
if old not in provider:
    raise SystemExit("missing provider non-extensible historical regression")
provider_path.write_text(provider.replace(old, new, 1))

runtime_test_path = Path("test/runtime-authority.test.js")
runtime_test = runtime_test_path.read_text()
old_assert = '    if (authority.isProxy({}) !== false) process.exit(22);\n'
new_assert = '''    // With the only local proxy probe poisoned, Round-8 deliberately marks
    // proxy identity unavailable and fails closed: unknown objects are treated
    // as Proxy-risk rather than invoking attacker-controlled probe authority.
    if (authority.isProxy({}) !== true) process.exit(22);\n'''
if old_assert not in runtime_test:
    raise SystemExit("missing poisoned isProxy historical assertion")
runtime_test_path.write_text(runtime_test.replace(old_assert, new_assert, 1))

print("Aligned provider and poisoned-isProxy regressions with Round-8 fail-closed semantics.")
