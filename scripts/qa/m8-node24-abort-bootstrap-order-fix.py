from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"

core = CORE.read_text()

old_gate = '''function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {
  if (!undiciRuntimeExpected) {
    return null;
  }
'''

new_gate = '''function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {
  if (
    !undiciRuntimeExpected ||
    !abortControllerBrandAuthorityAvailable
  ) {
    if (
      undiciRuntimeExpected &&
      !abortControllerBrandAuthorityAvailable
    ) {
      undiciHostBrandAuthorityAvailable = false;
    }

    return null;
  }
'''

if core.count(old_gate) != 1:
    raise SystemExit(
        f"expected one Undici probe gate seam, found {core.count(old_gate)}"
    )

core = core.replace(old_gate, new_gate, 1)

CORE.write_text(core)
print(
    "gated lazy Undici bootstrap on authenticated AbortController authority"
)
