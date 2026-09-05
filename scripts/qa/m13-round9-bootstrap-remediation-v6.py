from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# The M13 adapter must not import the legacy M11 adapter graph merely because
# its public factory was loaded. That graph imports ai-data-core, whose legacy
# Node source probes can enter process.binding() and cause Node internals to
# synchronize mutable node:util exports. Keep legacy compatibility, but load
# it only when a caller actually selects a legacy mode.
provider_path = Path("src/provider-adapter-m13.js")
provider = provider_path.read_text()
provider = replace_once(
    provider,
    '''let createLegacyStructuredProviderAdapter = null;\nif (promiseAuthorityAvailable && legacyTypeErrorAuthorityAvailable) {\n  const legacyAdapterPath = require.resolve("./provider-adapter");\n  delete require.cache[legacyAdapterPath];\n  const legacyAdapter = require(legacyAdapterPath);\n  if (\n    legacyAdapter !== null &&\n    typeof legacyAdapter === "object" &&\n    typeof legacyAdapter.createStructuredProviderAdapter === "function"\n  ) {\n    createLegacyStructuredProviderAdapter =\n      legacyAdapter.createStructuredProviderAdapter;\n  }\n}\n''',
    '''let createLegacyStructuredProviderAdapter = null;\nlet legacyAdapterLoadAttempted = false;\n\nfunction getLegacyStructuredProviderAdapter() {\n  if (legacyAdapterLoadAttempted) return createLegacyStructuredProviderAdapter;\n  legacyAdapterLoadAttempted = true;\n\n  if (!promiseAuthorityAvailable || !legacyTypeErrorAuthorityAvailable) {\n    return null;\n  }\n\n  try {\n    const legacyAdapterPath = require.resolve("./provider-adapter");\n    delete require.cache[legacyAdapterPath];\n    const legacyAdapter = require(legacyAdapterPath);\n    if (\n      legacyAdapter !== null &&\n      typeof legacyAdapter === "object" &&\n      typeof legacyAdapter.createStructuredProviderAdapter === "function"\n    ) {\n      createLegacyStructuredProviderAdapter =\n        legacyAdapter.createStructuredProviderAdapter;\n    }\n  } catch {\n    createLegacyStructuredProviderAdapter = null;\n  }\n\n  return createLegacyStructuredProviderAdapter;\n}\n''',
    "mode-gated legacy adapter load",
)
provider = replace_once(
    provider,
    '''  if (descriptors.mode.value !== "contract-protection") {\n    if (typeof createLegacyStructuredProviderAdapter !== "function") {\n      throw boundaryError("legacy provider adapter authority is unavailable.");\n    }\n    return createLegacyStructuredProviderAdapter(options);\n  }\n''',
    '''  if (descriptors.mode.value !== "contract-protection") {\n    const legacyAdapter = getLegacyStructuredProviderAdapter();\n    if (typeof legacyAdapter !== "function") {\n      throw boundaryError("legacy provider adapter authority is unavailable.");\n    }\n    return legacyAdapter(options);\n  }\n''',
    "legacy mode dispatch",
)
provider_path.write_text(provider)


# Strengthen the existing Round-9 regression: merely exposing the public
# factory was not enough. Constructing the M13 contract-protection adapter must
# also stay entirely off the legacy graph while node:util.types is poisoned.
test_path = Path("test/m13-review-remediation.test.js")
test = test_path.read_text()
test = replace_once(
    test,
    '''      api = require(${JSON.stringify(indexPath)});\n      void api.createStructuredProviderAdapter;\n''',
    '''      api = require(${JSON.stringify(indexPath)});\n      const factory = api.createStructuredProviderAdapter;\n      if (typeof factory !== "function") process.exitCode = 94;\n      factory({\n        model: "round9-safe-model",\n        mode: "contract-protection",\n        transport() {\n          return { version: 1, kind: "gotcha-provider-response", output: {} };\n        }\n      });\n''',
    "exercise contract-protection mode under poisoned util types",
)
test_path.write_text(test)

print("Deferred legacy provider loading behind explicit legacy-mode dispatch.")
