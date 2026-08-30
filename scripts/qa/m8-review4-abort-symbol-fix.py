from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

pattern = re.compile(
    r'''function captureAbortBrandGetters\(\) \{.*?\nconst abortBrandGetters =\n  captureAbortBrandGetters\(\);''',
    re.S,
)
replacement = r'''function hasOpaqueNestedSymbolState(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    utilTypePredicates.isProxy(value)
  ) {
    return false;
  }

  let descriptors;

  try {
    descriptors =
      getOwnPropertyDescriptors(value);
  } catch {
    return false;
  }

  for (const key of ownKeys(descriptors)) {
    if (typeof key !== "symbol") {
      continue;
    }

    const descriptor = descriptors[key];

    if (
      descriptor === undefined ||
      "get" in descriptor ||
      "set" in descriptor
    ) {
      continue;
    }

    const child = descriptor.value;

    if (
      child === null ||
      typeof child !== "object"
    ) {
      continue;
    }

    if (utilTypePredicates.isProxy(child)) {
      return true;
    }

    let childDescriptors;

    try {
      childDescriptors =
        getOwnPropertyDescriptors(child);
    } catch {
      return true;
    }

    for (
      const childKey of
        ownKeys(childDescriptors)
    ) {
      if (typeof childKey === "symbol") {
        return true;
      }
    }
  }

  return false;
}'''
core, count = pattern.subn(replacement, core, count=1)
if count != 1:
    raise SystemExit(f"expected one Abort getter capture block, found {count}")

old_entries = '''      abortBrandGetters.controller,
      abortBrandGetters.signal
'''
if core.count(old_entries) != 1:
    raise SystemExit(f"expected one Abort getter list seam, found {core.count(old_entries)}")
core = core.replace(old_entries, "", 1)

old_runtime = '''    hasUnsupportedPerformanceObserverBrand(
      value
    ) ||'''
new_runtime = '''    hasOpaqueNestedSymbolState(value) ||
    hasUnsupportedPerformanceObserverBrand(
      value
    ) ||'''
if core.count(old_runtime) != 1:
    raise SystemExit(f"expected one runtime classifier seam, found {core.count(old_runtime)}")
core = core.replace(old_runtime, new_runtime, 1)

marker = 'test("prototype-rewritten AbortController uses descriptor-only runtime classification"'
if marker not in test:
    test = test.rstrip() + r'''


test("prototype-rewritten AbortController uses descriptor-only runtime classification", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const nodeUtil = require("node:util");

    const OriginalAbortController = globalThis.AbortController;
    if (typeof OriginalAbortController !== "function") process.exit(0);

    const saved = new OriginalAbortController();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    let utilGetterCalls = 0;
    const descriptor = Object.getOwnPropertyDescriptor(
      nodeUtil,
      "transferableAbortController"
    );

    if (
      descriptor !== undefined &&
      descriptor.configurable === true
    ) {
      Object.defineProperty(
        nodeUtil,
        "transferableAbortController",
        {
          configurable: true,
          enumerable: descriptor.enumerable,
          get() {
            utilGetterCalls += 1;
            throw new Error("node:util Abort authority getter executed");
          }
        }
      );
    }

    globalThis.AbortController = undefined;

    assert.throws(
      () => cloneAiData(saved, "AbortController"),
      /unsupported runtime object/
    );
    assert.equal(utilGetterCalls, 0);
  `);
});
''' + "\n"

CORE.write_text(core)
TEST.write_text(test)
print("replaced Abort getter authority with descriptor-only opaque symbol classification")
