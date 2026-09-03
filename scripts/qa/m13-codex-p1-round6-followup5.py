from pathlib import Path

path = Path("src/index.js")
text = path.read_text()
marker = 'const {\n  runImprovementLoop\n} = require("./engine");\n'
insert = 'require("./runtime-authority");\n\n' + marker
if text.startswith('require("./runtime-authority");'):
    print("runtime authority already first")
elif marker in text:
    path.write_text(text.replace(marker, insert, 1))
    print("runtime authority is now the package entrypoint bootstrap boundary")
else:
    raise SystemExit("src/index.js engine import marker missing")
