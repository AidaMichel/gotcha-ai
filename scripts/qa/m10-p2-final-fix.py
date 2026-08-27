from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    p.write_text(text.replace(old, new, 1))


# 1) Seed capture: fixed keys must be index-based with no ambient iterator.
replace_once(
    "src/contract-experiment.js",
    '''    for (\n      const key of [\n        "contract",\n        "input",\n        "expectedOutput"\n      ]\n    ) {\n      if (\n        !hasOwn(descriptors, key) ||\n        !hasOwn(descriptors[key], "value")\n      ) {\n        return seed;\n      }\n    }''',
    '''    const seedKeys = [\n      "contract",\n      "input",\n      "expectedOutput"\n    ];\n\n    for (\n      let keyIndex = 0;\n      keyIndex < seedKeys.length;\n      keyIndex += 1\n    ) {\n      const key = seedKeys[keyIndex];\n\n      if (\n        !hasOwn(descriptors, key) ||\n        !hasOwn(descriptors[key], "value")\n      ) {\n        return seed;\n      }\n    }''',
)

# 2) Retained score clone: fixed keys must also be index-based.
replace_once(
    "src/contract-experiment.js",
    '''  for (\n    const key of [\n      "realism",\n      "subtlety",\n      "novelty",\n      "fixability"\n    ]\n  ) {\n    const value = attack[key];''',
    '''  const retainedScoreKeys = [\n    "realism",\n    "subtlety",\n    "novelty",\n    "fixability"\n  ];\n\n  for (\n    let scoreIndex = 0;\n    scoreIndex < retainedScoreKeys.length;\n    scoreIndex += 1\n  ) {\n    const key = retainedScoreKeys[scoreIndex];\n    const value = attack[key];''',
)

# 3) Prototype baseline: Array.prototype must explicitly inherit from local Object.prototype.
replace_once(
    "src/contract-experiment.js",
    '''const arrayPrototypeParent =\n  getPrototypeOf(arrayPrototype);\n''',
    '',
)
replace_once(
    "src/contract-experiment.js",
    '''    getPrototypeOf(arrayPrototype) ===\n      arrayPrototypeParent &&''',
    '''    getPrototypeOf(arrayPrototype) ===\n      objectPrototype &&''',
)

# 4) Safe adapter: remove iterator-reconfiguration workaround entirely.
safe = Path("src/contract-experiment-safe.js")
text = safe.read_text()
start = text.index("const arrayPrototype = Array.prototype;")
end_marker = "const RAW_ATTACK_KEYS = ["
end = text.index(end_marker)
replacement = '''const pristineIntrinsics =\n  runInNewContext(`({\n    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,\n    hasOwnProperty: Object.prototype.hasOwnProperty,\n    reflectApply: Reflect.apply,\n    arrayIsArray: Array.isArray,\n    numberIsFinite: Number.isFinite,\n    objectIs: Object.is\n  })`);\n\nconst getOwnPropertyDescriptors =\n  pristineIntrinsics.getOwnPropertyDescriptors;\nconst hasOwnProperty =\n  pristineIntrinsics.hasOwnProperty;\nconst reflectApply =\n  pristineIntrinsics.reflectApply;\nconst arrayIsArray =\n  pristineIntrinsics.arrayIsArray;\nconst isProxy = utilTypes.isProxy;\nconst numberIsFinite =\n  pristineIntrinsics.numberIsFinite;\nconst objectIs =\n  pristineIntrinsics.objectIs;\n\n'''
text = text[:start] + replacement + text[end:]

create_start = text.index("function makePristineIteratorDescriptor(")
create_end = text.index("function isWireScore(")
text = text[:create_start] + '''function createExperimentCapture(options) {\n  return experimentCreateExperimentCapture(\n    options\n  );\n}\n\n''' + text[create_end:]
safe.write_text(text)
