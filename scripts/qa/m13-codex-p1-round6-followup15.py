from pathlib import Path

path = Path("src/index.js")
text = path.read_text()

old = '''function unavailableSyncBoundary() {\n  throw makeBoundaryError();\n}\n\nasync function unavailableAsyncBoundary() {\n  throw makeBoundaryError();\n}\n\nfunction unavailableAdapterBoundary() {\n  throw makeBoundaryError();\n}\n'''
new = '''function unavailableSyncBoundary() {\n  throw makeBoundaryError();\n}\n\nasync function unavailableAsyncBoundary() {\n  throw makeBoundaryError();\n}\n\nfunction unavailableAdapterBoundary() {\n  return async function unavailableProviderGenerator() {\n    throw makeBoundaryError();\n  };\n}\n'''
if old not in text:
    raise SystemExit("public unavailable boundary block missing")
text = text.replace(old, new, 1)

# M8 is publicly async and M12 prepare is Promise-returning. Preserve those
# exact contracts even when package authority is unavailable; the async stub
# allocates its native Promise only when called, after the hostile preload has
# been restored by the caller/test.
old = '''defineLazyExport(\n  "runContractAttacks",\n  "./contract-attacks",\n  unavailableSyncBoundary\n);'''
new = '''defineLazyExport(\n  "runContractAttacks",\n  "./contract-attacks",\n  unavailableAsyncBoundary\n);'''
if old not in text:
    raise SystemExit("runContractAttacks unavailable shape marker missing")
text = text.replace(old, new, 1)

old = '''defineLazyExport(\n  "prepareContractQualityLoop",\n  "./contract-quality-loop",\n  unavailableSyncBoundary\n);'''
new = '''defineLazyExport(\n  "prepareContractQualityLoop",\n  "./contract-quality-loop",\n  unavailableAsyncBoundary\n);'''
if old not in text:
    raise SystemExit("prepareContractQualityLoop unavailable shape marker missing")
text = text.replace(old, new, 1)

path.write_text(text)
print("round6 fail-closed public surface shapes preserved")
