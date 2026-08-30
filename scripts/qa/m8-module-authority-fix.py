from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

pattern = re.compile(
    r'''function captureModuleConstructor\(\n  moduleObject,\n  name\n\) \{.*?\n\}\n\nfunction hasOpaqueNestedSymbolState\(''',
    re.S,
)

replacement = r'''let trustedModuleBrandAuthorityAvailable =
  true;

function sourceBelongsToEmbeddedModule(
  callable,
  moduleSource
) {
  if (
    typeof moduleSource !== "string" ||
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );

    return reflectApply(
      stringIncludes,
      moduleSource,
      [source]
    );
  } catch {
    return false;
  }
}

function embeddedModuleDeclaresConstructor(
  moduleSource,
  name
) {
  if (typeof moduleSource !== "string") {
    return false;
  }

  return (
    reflectApply(
      stringIncludes,
      moduleSource,
      [`class ${name}`]
    ) ||
    reflectApply(
      stringIncludes,
      moduleSource,
      [`function ${name}`]
    )
  );
}

function matchesAmbientNativeConstructor(
  constructor,
  name
) {
  let descriptor;
  let source;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        globalThis,
        name
      );
    source =
      reflectApply(
        functionToString,
        constructor,
        []
      );
  } catch {
    return false;
  }

  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === constructor &&
    typeof constructor === "function" &&
    !utilTypePredicates.isProxy(constructor) &&
    reflectApply(
      stringIncludes,
      source,
      ["[native code]"]
    )
  );
}

function captureTrustedModuleBrandCallable(
  moduleObject,
  constructorName,
  propertyName,
  kind,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  const moduleSource =
    sourceModuleName === null
      ? null
      : captureEmbeddedNodeSource(
          sourceModuleName
        );

  const runtimeExpected =
    embeddedModuleDeclaresConstructor(
      moduleSource,
      constructorName
    ) ||
    nativeRuntimeExpected;

  if (
    moduleObject === null ||
    typeof moduleObject !== "object" ||
    utilTypePredicates.isProxy(moduleObject)
  ) {
    if (runtimeExpected) {
      trustedModuleBrandAuthorityAvailable =
        false;
    }

    return null;
  }

  let constructorDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        moduleObject,
        constructorName
      );
  } catch {
    if (runtimeExpected) {
      trustedModuleBrandAuthorityAvailable =
        false;
    }

    return null;
  }

  if (
    constructorDescriptor === undefined ||
    !("value" in constructorDescriptor) ||
    typeof constructorDescriptor.value !==
      "function" ||
    utilTypePredicates.isProxy(
      constructorDescriptor.value
    )
  ) {
    if (runtimeExpected) {
      trustedModuleBrandAuthorityAvailable =
        false;
    }

    return null;
  }

  const constructor =
    constructorDescriptor.value;

  const constructorTrusted =
    sourceBelongsToEmbeddedModule(
      constructor,
      moduleSource
    ) ||
    (
      nativeRuntimeExpected &&
      matchesAmbientNativeConstructor(
        constructor,
        constructorName
      )
    );

  if (!constructorTrusted) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  let prototypeConstructorDescriptor;
  let brandDescriptor;

  try {
    prototypeConstructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    brandDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  if (
    prototypeConstructorDescriptor ===
      undefined ||
    !("value" in
      prototypeConstructorDescriptor) ||
    prototypeConstructorDescriptor.value !==
      constructor ||
    brandDescriptor === undefined
  ) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  const callable =
    kind === "getter"
      ? brandDescriptor.get
      : brandDescriptor.value;

  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  const callableTrusted =
    sourceBelongsToEmbeddedModule(
      callable,
      moduleSource
    ) ||
    (
      nativeRuntimeExpected &&
      matchesAmbientNativeConstructor(
        constructor,
        constructorName
      ) &&
      (() => {
        let source;

        try {
          source =
            reflectApply(
              functionToString,
              callable,
              []
            );
        } catch {
          return false;
        }

        return reflectApply(
          stringIncludes,
          source,
          ["[native code]"]
        );
      })()
    );

  if (!callableTrusted) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  return callable;
}

function captureTrustedModuleGetter(
  moduleObject,
  constructorName,
  propertyName,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  return captureTrustedModuleBrandCallable(
    moduleObject,
    constructorName,
    propertyName,
    "getter",
    sourceModuleName,
    nativeRuntimeExpected
  );
}

function captureTrustedModuleMethod(
  moduleObject,
  constructorName,
  propertyName,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  return captureTrustedModuleBrandCallable(
    moduleObject,
    constructorName,
    propertyName,
    "method",
    sourceModuleName,
    nativeRuntimeExpected
  );
}

function hasOpaqueNestedSymbolState('''

