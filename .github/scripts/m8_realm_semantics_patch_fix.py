from pathlib import Path

path = Path(".github/scripts/m8_realm_semantics_patch.py")
text = path.read_text()

old = '''  const receiverPrototype =\n    getPrototypeOf(receiver);\n\n  setPrototypeOf(\n    result,\n    receiverPrototype\n  );\n\n  const instanceState =\n    activeEvaluatorInstanceState;\n\n  if (instanceState !== null) {\n    reflectApply(\n      weakSetAdd,\n      instanceState.snapshotNodes,\n      [result]\n    );\n'''

new = '''  const instanceState =\n    activeEvaluatorInstanceState;\n\n  if (instanceState === null) {\n    return result;\n  }\n\n  const receiverPrototype =\n    getPrototypeOf(receiver);\n\n  setPrototypeOf(\n    result,\n    receiverPrototype\n  );\n\n  reflectApply(\n    weakSetAdd,\n    instanceState.snapshotNodes,\n    [result]\n  );\n\n  {\n'''

if old not in text:
    raise SystemExit("realm result registration anchor not found")

text = text.replace(old, new, 1)
path.write_text(text)
print("Temporary realm patch refined for evaluator-only result semantics.")
