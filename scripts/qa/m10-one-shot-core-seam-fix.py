from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "src/contract-attacks-core.js",
    "async function runContractAttacks(\n  options = {}\n) {",
    "async function runContractAttacks(\n  options = {},\n  experimentEvidenceRecorder = null\n) {",
)

replace_once(
    "src/contract-attacks-core.js",
    "  const generated =\n    validateGeneratorOutput(\n      rawGeneratorOutput,\n      contract\n    );",
    '''  if (\n    typeof experimentEvidenceRecorder ===\n      "function"\n  ) {\n    try {\n      experimentEvidenceRecorder(\n        rawGeneratorOutput\n      );\n    } catch {\n      // Experiment evidence is observational only.\n      // It must never change legacy M8 behavior.\n    }\n  }\n\n  const generated =\n    validateGeneratorOutput(\n      rawGeneratorOutput,\n      contract\n    );''',
)

Path("src/contract-attacks.js").write_text('''"use strict";\n\nconst {\n  buildExperiment,\n  createExperimentCapture,\n  createGeneratorEvidenceRecorder\n} = require("./contract-experiment-safe");\n\nconst {\n  runContractAttacks:\n    runContractAttacksCore\n} = require("./contract-attacks-core");\n\nconst defineProperty =\n  Object.defineProperty;\n\nasync function runContractAttacks(\n  options = {}\n) {\n  const experimentCapture =\n    createExperimentCapture(options);\n  const recordGeneratorEvidence =\n    createGeneratorEvidenceRecorder(\n      experimentCapture\n    );\n\n  const result =\n    await runContractAttacksCore(\n      options,\n      recordGeneratorEvidence\n    );\n\n  const experiment =\n    buildExperiment(\n      experimentCapture,\n      result\n    );\n\n  defineProperty(\n    result,\n    "experiment",\n    {\n      value: experiment,\n      writable: true,\n      enumerable: true,\n      configurable: true\n    }\n  );\n\n  return result;\n}\n\nmodule.exports = {\n  runContractAttacks\n};\n''')

replace_once(
    "src/contract-experiment.js",
    "  for (const scoreKey of SCORE_KEYS) {\n    const descriptor =\n      scoreDescriptors[scoreKey];",
    '''  for (\n    let scoreIndex = 0;\n    scoreIndex < SCORE_KEYS.length;\n    scoreIndex += 1\n  ) {\n    const scoreKey =\n      SCORE_KEYS[scoreIndex];\n    const descriptor =\n      scoreDescriptors[scoreKey];''',
)

replace_once(
    "src/contract-experiment.js",
    'const {\n  types: utilTypes\n} = require("node:util");',
    'const {\n  types: utilTypes\n} = require("node:util");\nconst {\n  runInNewContext\n} = require("node:vm");\nconst {\n  Buffer: BufferConstructor\n} = require("node:buffer");',
)

replace_once(
    "src/contract-experiment.js",
    "  Buffer.isBuffer\n];",
    "  BufferConstructor.isBuffer\n];",
)

replace_once(
    "src/contract-experiment.js",
    '''const arrayIsArray = Array.isArray;\nconst getOwnPropertyDescriptors =\n  Object.getOwnPropertyDescriptors;\nconst getOwnPropertyDescriptor =\n  Object.getOwnPropertyDescriptor;\nconst getPrototypeOf = Object.getPrototypeOf;\nconst isExtensible = Object.isExtensible;\nconst objectIs = Object.is;\nconst defineProperty = Object.defineProperty;\nconst ownKeys = Reflect.ownKeys;\nconst reflectApply = Reflect.apply;\nconst numberIsFinite = Number.isFinite;\nconst stringTrim = String.prototype.trim;''',
    '''const pristineIntrinsics =\n  runInNewContext(`({\n    arrayIsArray: Array.isArray,\n    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors,\n    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,\n    getPrototypeOf: Object.getPrototypeOf,\n    isExtensible: Object.isExtensible,\n    objectIs: Object.is,\n    defineProperty: Object.defineProperty,\n    ownKeys: Reflect.ownKeys,\n    reflectApply: Reflect.apply,\n    numberIsFinite: Number.isFinite,\n    stringTrim: String.prototype.trim,\n    hasOwnProperty: Object.prototype.hasOwnProperty,\n    setHas: Set.prototype.has,\n    setAdd: Set.prototype.add,\n    mapGet: Map.prototype.get,\n    mapSet: Map.prototype.set,\n    arrayPush: Array.prototype.push,\n    arrayPop: Array.prototype.pop,\n    arrayJoin: Array.prototype.join,\n    SetConstructor: Set,\n    MapConstructor: Map\n  })`);\n\nconst arrayIsArray =\n  pristineIntrinsics.arrayIsArray;\nconst getOwnPropertyDescriptors =\n  pristineIntrinsics.getOwnPropertyDescriptors;\nconst getOwnPropertyDescriptor =\n  pristineIntrinsics.getOwnPropertyDescriptor;\nconst getPrototypeOf =\n  pristineIntrinsics.getPrototypeOf;\nconst isExtensible =\n  pristineIntrinsics.isExtensible;\nconst objectIs =\n  pristineIntrinsics.objectIs;\nconst defineProperty =\n  pristineIntrinsics.defineProperty;\nconst ownKeys =\n  pristineIntrinsics.ownKeys;\nconst reflectApply =\n  pristineIntrinsics.reflectApply;\nconst numberIsFinite =\n  pristineIntrinsics.numberIsFinite;\nconst stringTrim =\n  pristineIntrinsics.stringTrim;''',
)

replace_once(
    "src/contract-experiment.js",
    "const hasOwnProperty =\n  Object.prototype.hasOwnProperty;",
    "const hasOwnProperty =\n  pristineIntrinsics.hasOwnProperty;",
)
replace_once(
    "src/contract-experiment.js",
    "const SetConstructor = Set;\nconst MapConstructor = Map;",
    "const SetConstructor =\n  pristineIntrinsics.SetConstructor;\nconst MapConstructor =\n  pristineIntrinsics.MapConstructor;",
)
replace_once(
    "src/contract-experiment.js",
    "const setHas = Set.prototype.has;\nconst setAdd = Set.prototype.add;\nconst mapGet = Map.prototype.get;\nconst mapSet = Map.prototype.set;\nconst arrayPush = Array.prototype.push;\nconst arrayPop = Array.prototype.pop;\nconst arrayJoin = Array.prototype.join;",
    '''const setHas =\n  pristineIntrinsics.setHas;\nconst setAdd =\n  pristineIntrinsics.setAdd;\nconst mapGet =\n  pristineIntrinsics.mapGet;\nconst mapSet =\n  pristineIntrinsics.mapSet;\nconst arrayPush =\n  pristineIntrinsics.arrayPush;\nconst arrayPop =\n  pristineIntrinsics.arrayPop;\nconst arrayJoin =\n  pristineIntrinsics.arrayJoin;''',
)

replace_once(
    "src/contract-experiment-safe.js",
    "const numberIsFinite = Number.isFinite;\nconst objectIs = Object.is;",
    'const numberIsFinite =\n  runInNewContext("Number.isFinite");\nconst objectIs =\n  runInNewContext("Object.is");',
)
