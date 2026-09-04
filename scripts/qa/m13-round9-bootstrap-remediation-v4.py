from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


core_path = Path("src/contract-attacks-core.js")
core = core_path.read_text()
core = replace_once(
    core,
    '''const {\n  types: utilTypes\n} = require("node:util");\nconst {\n  Buffer: BufferConstructor\n} = require("node:buffer");\n''',
    '',
    "remove unused lazy builtin captures",
)
core_path.write_text(core)


test_path = Path("test/m13-review-remediation.test.js")
test = test_path.read_text()
test = replace_once(
    test,
    '''      api = require(${JSON.stringify(indexPath)});\n      void api.createStructuredProviderAdapter;\n''',
    '''      api = require(${JSON.stringify(indexPath)});\n      void api.createStructuredProviderAdapter;\n      void api.runContractAttacks;\n''',
    "extend lazy util types regression",
)
test_path.write_text(test)

print("Removed dead lazy builtin captures and extended Round-9 coverage.")
