from pathlib import Path

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()

replacements = {
    "if (generatorCalls !== 1 || trapCalls !== 0) process.exit(25);":
        "if (generatorCalls !== 0 || trapCalls !== 0) process.exit(25);",
    "if (generatorCalls !== 1 || trapCalls !== 0) process.exitCode = 77;":
        "if (generatorCalls !== 0 || trapCalls !== 0) process.exitCode = 77;",
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"missing expected legacy assertion: {old}")
    text = text.replace(old, new, 1)

path.write_text(text)
print("Updated legacy poisoned-probe regressions to require pre-generator fail-closed behavior.")
