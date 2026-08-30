from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"

core = CORE.read_text()

abort_start_marker = "const abortControllerRuntimeExpected =\n"
trusted_list_marker = "const trustedHostBrandGetters =\n"
headers_probe_marker = "const headersBrandProbe =\n"

if core.count(abort_start_marker) != 1:
    raise SystemExit(
        f"expected one AbortController authority block start, found {core.count(abort_start_marker)}"
    )
if core.count(trusted_list_marker) != 1:
    raise SystemExit(
        f"expected one trusted host getter list marker, found {core.count(trusted_list_marker)}"
    )
if core.count(headers_probe_marker) != 1:
    raise SystemExit(
        f"expected one Headers probe marker, found {core.count(headers_probe_marker)}"
    )

abort_start = core.index(abort_start_marker)
trusted_list_start = core.index(trusted_list_marker, abort_start)
abort_block = core[abort_start:trusted_list_start].rstrip()

core = core[:abort_start] + core[trusted_list_start:]

headers_probe_start = core.index(headers_probe_marker)
core = (
    core[:headers_probe_start]
    + abort_block
    + "\n\n"
    + core[headers_probe_start:]
)

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
    "moved authenticated AbortController authority ahead of lazy Undici bootstrap"
)
