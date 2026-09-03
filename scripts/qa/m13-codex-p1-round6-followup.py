from pathlib import Path

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()

old = '''      p2 = adapter({});\n'''
new = '''      p2 = adapter({\n        task: "Return the approved time.",\n        case: { input: {}, expectedOutput: {} },\n        source: { attackId: "wrong-time", ruleId: "time-rule" },\n        rule: {\n          id: "time-rule",\n          statement: "Time must be 3 PM.",\n          kind: "required",\n          severity: "major"\n        },\n        attack: {\n          id: "wrong-time",\n          ruleId: "time-rule",\n          type: "wrong-time",\n          description: "Changes the approved time.",\n          rationale: "Violates the confirmed rule.",\n          output: {}\n        },\n        instructions:\n          "Propose one specific, testable declarative quality protection for the selected surviving attack.\\n" +\n          "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\\n" +\n          "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\\n" +\n          "The protection statement must describe what the quality system should enforce.\\n" +\n          "The rationale must explain why this protection addresses the selected survivor."\n      });\n'''

if old not in text:
    raise SystemExit("round6 species provider invalid-request marker not found")

text = text.replace(old, new, 1)
path.write_text(text)
print("round6 generated provider regression now reaches transport when authority permits")
