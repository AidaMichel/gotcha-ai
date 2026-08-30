from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

pattern = re.compile(
    r'''function captureTrustedModuleBrandCallable\(\n  moduleObject,.*?\n\}\n\nfunction captureTrustedModuleGetter\(''',
    re.S,
)

replacement = r'''function resolveTrustedModuleOrGlobalConstructor(
  moduleObject,
  constructorName,
  moduleSource,
  nativeRuntimeExpected
) {
  let moduleDescriptor;

  if (
    moduleObject !== null &&
    typeof moduleObject === "object" &&
    !utilTypePredicates.isProxy(moduleObject)
  ) {
    try {
      moduleDescriptor =
        getOwnPropertyDescriptor(
          moduleObject,
          constructorName
        );
    } catch {
      moduleDescriptor = undefined;
    }

    if (
      moduleDescriptor !== undefined &&
      "value" in moduleDescriptor &&
      typeof moduleDescriptor.value ===
        "function" &&
      !utilTypePredicates.isProxy(
        moduleDescriptor.value
      )
    ) {
      const moduleConstructor =
        moduleDescriptor.value;

      if (
        sourceBelongsToEmbeddedModule(
          moduleConstructor,
          moduleSource
        ) ||
        (
          nativeRuntimeExpected &&
          matchesAmbientNativeConstructor(
            moduleConstructor,
            constructorName
          )
        )
      ) {
        return moduleConstructor;
      }
    }
  }

  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        constructorName
      );
  } catch {
    return null;
  }

  if (globalDescriptor === undefined) {
    return null;
  }

  let globalConstructor;

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    globalConstructor =
      globalDescriptor.value;
  } else {
    const getter =
      globalDescriptor.get;
    const setter =
      globalDescriptor.set;

    if (
      globalDescriptor.enumerable !== false ||
      globalDescriptor.configurable !== true ||
      typeof getter !== "function" ||
      utilTypePredicates.isProxy(getter) ||
      !hasExpectedLazyAccessorMetadata(
        getter,
        "get",
        `get ${constructorName}`,
        0
      ) ||
      !sourceBelongsToUndiciLazyCore(getter) ||
      (
        setter !== undefined &&
        (
          typeof setter !== "function" ||
          utilTypePredicates.isProxy(setter) ||
          !hasExpectedLazyAccessorMetadata(
            setter,
            "set",
            `set ${constructorName}`,
            1
          ) ||
          !sourceBelongsToUndiciLazyCore(setter)
        )
      )
    ) {
      return null;
    }

    try {
      globalConstructor =
        reflectApply(
          getter,
          globalThis,
          []
        );
    } catch {
      return null;
    }

    let resolvedDescriptor;

    try {
      resolvedDescriptor =
        getOwnPropertyDescriptor(
          globalThis,
          constructorName
        );
    } catch {
      return null;
    }

    if (
      resolvedDescriptor === undefined ||
      "get" in resolvedDescriptor ||
      "set" in resolvedDescriptor ||
      resolvedDescriptor.value !==
        globalConstructor
    ) {
      return null;
    }
  }

  if (
    typeof globalConstructor !== "function" ||
    utilTypePredicates.isProxy(globalConstructor)
  ) {
    return null;
  }

  return (
    sourceBelongsToEmbeddedModule(
      globalConstructor,
      moduleSource
    ) ||
    (
      nativeRuntimeExpected &&
      matchesAmbientNativeConstructor(
        globalConstructor,
        constructorName
      )
    )
  )
    ? globalConstructor
    : null;
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

  const constructor =
    resolveTrustedModuleOrGlobalConstructor(
      moduleObject,
      constructorName,
      moduleSource,
      nativeRuntimeExpected
    );

  if (constructor === null) {
    if (runtimeExpected) {
      trustedModuleBrandAuthorityAvailable =
        false;
    }

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

function captureTrustedModuleGetter('''

core, count = pattern.subn(replacement, core, count=1)
if count != 1:
    raise SystemExit(
        f"expected one trusted module callable block, found {count}"
    )

marker = 'test("poisoned relocated global Blob accessor is rejected without execution"'
if marker not in test:
    test = test.rstrip() + r'''


test("poisoned relocated global Blob accessor is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalBlob = globalThis.Blob;
    if (typeof OriginalBlob !== "function") process.exit(0);

    const saved = new OriginalBlob(["x"]);
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    Object.defineProperty(globalThis, "Blob", {
      configurable: true,
      enumerable: false,
      get() {
        getterCalls += 1;
        throw new Error("poisoned global Blob getter executed");
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
print("added authenticated lazy-global fallback for relocated builtin brand authority")
