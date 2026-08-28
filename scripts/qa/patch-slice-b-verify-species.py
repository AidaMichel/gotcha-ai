from pathlib import Path

core = Path('src/contract-attacks-core.js')
text = core.read_text()
old = '''    PromiseThen:\n      Promise.prototype.then\n  });'''
new = '''    PromiseThen:\n      Promise.prototype.then,\n    PromiseSpecies:\n      Symbol.species\n  });'''
if old not in text:
    raise SystemExit('PromiseThen authority tail not found')
core.write_text(text.replace(old, new, 1))

path = Path('src/contract-remediation.js')
text = path.read_text()
old = '''  PromiseThen: promiseThen\n} = authority;'''
new = '''  PromiseThen: promiseThen,\n  PromiseSpecies: promiseSpecies\n} = authority;'''
if old not in text:
    raise SystemExit('promise authority destructure not found')
text = text.replace(old, new, 1)
old = '''function scheduleVerification(capture, resolve, reject) {\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n  const verification = reflectApply(promiseThen, kickoff, [\n    () => buildVerification(capture),\n    () => { throw boundaryError(); }\n  ]);\n  reflectApply(promiseThen, verification, [\n    (result) => settleArtifact(resolve, result),\n    () => reject(boundaryError())\n  ]);\n}'''
new = '''function scheduleVerification(capture, resolve, reject) {\n  const speciesContainer = {};\n  defineProperty(speciesContainer, promiseSpecies, {\n    value: PromiseConstructor,\n    writable: false,\n    enumerable: false,\n    configurable: false\n  });\n\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n  defineProperty(kickoff, "constructor", {\n    value: speciesContainer,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n  const verification = reflectApply(promiseThen, kickoff, [\n    () => buildVerification(capture),\n    () => { throw boundaryError(); }\n  ]);\n  deleteProperty(kickoff, "constructor");\n\n  defineProperty(verification, "constructor", {\n    value: speciesContainer,\n    writable: true,\n    enumerable: false,\n    configurable: true\n  });\n  reflectApply(promiseThen, verification, [\n    (result) => settleArtifact(resolve, result),\n    () => reject(boundaryError())\n  ]);\n  deleteProperty(verification, "constructor");\n}'''
if old not in text:
    raise SystemExit('scheduleVerification block not found')
path.write_text(text.replace(old, new, 1))
