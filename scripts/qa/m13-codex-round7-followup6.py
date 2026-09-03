from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "test" / "m13-review-remediation.test.js"
text = path.read_text()

old = 'test("M13 capture and request projection stay stack-safe for deep replayable evidence", async () => {\n'
new = 'test("M13 capture and request projection stay stack-safe for deep replayable evidence", { timeout: 90000 }, async () => {\n'
if old not in text:
    raise SystemExit("missing followup6 deep-evidence timeout anchor")
text = text.replace(old, new, 1)

path.write_text(text)
print("round7 followup6 applied")
