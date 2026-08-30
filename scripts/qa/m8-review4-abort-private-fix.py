from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

needle = '''function hasOpaqueNestedSymbolState(
  value
) {
'''
if core.count(needle) != 1:
    raise SystemExit(f"expected one opaque symbol helper, found {core.count(needle)}")

end_marker = '''  return false;
}

const trustedHostBrandGetters ='''
if core.count(end_marker) != 1:
    raise SystemExit(f"expected one opaque symbol helper end seam, found {core.count(end_marker)}")

abort_helpers = r'''  return false;
}

const abortControllerRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 20;

const abortControllerNativeSource =
  abortControllerRuntimeExpected
    ? captureEmbeddedNodeSource(
        "internal/abort_controller"
      )
    : null;

function sourceBelongsToAbortControllerNative(
  callable
) {
  if (
    abortControllerNativeSource === null ||
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
      abortControllerNativeSource,
      [source]
    );
  } catch {
    return false;
  }
}

function resolveTrustedAbortControllerConstructor() {
  if (!abortControllerRuntimeExpected) {
    return null;
  }

  if (abortControllerNativeSource === null) {
    return null;
  }

  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        "AbortController"
      );
  } catch {
    return null;
  }

  if (globalDescriptor === undefined) {
    return null;
  }

  let constructor;

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    constructor =
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
      typeof setter !== "function" ||
      utilTypePredicates.isProxy(getter) ||
      utilTypePredicates.isProxy(setter) ||
      !hasExpectedLazyAccessorMetadata(
        getter,
        "get",
        "get AbortController",
        0
      ) ||
      !hasExpectedLazyAccessorMetadata(
        setter,
        "set",
        "set AbortController",
        1
      ) ||
      !sourceBelongsToUndiciLazyCore(
        getter
      ) ||
      !sourceBelongsToUndiciLazyCore(
        setter
      )
    ) {
      return null;
    }

    try {
      constructor =
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
          "AbortController"
        );
    } catch {
      return null;
    }

    if (
      resolvedDescriptor === undefined ||
      "get" in resolvedDescriptor ||
      "set" in resolvedDescriptor ||
      resolvedDescriptor.value !== constructor
    ) {
      return null;
    }
  }

  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor) ||
    !hasExpectedCallableMetadata(
      constructor,
      "AbortController",
      0
    ) ||
    !sourceBelongsToAbortControllerNative(
      constructor
    )
  ) {
    return null;
  }

  return constructor;
}

function captureAbortControllerBrandGetter() {
  const constructor =
    resolveTrustedAbortControllerConstructor();

  if (constructor === null) {
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    return null;
  }

  let constructorDescriptor;
  let signalDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    signalDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "signal"
      );
  } catch {
    return null;
  }

  if (
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    constructorDescriptor.value !== constructor ||
    signalDescriptor === undefined ||
    signalDescriptor.enumerable !== true ||
    signalDescriptor.configurable !== true ||
    typeof signalDescriptor.get !== "function" ||
    signalDescriptor.set !== undefined ||
    utilTypePredicates.isProxy(
      signalDescriptor.get
    ) ||
    !hasExpectedCallableMetadata(
      signalDescriptor.get,
      "get signal",
      0
    ) ||
    !sourceBelongsToAbortControllerNative(
      signalDescriptor.get
    )
  ) {
    return null;
  }

  return signalDescriptor.get;
}

const abortControllerBrandGetter =
  captureAbortControllerBrandGetter();

const abortControllerBrandAuthorityAvailable =
  !abortControllerRuntimeExpected ||
  abortControllerBrandGetter !== null;

const trustedHostBrandGetters ='''

core = core.replace(end_marker, abort_helpers, 1)

list_seam = '''    [
      capturePrototypeGetter(
'''
list_replacement = '''    [
      abortControllerBrandGetter,
      capturePrototypeGetter(
'''
if core.count(list_seam) != 1:
    raise SystemExit(f"expected one trusted getter list seam, found {core.count(list_seam)}")
core = core.replace(list_seam, list_replacement, 1)

gate = '''  if (
    !additionalHostBrandMethodAuthorityAvailable
  ) {'''
gate_replacement = '''  if (
    !additionalHostBrandMethodAuthorityAvailable ||
    !abortControllerBrandAuthorityAvailable
  ) {'''
if core.count(gate) != 1:
    raise SystemExit(f"expected one additional-brand authority gate, found {core.count(gate)}")
core = core.replace(gate, gate_replacement, 1)

old_test_start = 'test("prototype-rewritten AbortController uses descriptor-only runtime classification", () => {'
start = test.find(old_test_start)
if start == -1:
    raise SystemExit("expected descriptor-only AbortController regression")
end = test.find('\n});', start)
if end == -1:
    raise SystemExit("could not find AbortController regression end")
end += len('\n});')

new_tests = r'''test("prototype-rewritten AbortController uses captured private-brand authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalAbortController = globalThis.AbortController;
    if (typeof OriginalAbortController !== "function") process.exit(0);

    const saved = new OriginalAbortController();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    globalThis.AbortController = undefined;

    assert.throws(
      () => cloneAiData(saved, "AbortController"),
      /unsupported runtime object/
    );
  `);
});

test("untrusted lazy AbortController accessor fails closed without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalAbortController = globalThis.AbortController;
    if (typeof OriginalAbortController !== "function") process.exit(0);

    const saved = new OriginalAbortController();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    let setterCalls = 0;

    Object.defineProperty(
      globalThis,
      "AbortController",
      {
        configurable: true,
        enumerable: false,
        get() {
          getterCalls += 1;
          throw new Error("untrusted AbortController getter executed");
        },
        set() {
          setterCalls += 1;
          throw new Error("untrusted AbortController setter executed");
        }
      }
    );

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
  `);
});'''

test = test[:start] + new_tests + test[end:]

CORE.write_text(core)
TEST.write_text(test)
print("added authenticated AbortController private-brand authority for Node 20+")
