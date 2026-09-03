from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "src" / "runtime-authority.js"
text = path.read_text()

old = '''function captureSetFlagsFromString() {
  try {
    const v8Module = bootstrapBuiltinModule("node:v8", false);
'''
new = '''function captureSetFlagsFromString() {
  // Node 22's node:v8 module imports node:buffer.Buffer during evaluation.
  // Never load it when that export is accessor-backed: doing so would execute
  // attacker-controlled bootstrap code before proxy authority exists. In that
  // hostile state the V8 proxy fallback is unavailable and callers fail closed.
  if (!bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")) {
    return null;
  }
  try {
    const v8Module = bootstrapBuiltinModule("node:v8", false);
'''

if old not in text:
    raise SystemExit("missing followup9 V8 bootstrap anchor")
text = text.replace(old, new, 1)
if text.count('bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")') != 2:
    raise SystemExit("unexpected Buffer bootstrap safety check count")
path.write_text(text)
print("round7 followup9 applied")
