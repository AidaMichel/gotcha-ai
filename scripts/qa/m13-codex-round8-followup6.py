from pathlib import Path

path = Path("test/runtime-authority.test.js")
text = path.read_text()
old = '''    // With the only local proxy probe poisoned, Round-8 deliberately marks
    // proxy identity unavailable and fails closed: unknown objects are treated
    // as Proxy-risk rather than invoking attacker-controlled probe authority.
    if (authority.isProxy({}) !== true) process.exit(22);
'''
new = '''    // The poisoned public probe is never invoked. When the fresh V8 fallback
    // is available, runtime authority safely recovers exact Proxy detection.
    if (authority.isProxy({}) !== false) process.exit(22);
'''
if old not in text:
    raise SystemExit("missing fail-closed poisoned-isProxy assertion")
path.write_text(text.replace(old, new, 1))
print("Aligned poisoned-isProxy regression with safe fresh-V8 authority recovery.")
