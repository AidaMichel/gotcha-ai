from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()

anchor = '''function boundaryError() {\n  return new TypeErrorConstructor(\n    "Invalid M10 contract-remediation boundary."\n  );\n}\n'''
helper = '''\nconst safePromiseSpeciesContainer = {};\ndefineProperty(safePromiseSpeciesContainer, promiseSpecies, {\n  value: PromiseConstructor,\n  writable: false,\n  enumerable: false,\n  configurable: false\n});\n\nfunction observeInternalPromise(promise, onFulfilled, onRejected) {\n  const previousConstructor = getOwnPropertyDescriptor(\n    promise,\n    "constructor"\n  );\n\n  defineProperty(promise, "constructor", {\n    value: safePromiseSpeciesContainer,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n\n  try {\n    return reflectApply(promiseThen, promise, [\n      onFulfilled,\n      onRejected\n    ]);\n  } finally {\n    if (previousConstructor === undefined) {\n      deleteProperty(promise, "constructor");\n    } else {\n      defineProperty(\n        promise,\n        "constructor",\n        previousConstructor\n      );\n    }\n  }\n}\n'''
if anchor not in text:
    raise SystemExit('boundaryError anchor not found')
text = text.replace(anchor, anchor + helper, 1)

text = text.replace(
'''    reflectApply(promiseThen, replayPromise, [\n      (result) => {''',
'''    observeInternalPromise(replayPromise,\n      (result) => {''',
1)
text = text.replace(
'''      }\n    ]);\n  });\n}\n\nfunction freshEmptyArray()''',
'''      }\n    );\n  });\n}\n\nfunction freshEmptyArray()''',
1)

text = text.replace(
'''    reflectApply(promiseThen, baselinePromise, [\n      (baselinePhase) => {''',
'''    observeInternalPromise(baselinePromise,\n      (baselinePhase) => {''',
1)
text = text.replace(
'''          reflectApply(promiseThen, improvedPromise, [\n            (improvedPhase) => {''',
'''          observeInternalPromise(improvedPromise,\n            (improvedPhase) => {''',
1)
text = text.replace(
'''            },\n            reject\n          ]);''',
'''            },\n            reject\n          );''',
1)
text = text.replace(
'''      },\n      reject\n    ]);\n  });\n}\n\nfunction scheduleVerification''',
'''      },\n      reject\n    );\n  });\n}\n\nfunction scheduleVerification''',
1)

old_schedule = '''function scheduleVerification(capture, resolve, reject) {\n  const speciesContainer = {};\n  defineProperty(speciesContainer, promiseSpecies, {\n    value: PromiseConstructor,\n    writable: false,\n    enumerable: false,\n    configurable: false\n  });\n\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n  defineProperty(kickoff, "constructor", {\n    value: speciesContainer,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n\n  reflectApply(promiseThen, kickoff, [\n    () => {\n      let verification;\n      try {\n        verification = buildVerification(capture);\n        defineProperty(verification, "constructor", {\n          value: speciesContainer,\n          writable: true,\n          enumerable: false,\n          configurable: true\n        });\n        reflectApply(promiseThen, verification, [\n          (result) => settleArtifact(resolve, result),\n          () => reject(boundaryError())\n        ]);\n        deleteProperty(verification, "constructor");\n      } catch {\n        reject(boundaryError());\n      }\n    },\n    () => reject(boundaryError())\n  ]);\n\n  deleteProperty(kickoff, "constructor");\n}\n'''
new_schedule = '''function scheduleVerification(capture, resolve, reject) {\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n\n  observeInternalPromise(\n    kickoff,\n    () => {\n      try {\n        const verification = buildVerification(capture);\n        observeInternalPromise(\n          verification,\n          (result) => settleArtifact(resolve, result),\n          () => reject(boundaryError())\n        );\n      } catch {\n        reject(boundaryError());\n      }\n    },\n    () => reject(boundaryError())\n  );\n}\n'''
if old_schedule not in text:
    raise SystemExit('scheduleVerification block not found')
text = text.replace(old_schedule, new_schedule, 1)

path.write_text(text)

test_path = Path('test/contract-remediation-verify.test.js')
test_text = test_path.read_text()
regression = r'''\n\ntest("verification shields internal Promise observations from hostile species and constructor hooks", async () => {\n  const protection = await confirmedProtection();\n  const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);\n  const constructorDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, "constructor");\n  let speciesCalls = 0;\n  let constructorCalls = 0;\n\n  Object.defineProperty(Promise, Symbol.species, {\n    get() {\n      speciesCalls += 1;\n      throw new Error("hostile species getter executed");\n    },\n    configurable: true\n  });\n  Object.defineProperty(Promise.prototype, "constructor", {\n    get() {\n      constructorCalls += 1;\n      throw new Error("hostile constructor getter executed");\n    },\n    configurable: true\n  });\n\n  try {\n    await assert.rejects(\n      verifyContractProtection({\n        protection,\n        evaluator: historicalEvaluator,\n        improvedEvaluator(output) {\n          return output.time === "3 PM";\n        }\n      }),\n      TypeError\n    );\n    assert.equal(speciesCalls, 0);\n    assert.equal(constructorCalls, 0);\n  } finally {\n    Object.defineProperty(Promise, Symbol.species, speciesDescriptor);\n    Object.defineProperty(Promise.prototype, "constructor", constructorDescriptor);\n  }\n});\n'''
if 'verification shields internal Promise observations from hostile species and constructor hooks' not in test_text:
    test_path.write_text(test_text + regression)
