from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# Merely resolving the public runContractAttacks getter must not load the M8
# execution graph. In particular, ./ai-data imports ai-data-core, whose legacy
# host-brand source discovery can enter process.binding("natives") and cause
# Node internals to synchronize mutable public builtin exports. Keep those
# dependencies behind the actual execution boundary instead of the lazy API
# exposure boundary.
core_path = Path("src/contract-attacks-core.js")
core = core_path.read_text()
core = replace_once(
    core,
    '''let attack = null;\nlet cloneAiData = null;\nlet snapshotAiData = null;\n\nif (m8DependencyAuthorityAvailable) {\n  ({ attack } = require("./engine"));\n  ({ cloneAiData, snapshotAiData } = require("./ai-data"));\n}\n''',
    '''let attack = null;\nlet cloneAiData = null;\nlet snapshotAiData = null;\nlet m8DependenciesLoadAttempted = false;\n\nfunction loadM8ExecutionDependencies() {\n  if (m8DependenciesLoadAttempted) return;\n  m8DependenciesLoadAttempted = true;\n\n  if (!m8DependencyAuthorityAvailable) return;\n\n  try {\n    ({ attack } = require("./engine"));\n    ({ cloneAiData, snapshotAiData } = require("./ai-data"));\n  } catch {\n    attack = null;\n    cloneAiData = null;\n    snapshotAiData = null;\n  }\n}\n''',
    "defer M8 execution dependencies",
)
core = replace_once(
    core,
    '''async function runContractAttacks(\n  options = {},\n  experimentEvidenceRecorder = null\n) {\n  const runScope =\n    enterCallbackIntrinsicScope();\n''',
    '''async function runContractAttacks(\n  options = {},\n  experimentEvidenceRecorder = null\n) {\n  loadM8ExecutionDependencies();\n\n  const runScope =\n    enterCallbackIntrinsicScope();\n''',
    "load M8 dependencies at execution boundary",
)
core_path.write_text(core)

print("Deferred M8 execution dependencies behind runContractAttacks invocation.")
