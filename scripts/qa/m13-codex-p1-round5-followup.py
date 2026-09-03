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

provider = Path("src/provider-adapter-m13.js")
text = provider.read_text()
debug_block = '''if (process.env.M13_AUTH_DEBUG === "1") {\n  console.error("M13_AUTH_DEBUG " + JSON.stringify({\n    providerBrandAuthorityAvailable,\n    promiseAuthorityAvailable,\n    legacyTypeErrorAuthorityAvailable,\n    capturedPromiseMatches: capturedAmbientPromiseConstructor === trustedPromiseConstructor\n  }));\n}\n\n'''
if debug_block in text:
    text = text.replace(debug_block, "", 1)
provider.write_text(text)

# ai-data-core previously snapshotted util.types.isProxy directly. Under pre-load
# poisoning that duplicate authority could execute a Proxy apply trap during module load.
# Route every Proxy classification in this module through the shared, trap-safe authority.
ai_data_core = Path("src/ai-data-core.js")
text = ai_data_core.read_text()
runtime_import = 'const runtimeAuthority =\n  require("./runtime-authority");\n\n'
if runtime_import not in text:
    marker = 'const nodeUtil =\n  require("node:util");\n\n'
    if marker not in text:
        raise SystemExit("missing ai-data-core nodeUtil import marker")
    text = text.replace(marker, marker + runtime_import, 1)
text = text.replace("utilTypePredicates.isProxy(", "runtimeAuthority.isProxy(")
ai_data_core.write_text(text)

print("round5 dependencies restored; debug removed; ai-data-core uses shared Proxy authority")
