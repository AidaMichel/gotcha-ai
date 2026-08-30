from pathlib import Path

path = Path(__file__).resolve().parents[2] / "test" / "m8-runtime-brand-authority.test.js"
text = path.read_text()
path.write_text(text.rstrip() + "\n")
print("normalized M8 regression file ending")
