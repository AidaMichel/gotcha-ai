from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

blob_getter = '''      capturePrototypeGetter(
        captureModuleConstructor(
          nodeBuffer,
          "Blob"
        ),
        "size"
      ),
'''

if core.count(blob_getter) != 1:
    raise SystemExit(f"expected one Blob.size probe, found {core.count(blob_getter)}")

core = core.replace(blob_getter, "", 1)

url_params_method = '''      capturePrototypeMethod(
        captureModuleConstructor(
          nodeUrl,
          "URLSearchParams"
        ),
        "toString"
      )
'''

blob_method_block = '''      capturePrototypeMethod(
        captureModuleConstructor(
          nodeUrl,
          "URLSearchParams"
        ),
        "toString"
      ),
      capturePrototypeMethod(
        captureModuleConstructor(
          nodeBuffer,
          "Blob"
        ),
        "slice"
      )
'''

if core.count(url_params_method) != 1:
    raise SystemExit(f"expected one URLSearchParams method probe, found {core.count(url_params_method)}")

core = core.replace(url_params_method, blob_method_block, 1)

marker = 'test("module-owned Blob slice authenticates rewritten Blob without rejecting plain data"'
if marker not in test:
    test = test.rstrip() + r'''


test("module-owned Blob slice authenticates rewritten Blob without rejecting plain data", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const { Blob } = require("node:buffer");
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.deepEqual(
      cloneAiData({ safe: true }),
      { safe: true }
    );

    if (typeof Blob !== "function") process.exit(0);

    const value = new Blob(["x"]);
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);

    assert.throws(() => cloneAiData(value));
  `);
});
''' + "\n"

CORE.write_text(core)
TEST.write_text(test)
print("replaced non-authenticating Blob.size getter with Blob.slice brand method")
