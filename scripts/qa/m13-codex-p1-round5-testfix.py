from pathlib import Path

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
old = '''  const adapter = createStructuredProviderAdapter({
    mode: "contract-protection",
    model: "x",
    transport() { return transportPromise; }
  });
  await assert.rejects(adapter({}), TypeError);'''
new = '''  const adapter = createStructuredProviderAdapter({
    mode: "contract-protection",
    model: "x",
    transport() { return transportPromise; }
  });
  await assert.rejects(adapter({
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: {
      id: "time-rule",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    },
    attack: {
      id: "wrong-time",
      ruleId: "time-rule",
      type: "wrong-time",
      description: "Changes the approved time.",
      rationale: "Violates the confirmed rule.",
      output: {}
    },
    instructions:
      "Propose one specific, testable declarative quality protection for the selected surviving attack.\\n" +
      "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\\n" +
      "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\\n" +
      "The protection statement must describe what the quality system should enforce.\\n" +
      "The rationale must explain why this protection addresses the selected survivor."
  }), TypeError);'''
if old not in text:
    raise SystemExit("round5 transport regression target not found")
path.write_text(text.replace(old, new, 1))
print("round5 transport regression now reaches the transport Promise path")
