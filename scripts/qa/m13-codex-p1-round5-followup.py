from pathlib import Path

for name in [
    "src/contract-quality-loop.js",
    "src/provider-adapter-m13.js",
    "src/mutation-pack.js",
]:
    p = Path(name)
    text = p.read_text()
    marker = '"use strict";\n\n'
    if 'const { types: utilTypes } = require("node:util");' not in text:
        if marker not in text:
            raise SystemExit(f"missing strict marker in {name}")
        text = text.replace(
            marker,
            marker + 'const { types: utilTypes } = require("node:util");\n',
            1,
        )
    p.write_text(text)

print("round5 retained non-authority util dependencies restored")
