from pathlib import Path

p = Path("scripts/qa/m13-codex-p1-round3.py")
s = p.read_text()
old = '''replace_once(\n    "src/provider-adapter-m13.js",\n    '''    if (!isPromise(transportResult)) {\\n      throw boundaryError();\\n    }\\n    if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n      throw boundaryError();\\n    }''',\n    '''    if (!isPromise(transportResult)) {\\n      throw boundaryError();\\n    }\\n    if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n      consumeRejectedRecognizedPromise(transportResult);\\n      throw boundaryError();\\n    }''',\n    "provider consume before prototype failure"\n)'''
new = '''replace_once(\n    "src/provider-adapter-m13.js",\n    '''          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n            throw boundaryError("transport Promise has an unsupported current prototype.");\\n          }''',\n    '''          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n            consumeRejectedRecognizedPromise(transportResult);\\n            throw boundaryError("transport Promise has an unsupported current prototype.");\\n          }''',\n    "provider consume before prototype failure"\n)'''
if old not in s:
    raise SystemExit("round3 provider harness target not found")
s = s.replace(old, new, 1)
s = s.replace('experiment: makeReplayableExperiment(),', 'experiment: await makeExperiment(),', 1)
p.write_text(s)
