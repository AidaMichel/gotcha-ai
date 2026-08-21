from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing correction anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"non-unique correction anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

ai = replace_once(
    ai,
    '''const defineProperty =\n  Object.defineProperty;\n\nconst objectFreeze =\n''',
    '''const defineProperty =\n  Object.defineProperty;\n\nconst objectCreate =\n  Object.create;\n\nconst objectFreeze =\n''',
    "capture Object.create",
)

ai = replace_once(
    ai,
    '''  if (utilTypePredicates.isProxy(value)) {\n    throw new Error(\n      `${label} must not be a Proxy.`\n    );\n  }\n\n  if (\n    isUnsupportedRuntimeObject(value)\n  ) {\n''',
    '''  if (utilTypePredicates.isProxy(value)) {\n    throw new Error(\n      `${label} must not be a Proxy.`\n    );\n  }\n\n  const directPrototype =\n    getPrototypeOf(value);\n\n  if (\n    directPrototype !== null &&\n    utilTypePredicates.isProxy(\n      directPrototype\n    )\n  ) {\n    throw new Error(\n      `${label} must not use a Proxy prototype.`\n    );\n  }\n\n  if (\n    isUnsupportedRuntimeObject(value)\n  ) {\n''',
    "reject proxy prototypes before runtime probes",
)

ai = replace_once(
    ai,
    '''  const isArray =\n    arrayIsArray(value);\n\n  const entries =\n    isArray\n      ? captureArrayEntries(\n          value,\n          label\n        )\n      : capturePlainObjectEntries(\n          value,\n          label\n        );\n\n  const target =\n    isArray\n      ? new ArrayConstructor(entries.length)\n      : {};\n''',
    '''  const isArray =\n    arrayIsArray(value);\n\n  const entries =\n    isArray\n      ? captureArrayEntries(\n          value,\n          label\n        )\n      : capturePlainObjectEntries(\n          value,\n          label\n        );\n\n  const sourcePrototype =\n    isArray\n      ? null\n      : directPrototype;\n\n  const target =\n    isArray\n      ? new ArrayConstructor(entries.length)\n      : sourcePrototype === null\n        ? objectCreate(null)\n        : {};\n''',
    "preserve null-prototype plain-object semantics",
)

ai_path.write_text(ai)


test_path = Path("test/ai-data.test.js")
test = test_path.read_text()
test = replace_once(
    test,
    '''    assert.equal(\n      Object.getPrototypeOf(\n        cloned\n      ),\n      Object.prototype\n    );\n''',
    '''    assert.equal(\n      Object.getPrototypeOf(\n        cloned\n      ),\n      null\n    );\n''',
    "null-prototype clone expectation",
)
test_path.write_text(test)

print("Round 9 correction applied")
