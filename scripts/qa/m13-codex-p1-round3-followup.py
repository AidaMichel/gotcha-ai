from pathlib import Path

p = Path("scripts/qa/m13-codex-p1-round3.py")
s = p.read_text()
start_marker = "# Insert consume-before-prototype-failure after genuine Promise brand recognition.\n"
end_marker = "# 6) Mutation Pack must fail before executing any callback if rejection observation authority is unavailable.\n"
start = s.find(start_marker)
end = s.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("round3 provider harness section markers not found")
replacement = """# Insert consume-before-prototype-failure after genuine Promise brand recognition.\nreplace_once(\n    \"src/provider-adapter-m13.js\",\n    '''          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n            throw boundaryError(\"transport Promise has an unsupported current prototype.\");\\n          }''',\n    '''          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\\n            consumeRejectedRecognizedPromise(transportResult);\\n            throw boundaryError(\"transport Promise has an unsupported current prototype.\");\\n          }''',\n    \"provider consume before prototype failure\"\n)\n\n"""
s = s[:start] + replacement + s[end:]
s = s.replace('experiment: makeReplayableExperiment(),', 'experiment: await makeExperiment(),', 1)
p.write_text(s)
