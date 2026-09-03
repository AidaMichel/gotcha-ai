from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "src" / "runtime-authority.js"
text = path.read_text()

old = '''// Loading node:vm can transitively consult node:buffer exports on Node 22.
// If buffer was already loaded, treat that bootstrap surface as attacker-owned
// and fall back to the descriptor-captured same-realm authority instead of
// causing Node internals to read a potentially accessor-backed Buffer export.
const vmModule = bootstrapBuiltinWasLoaded("node:buffer")
  ? null
  : bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
'''
new = '''function bootstrapBuiltinDataExportIsSafe(modulePath, key) {
  const getBuiltinModule = bootstrapOwnDataValue(process, "getBuiltinModule");
  // Older supported Nodes do not expose getBuiltinModule. Preserve their
  // already-validated bootstrap path instead of re-requiring a loaded builtin.
  if (typeof getBuiltinModule !== "function") return true;
  try {
    const moduleObject = getBuiltinModule(modulePath);
    const descriptor = bootstrapGetOwnPropertyDescriptor(moduleObject, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    );
  } catch {
    return false;
  }
}

// On Node 22, loading node:vm can transitively read node:buffer.Buffer.
// Inspect the export descriptor without invoking it. Only the accessor-backed
// hostile case skips vm and uses the descriptor-captured fallback authority;
// a normal already-loaded Buffer still retains fresh vm authority.
const vmModule = bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")
  ? bootstrapBuiltinModule("node:vm", true)
  : null;
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
'''

if old not in text:
    raise SystemExit("missing followup8 broad vm guard anchor")
text = text.replace(old, new, 1)
if text.count('bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")') != 1:
    raise SystemExit("unexpected accessor-safe Buffer guard count")
path.write_text(text)
print("round7 followup8 applied")
