from pathlib import Path

source_path = Path("src/ai-data-core.js")
test_path = Path("test/m8-runtime-brand-authority.test.js")

source = source_path.read_text()

old_helper = '''function captureGlobalConstructor(\n  name\n) {\n  let value;\n\n  try {\n    value = globalThis[name];\n  } catch {\n    return null;\n  }\n\n  return (\n    typeof value === "function" &&\n    !utilTypePredicates.isProxy(value)\n  )\n    ? value\n    : null;\n}\n\nfunction globalConstructorRequiresAuthority(\n  name\n) {\n  try {\n    return typeof globalThis[name] ===\n      "function";\n  } catch {\n    return true;\n  }\n}\n'''

new_helper = '''let globalHostBrandAuthorityAvailable = true;\n\nfunction captureGlobalConstructor(\n  name\n) {\n  let value;\n\n  try {\n    value = globalThis[name];\n  } catch {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  if (typeof value !== "function") {\n    return null;\n  }\n\n  if (utilTypePredicates.isProxy(value)) {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  return value;\n}\n'''

if old_helper not in source:
    raise SystemExit("captureGlobalConstructor block not found")
source = source.replace(old_helper, new_helper, 1)

old_authority = '''const additionalHostBrandAuthorityAvailable =\n  (\n    !globalConstructorRequiresAuthority(\n      "Headers"\n    ) ||\n    (\n      headersConstructor !== null &&\n      headersBrandMethod !== null\n    )\n  ) &&\n  (\n    !globalConstructorRequiresAuthority(\n      "FormData"\n    ) ||\n    (\n      formDataConstructor !== null &&\n      formDataBrandMethod !== null\n    )\n  );\n'''

new_authority = '''const additionalHostBrandMethodAuthorityAvailable =\n  (\n    headersConstructor === null ||\n    headersBrandMethod !== null\n  ) &&\n  (\n    formDataConstructor === null ||\n    formDataBrandMethod !== null\n  );\n'''

if old_authority not in source:
    raise SystemExit("additional host authority block not found")
source = source.replace(old_authority, new_authority, 1)

old_runtime_check = '''  if (!additionalHostBrandAuthorityAvailable) {\n    throw hostBrandAuthorityError();\n  }\n'''
new_runtime_check = '''  if (\n    !globalHostBrandAuthorityAvailable ||\n    !additionalHostBrandMethodAuthorityAvailable\n  ) {\n    throw hostBrandAuthorityError();\n  }\n'''

if old_runtime_check not in source:
    raise SystemExit("runtime authority check not found")
source = source.replace(old_runtime_check, new_runtime_check, 1)

source_path.write_text(source)

tests = test_path.read_text()
append = r'''

test("stateful host constructor lookup is captured once and fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const poisoned = new Proxy(OriginalHeaders, {});
    let reads = 0;

    Object.defineProperty(globalThis, "Headers", {
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? poisoned : undefined;
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(reads, 1);
    assert.throws(() => cloneAiData(saved));
  `);
});

test("proxy-backed shared host-brand constructor authority fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalURL = globalThis.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let trapCalls = 0;
    globalThis.URL = new Proxy(OriginalURL, {
      get() {
        trapCalls += 1;
        throw new Error("URL constructor trap executed");
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("URL constructor descriptor trap executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(trapCalls, 0);
  `);
});
'''

if 'stateful host constructor lookup is captured once and fails closed' in tests:
    raise SystemExit("review2 tests already present")

test_path.write_text(tests + append)
