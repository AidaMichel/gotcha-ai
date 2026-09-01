from pathlib import Path

for name in [
    "src/contract-quality-loop.js",
    "src/provider-adapter-m13.js",
    "src/mutation-pack.js",
]:
    p = Path(name)
    text = p.read_text()
    import_line = 'const { types: utilTypes } = require("node:util");\n'
    if import_line not in text:
        strict_marker = '"use strict";\n\n'
        if strict_marker in text:
            text = text.replace(strict_marker, strict_marker + import_line, 1)
        else:
            text = import_line + text
    p.write_text(text)

print("round5 retained non-authority util dependencies restored")
