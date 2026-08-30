from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()

old_runtime = '''const undiciRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 18;'''
new_runtime = '''const undiciRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 20;'''
if core.count(old_runtime) != 1:
    raise SystemExit(f"expected one Undici runtime gate, found {core.count(old_runtime)}")
core = core.replace(old_runtime, new_runtime, 1)

pattern = re.compile(
    r'''function sourceBelongsToUndiciBundle\(\n  callable\n\) \{.*?\nfunction captureIntlConstructor\(''',
    re.S,
)

replacement = r'''function sourceBelongsToUndiciBundle(
  callable
) {
  if (
    undiciNativeSource === null ||
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
      undiciNativeSource,
      [source]
    );
  } catch {
    return false;
  }
}

function captureEmbeddedNodeSource(
  moduleName
) {
  let bindingDescriptor;

  try {
    bindingDescriptor =
      getOwnPropertyDescriptor(
        nodeProcess,
        "binding"
      );
  } catch {
    return null;
  }

  if (
    bindingDescriptor === undefined ||
    "get" in bindingDescriptor ||
    "set" in bindingDescriptor ||
    typeof bindingDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      bindingDescriptor.value
    )
  ) {
    return null;
  }

  let natives;

  try {
    natives =
      reflectApply(
        bindingDescriptor.value,
        nodeProcess,
        ["natives"]
      );
  } catch {
    return null;
  }

  if (
    natives === null ||
    typeof natives !== "object" ||
    utilTypePredicates.isProxy(natives)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        natives,
        moduleName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    typeof descriptor.value === "string" &&
    descriptor.value !== ""
  )
    ? descriptor.value
    : null;
}

const undiciLazyAccessorCoreSources =
  objectFreeze([
    captureEmbeddedNodeSource(
      "internal/util"
    ),
    captureEmbeddedNodeSource(
      "internal/process/pre_execution"
    )
  ]);

function sourceBelongsToUndiciLazyCore(
  callable
) {
  if (
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
  } catch {
    return false;
  }

  for (
    const moduleSource of
      undiciLazyAccessorCoreSources
  ) {
    if (
      typeof moduleSource === "string" &&
      reflectApply(
        stringIncludes,
        moduleSource,
        [source]
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasExpectedCallableMetadata(
  callable,
  expectedName,
  expectedLength
) {
  let nameDescriptor;
  let lengthDescriptor;

  try {
    nameDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "name"
      );
    lengthDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "length"
      );
  } catch {
    return false;
  }

  return (
    nameDescriptor !== undefined &&
    !("get" in nameDescriptor) &&
    !("set" in nameDescriptor) &&
    nameDescriptor.value === expectedName &&
    lengthDescriptor !== undefined &&
    !("get" in lengthDescriptor) &&
    !("set" in lengthDescriptor) &&
    lengthDescriptor.value === expectedLength
  );
}

function hasExpectedLazyAccessorMetadata(
  callable,
  shortName,
  qualifiedName,
  expectedLength
) {
  let nameDescriptor;
  let lengthDescriptor;

  try {
    nameDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "name"
      );
    lengthDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "length"
      );
  } catch {
    return false;
  }

  return (
    nameDescriptor !== undefined &&
    !("get" in nameDescriptor) &&
    !("set" in nameDescriptor) &&
    (
      nameDescriptor.value === shortName ||
      nameDescriptor.value === qualifiedName
    ) &&
    lengthDescriptor !== undefined &&
    !("get" in lengthDescriptor) &&
    !("set" in lengthDescriptor) &&
    lengthDescriptor.value === expectedLength
  );
}

function resolveRequiredUndiciConstructor(
  constructorName
) {
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

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    return (
      typeof globalDescriptor.value === "function" &&
      !utilTypePredicates.isProxy(
        globalDescriptor.value
      )
    )
      ? globalDescriptor.value
      : null;
  }

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
      `get ${constructorName}`,
      0
    ) ||
    !hasExpectedLazyAccessorMetadata(
      setter,
      "set",
      `set ${constructorName}`,
      1
    ) ||
    !sourceBelongsToUndiciLazyCore(getter) ||
    !sourceBelongsToUndiciLazyCore(setter)
  ) {
    return null;
  }

  let constructor;

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

  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor)
  ) {
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
    resolvedDescriptor.value !== constructor
  ) {
    return null;
  }

  return constructor;
}

function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {
  if (!undiciRuntimeExpected) {
    return null;
  }

  if (undiciNativeSource === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const constructor =
    resolveRequiredUndiciConstructor(
      constructorName
    );

  if (
    constructor === null ||
    !hasExpectedCallableMetadata(
      constructor,
      constructorName,
      0
    ) ||
    !sourceBelongsToUndiciBundle(
      constructor
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let constructorDescriptor;
  let probeDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    probeDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    constructorDescriptor.value !== constructor ||
    probeDescriptor === undefined
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const callable =
    kind === "getter"
      ? probeDescriptor.get
      : probeDescriptor.value;

  const expectedName =
    kind === "getter"
      ? `get ${propertyName}`
      : propertyName;

  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable) ||
    !hasExpectedCallableMetadata(
      callable,
      expectedName,
      expectedLength
    ) ||
    !sourceBelongsToUndiciBundle(
      callable
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  return {
    constructor,
    method: callable,
    args
  };
}

function captureIntlConstructor('''

core, count = pattern.subn(replacement, core, count=1)
if count != 1:
    raise SystemExit(f"expected one Undici helper block, found {count}")

probe_pattern = re.compile(
    r'''const headersBrandProbe =\n  captureRequiredUndiciProbe\(.*?\nconst pristineWeakRefConstructor =''',
    re.S,
)
probe_replacement = r'''const headersBrandProbe =
  captureRequiredUndiciProbe(
    "Headers",
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const additionalHostBrandMethodAuthorityAvailable =
  !undiciRuntimeExpected ||
  (
    undiciHostBrandAuthorityAvailable &&
    headersBrandProbe !== null
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    headersBrandProbe === null
      ? []
      : [headersBrandProbe]
  );

const pristineWeakRefConstructor ='''
core, count = probe_pattern.subn(probe_replacement, core, count=1)
if count != 1:
    raise SystemExit(f"expected one Undici probe declaration block, found {count}")

old_reads = '''    assert.equal(reads, 1);
    assert.throws(() => cloneAiData(saved));'''
new_reads = '''    assert.equal(reads, 0);
    assert.throws(() => cloneAiData(saved));'''
if test.count(old_reads) != 1:
    raise SystemExit(f"expected one stateful read assertion, found {test.count(old_reads)}")
test = test.replace(old_reads, new_reads, 1)

marker = 'test("untrusted lazy Headers accessor is rejected without executing it"'
if marker not in test:
    test = test.rstrip() + r'''


test("untrusted lazy Headers accessor is rejected without executing it", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    let setterCalls = 0;
    Object.defineProperty(globalThis, "Headers", {
      configurable: true,
      enumerable: false,
      get() {
        getterCalls += 1;
        throw new Error("untrusted lazy Headers getter executed");
      },
      set() {
        setterCalls += 1;
        throw new Error("untrusted lazy Headers setter executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
  `);
});
''' + "\n"

CORE.write_text(core)
TEST.write_text(test)
print("narrowed Undici authority to authenticated lazy Headers on Node 20+")
