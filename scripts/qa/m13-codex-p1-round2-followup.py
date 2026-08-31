from pathlib import Path

# Update old proposal expectation: a trusted native constructor is safe even when non-configurable.
p = Path('test/contract-protection-proposal.test.js')
s = p.read_text()
old = '''  const unshieldable = Promise.resolve(candidate());
  Object.defineProperty(unshieldable, "constructor", {
    value: Promise,
    writable: true,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return unshieldable; }
    }),
    TypeError
  );
'''
new = '''  const trustedNonConfigurable = Promise.resolve(candidate());
  Object.defineProperty(trustedNonConfigurable, "constructor", {
    value: Promise,
    writable: true,
    enumerable: false,
    configurable: false
  });
  const trustedResult = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() { return trustedNonConfigurable; }
  });
  assert.equal(trustedResult.state, "proposal-ready");

  const rejectedReason = { code: "trusted-nonconfig-rejection" };
  const rejectedTrusted = Promise.reject(rejectedReason);
  Object.defineProperty(rejectedTrusted, "constructor", {
    value: Promise,
    writable: false,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return rejectedTrusted; }
    }),
    (error) => error === rejectedReason
  );
'''
if old not in s:
    raise SystemExit('proposal old nonconfig expectation missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Scope accessor regression to the M13 adapter module itself so it proves the reviewed seam.
p = Path('test/m13-review-remediation.test.js')
s = p.read_text()
s = s.replace(
    'const modulePath = path.join(repoRoot, "src", "index.js");\n  const code = `\n    "use strict";\n    const NativePromise = Promise;\n    const original = Object.getOwnPropertyDescriptor(globalThis, "Promise");\n    let getterCalls = 0;\n    Object.defineProperty(globalThis, "Promise", {\n      get() { getterCalls += 1; return NativePromise; }, configurable: true\n    });\n    let api;\n    try { api = require(${JSON.stringify(modulePath)}); } catch (error) {\n      console.error(error); process.exit(7);\n    }',
    'const modulePath = path.join(repoRoot, "src", "provider-adapter-m13.js");\n  const code = `\n    "use strict";\n    const NativePromise = Promise;\n    const original = Object.getOwnPropertyDescriptor(globalThis, "Promise");\n    let getterCalls = 0;\n    Object.defineProperty(globalThis, "Promise", {\n      get() { getterCalls += 1; return NativePromise; }, configurable: true\n    });\n    let api;\n    try { api = require(${JSON.stringify(modulePath)}); } catch (error) {\n      console.error(error); process.exit(7);\n    }',
    1
)
p.write_text(s)

# Add permanent transport rejection coverage for non-extensible trusted native Promise.
p = Path('test/provider-adapter-m13.test.js')
s = p.read_text()
marker = 'test("contract-protection adapter consumes rejected non-extensible trusted Promises"'
if marker not in s:
    s += r'''

test("contract-protection adapter consumes rejected non-extensible trusted Promises", async () => {
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
p.write_text(s)
