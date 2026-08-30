from pathlib import Path

path = Path(__file__).resolve().parents[2] / "test" / "m8-runtime-brand-authority.test.js"
path.write_text(path.read_text().rstrip() + "\n")
print("normalized module-authority regression file ending")
