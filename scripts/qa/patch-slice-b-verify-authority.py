from pathlib import Path

core = Path('src/contract-attacks-core.js')
text = core.read_text()
old = '''    MapConstructor:\n      Map,\n    mapGet:\n      Map.prototype.get,\n    mapSet:\n      Map.prototype.set\n  });'''
new = '''    MapConstructor:\n      Map,\n    mapGet:\n      Map.prototype.get,\n    mapSet:\n      Map.prototype.set,\n    PromiseThen:\n      Promise.prototype.then\n  });'''
if old not in text:
    raise SystemExit('core authority tail not found')
core.write_text(text.replace(old, new, 1))

path = Path('src/contract-remediation.js')
text = path.read_text()
old = '''  MapConstructor,\n  mapGet,\n  mapSet\n} = authority;'''
new = '''  MapConstructor,\n  mapGet,\n  mapSet,\n  PromiseThen: promiseThen\n} = authority;'''
if old not in text:
    raise SystemExit('authority destructure tail not found')
text = text.replace(old, new, 1)
old = '''  MapConstructor,\n  mapGet,\n  mapSet\n];'''
new = '''  MapConstructor,\n  mapGet,\n  mapSet,\n  promiseThen\n];'''
if old not in text:
    raise SystemExit('required functions tail not found')
text = text.replace(old, new, 1)
old = '''function scheduleVerification(capture, resolve, reject) {\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n  const then = PromiseConstructor.prototype.then;\n  reflectApply(then, kickoff, [\n    () => buildVerification(capture),\n    () => { throw boundaryError(); }\n  ]).then(\n    (result) => settleArtifact(resolve, result),\n    () => reject(boundaryError())\n  );\n}'''
new = '''function scheduleVerification(capture, resolve, reject) {\n  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());\n  const verification = reflectApply(promiseThen, kickoff, [\n    () => buildVerification(capture),\n    () => { throw boundaryError(); }\n  ]);\n  reflectApply(promiseThen, verification, [\n    (result) => settleArtifact(resolve, result),\n    () => reject(boundaryError())\n  ]);\n}'''
if old not in text:
    raise SystemExit('schedule block not found')
path.write_text(text.replace(old, new, 1))
