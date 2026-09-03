from pathlib import Path

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()

start = text.index('test("round6 util.inspect accessor is never invoked during package bootstrap"')
end = text.index('\ntest("round6 Buffer.isBuffer accessor', start)
block = text[start:end]
old = '''    "use strict";\n    const util = require("node:util");\n'''
new = '''    "use strict";\n    // Preload Node's own lazy perf/net/vm internals before poisoning util.inspect.\n    // The regression is meant to detect Gotcha reading the accessor, not Node's\n    // unrelated internal lazy initialization reading its own globally-poisoned API.\n    require("node:net");\n    require("node:perf_hooks");\n    require("node:vm");\n    const util = require("node:util");\n'''
if old not in block:
    raise SystemExit("round6 inspect regression bootstrap marker missing")
block = block.replace(old, new, 1)
path.write_text(text[:start] + block + text[end:])
print("round6 inspect regression now isolates Gotcha accessor reads from Node lazy internals")