core, count = pattern.subn(replacement, core, count=1)
if count != 1:
    raise SystemExit(f"expected one module constructor helper block, found {count}")

getter_specs = [
    ("nodeUtil", "TextEncoder", "encoding", "internal/encoding", "false"),
    ("nodeUtil", "TextDecoder", "encoding", "internal/encoding", "false"),
    ("nodeUrl", "URL", "href", "internal/url", "false"),
    ("nodeUrl", "URLPattern", "pathname", "null", "nodeMajorVersion >= 24"),
    ("nodeBuffer", "File", "name", "internal/file", "false"),
    ("streamWeb", "ReadableStream", "locked", "internal/webstreams/readablestream", "false"),
    ("streamWeb", "WritableStream", "locked", "internal/webstreams/writablestream", "false"),
    ("streamWeb", "TransformStream", "readable", "internal/webstreams/transformstream", "false"),
    ("streamWeb", "TextEncoderStream", "readable", "internal/webstreams/encoding", "false"),
    ("streamWeb", "TextDecoderStream", "readable", "internal/webstreams/encoding", "false"),
    ("streamWeb", "CompressionStream", "readable", "internal/webstreams/compression", "false"),
    ("streamWeb", "DecompressionStream", "readable", "internal/webstreams/compression", "false"),
    ("streamWeb", "CountQueuingStrategy", "highWaterMark", "internal/webstreams/queuingstrategies", "false"),
    ("streamWeb", "ByteLengthQueuingStrategy", "highWaterMark", "internal/webstreams/queuingstrategies", "false"),
]

for module_var, constructor, prop, source_module, native_expected in getter_specs:
    old = f'''capturePrototypeGetter(\n        captureModuleConstructor(\n          {module_var},\n          "{constructor}"\n        ),\n        "{prop}"\n      )'''
    source_arg = "null" if source_module == "null" else f'"{source_module}"'
    new = f'''captureTrustedModuleGetter(\n        {module_var},\n        "{constructor}",\n        "{prop}",\n        {source_arg},\n        {native_expected}\n      )'''
    if core.count(old) != 1:
        raise SystemExit(f"expected one getter seam for {constructor}.{prop}, found {core.count(old)}")
    core = core.replace(old, new, 1)

method_specs = [
    ("nodeUrl", "URLSearchParams", "toString", "internal/url"),
    ("nodeBuffer", "Blob", "slice", "internal/blob"),
]

for module_var, constructor, prop, source_module in method_specs:
    old = f'''capturePrototypeMethod(\n        captureModuleConstructor(\n          {module_var},\n          "{constructor}"\n        ),\n        "{prop}"\n      )'''
    new = f'''captureTrustedModuleMethod(\n        {module_var},\n        "{constructor}",\n        "{prop}",\n        "{source_module}"\n      )'''
    if core.count(old) != 1:
        raise SystemExit(f"expected one method seam for {constructor}.{prop}, found {core.count(old)}")
    core = core.replace(old, new, 1)

gate_old = '''  if (\n    !additionalHostBrandMethodAuthorityAvailable ||\n    !abortControllerBrandAuthorityAvailable\n  ) {'''
gate_new = '''  if (\n    !additionalHostBrandMethodAuthorityAvailable ||\n    !abortControllerBrandAuthorityAvailable ||\n    !trustedModuleBrandAuthorityAvailable\n  ) {'''
if core.count(gate_old) != 1:
    raise SystemExit(f"expected one host authority gate, found {core.count(gate_old)}")
core = core.replace(gate_old, gate_new, 1)

marker = 'test("poisoned node:url module export is rejected without executing its brand getter"'
if marker not in test:
    test = test.rstrip() + r'''


test("poisoned node:url module export is rejected without executing its brand getter", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const nodeUrl = require("node:url");

    const OriginalURL = nodeUrl.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    function FakeURL() {}
    Object.defineProperty(FakeURL.prototype, "href", {
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("poisoned node:url URL getter executed");
      }
    });

    nodeUrl.URL = FakeURL;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
  `);
});

test("poisoned genuine node:url brand getter is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const nodeUrl = require("node:url");

    const OriginalURL = nodeUrl.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const descriptor = Object.getOwnPropertyDescriptor(
      OriginalURL.prototype,
      "href"
    );
    if (!descriptor || descriptor.configurable !== true) process.exit(0);

    let getterCalls = 0;
    Object.defineProperty(OriginalURL.prototype, "href", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        getterCalls += 1;
        throw new Error("poisoned genuine URL href getter executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
  `);
});
''' + "\n"

CORE.write_text(core)
TEST.write_text(test)
print("authenticated mutable builtin module constructor and brand-probe authority")
