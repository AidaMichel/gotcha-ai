from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "src" / "runtime-authority.js"
text = path.read_text()

old = '''const vmModule = bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
'''
new = '''// Loading node:vm can transitively consult node:buffer exports on Node 22.
// If buffer was already loaded, treat that bootstrap surface as attacker-owned
// and fall back to the descriptor-captured same-realm authority instead of
// causing Node internals to read a potentially accessor-backed Buffer export.
const vmModule = bootstrapBuiltinWasLoaded("node:buffer")
  ? null
  : bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
'''

if old not in text:
    raise SystemExit("missing followup7 vm bootstrap anchor")
text = text.replace(old, new, 1)
if text.count('bootstrapBuiltinWasLoaded("node:buffer")') != 1:
    raise SystemExit("unexpected node:buffer bootstrap guard count")
path.write_text(text)
print("round7 followup7 applied")
