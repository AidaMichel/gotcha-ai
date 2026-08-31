from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"

core = CORE.read_text()

function_marker = '''function resolveRequiredUndiciConstructor(\n  constructorName\n) {'''

helper = '''function hasTrustedUndiciBlobDependency() {\n  if (nodeMajorVersion < 24) {\n    return true;\n  }\n\n  let globalBlobDescriptor;\n  let moduleBlobDescriptor;\n\n  try {\n    globalBlobDescriptor =\n      getOwnPropertyDescriptor(\n        globalThis,\n        "Blob"\n      );\n    moduleBlobDescriptor =\n      getOwnPropertyDescriptor(\n        nodeBuffer,\n        "Blob"\n      );\n  } catch {\n    return false;\n  }\n\n  if (\n    globalBlobDescriptor === undefined ||\n    "get" in globalBlobDescriptor ||\n    "set" in globalBlobDescriptor ||\n    moduleBlobDescriptor === undefined ||\n    "get" in moduleBlobDescriptor ||\n    "set" in moduleBlobDescriptor ||\n    typeof globalBlobDescriptor.value !==\n      "function" ||\n    globalBlobDescriptor.value !==\n      moduleBlobDescriptor.value ||\n    utilTypePredicates.isProxy(\n      globalBlobDescriptor.value\n    )\n  ) {\n    return false;\n  }\n\n  const blobModuleSource =\n    captureEmbeddedNodeSource(\n      "internal/blob"\n    );\n\n  return sourceBelongsToEmbeddedModule(\n    globalBlobDescriptor.value,\n    blobModuleSource\n  );\n}\n\nfunction resolveRequiredUndiciConstructor(\n  constructorName\n) {'''

count = core.count(function_marker)
if count != 1:
    raise SystemExit(
        f"expected one required Undici constructor seam, found {count}"
    )
core = core.replace(function_marker, helper, 1)

start = core.index(
    '''function resolveRequiredUndiciConstructor(\n  constructorName\n) {'''
)
end = core.index(
    '''\n}\n\nfunction captureRequiredUndiciProbe(''',
    start
)
resolver = core[start:end]

getter_marker = '''  let constructor;\n\n  try {\n    constructor =\n      reflectApply(\n        getter,\n        globalThis,\n        []\n      );'''

guarded_getter = '''  if (!hasTrustedUndiciBlobDependency()) {\n    return null;\n  }\n\n  let constructor;\n\n  try {\n    constructor =\n      reflectApply(\n        getter,\n        globalThis,\n        []\n      );'''

count = resolver.count(getter_marker)
if count != 1:
    raise SystemExit(
        f"expected one lazy getter inside Undici resolver, found {count}"
    )
resolver = resolver.replace(
    getter_marker,
    guarded_getter,
    1
)
core = core[:start] + resolver + core[end:]

CORE.write_text(core)
print("scoped Node 24 Blob dependency guard to lazy Undici resolver")
