from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker for {label} in {path}")
    p.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Capture the security-relevant package-load identities without loading any
# Node builtins. Lazy implementation modules can then validate against the
# package-init state rather than whatever globals exist at first invocation.
# ---------------------------------------------------------------------------
Path("src/package-authority.js").write_text(r'''"use strict";

const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

function dataValue(object, key) {
  if (object === null || (typeof object !== "object" && typeof object !== "function")) {
    return null;
  }
  try {
    const descriptor = getOwnPropertyDescriptor(object, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

function accessorGetter(object, key) {
  if (object === null || (typeof object !== "object" && typeof object !== "function")) {
    return null;
  }
  try {
    const descriptor = getOwnPropertyDescriptor(object, key);
    return (
      descriptor !== undefined &&
      typeof descriptor.get === "function" &&
      descriptor.set === undefined
    ) ? descriptor.get : null;
  } catch {
    return null;
  }
}

const PromiseConstructor = dataValue(globalThis, "Promise");
const PromisePrototype = dataValue(PromiseConstructor, "prototype");
const PromiseThen = dataValue(PromisePrototype, "then");
const PromiseSpeciesGetter = accessorGetter(PromiseConstructor, Symbol.species);
const ArrayConstructor = dataValue(globalThis, "Array");
const ArrayIsArray = dataValue(ArrayConstructor, "isArray");
const FunctionConstructor = dataValue(globalThis, "Function");
const TypeErrorConstructor = dataValue(globalThis, "TypeError");

module.exports = Object.freeze({
  PromiseConstructor,
  PromisePrototype,
  PromiseThen,
  PromiseSpeciesGetter,
  ArrayConstructor,
  ArrayIsArray,
  FunctionConstructor,
  TypeErrorConstructor
});
''')

# Ensure package authority is captured at require("gotcha") time while keeping
# host-heavy implementation modules lazy.
replace_once(
    "src/index.js",
    '''"use strict";\n\nfunction call(modulePath, exportName, args) {''',
    '''"use strict";\n\nrequire("./package-authority");\n\nfunction call(modulePath, exportName, args) {''',
    "lazy index package authority capture"
)

# ---------------------------------------------------------------------------
# Shared runtime authority validates against package-init identities.
# ---------------------------------------------------------------------------
path = Path("src/runtime-authority.js")
text = path.read_text()
if 'const packageAuthority = require("./package-authority");' not in text:
    text = text.replace(
        '"use strict";\n\n',
        '"use strict";\n\nconst packageAuthority = require("./package-authority");\n',
        1
    )

start = text.find("let arrayIsArray = null;\ntry {")
end_marker = "} catch {\n  arrayIsArray = null;\n}\n"
end = text.find(end_marker, start)
if start == -1 or end == -1:
    raise SystemExit("runtime array authority block missing")
end += len(end_marker)
array_block = r'''let arrayIsArray = null;
try {
  const arrayConstructor = packageAuthority.ArrayConstructor;
  const candidate = packageAuthority.ArrayIsArray;
  const constructorSource = typeof arrayConstructor === "function"
    ? pristineReflectApply(pristineFunctionToString, arrayConstructor, [])
    : null;
  const candidateSource = typeof candidate === "function"
    ? pristineReflectApply(pristineFunctionToString, candidate, [])
    : null;
  if (
    typeof arrayConstructor === "function" &&
    !isProxy(arrayConstructor) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [arrayConstructor]) === localFunctionPrototype &&
    constructorSource === pristineArrayConstructorSource &&
    typeof candidate === "function" &&
    !isProxy(candidate) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [candidate]) === localFunctionPrototype &&
    candidateSource === pristineArrayIsArraySource
  ) {
    arrayIsArray = candidate;
  }
} catch {
  arrayIsArray = null;
}
'''
text = text[:start] + array_block + text[end:]

old = '''  const ambientDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [globalThis, "Promise"]\n  );\n  const ambientConstructor = (\n    ambientDescriptor !== undefined &&\n    !("get" in ambientDescriptor) &&\n    !("set" in ambientDescriptor)\n  ) ? ambientDescriptor.value : null;\n'''
new = '''  const ambientConstructor = packageAuthority.PromiseConstructor;\n'''
if old not in text:
    raise SystemExit("runtime Promise ambient marker missing")
text = text.replace(old, new, 1)

needle = '''    constructorCandidate === ambientConstructor &&\n'''
replacement = '''    constructorCandidate === ambientConstructor &&\n    packageAuthority.PromisePrototype === localPromisePrototype &&\n'''
if needle not in text:
    raise SystemExit("runtime Promise constructor identity marker missing")
text = text.replace(needle, replacement, 1)

needle = '''    typeof thenCandidate === "function" &&\n    !isProxy(thenCandidate) &&\n'''
replacement = '''    typeof thenCandidate === "function" &&\n    thenCandidate === packageAuthority.PromiseThen &&\n    !isProxy(thenCandidate) &&\n'''
if needle not in text:
    raise SystemExit("runtime Promise then marker missing")
text = text.replace(needle, replacement, 1)

needle = '''    typeof speciesDescriptor.get === "function" &&\n    speciesDescriptor.set === undefined &&\n'''
replacement = '''    typeof speciesDescriptor.get === "function" &&\n    speciesDescriptor.get === packageAuthority.PromiseSpeciesGetter &&\n    speciesDescriptor.set === undefined &&\n'''
if needle not in text:
    raise SystemExit("runtime Promise species marker missing")
text = text.replace(needle, replacement, 1)
path.write_text(text)

# ---------------------------------------------------------------------------
# Provider adapters consume the package-init Promise / TypeError identities.
# ---------------------------------------------------------------------------
path = Path("src/provider-adapter-m13.js")
text = path.read_text()
if 'const packageAuthority = require("./package-authority");' not in text:
    text = text.replace(
        'const runtimeAuthority = require("./runtime-authority");\n',
        'const runtimeAuthority = require("./runtime-authority");\nconst packageAuthority = require("./package-authority");\n',
        1
    )
start = text.find("let capturedAmbientPromiseConstructor = null;\ntry {")
end = text.find("\nlet trustedPromiseConstructor = null;", start)
if start == -1 or end == -1:
    raise SystemExit("provider captured ambient Promise block missing")
text = text[:start] + '''const capturedAmbientPromiseConstructor =\n  packageAuthority.PromiseConstructor;\n''' + text[end:]

old = '''  const ambientTypeErrorDescriptor =\n    getOwnPropertyDescriptor(globalThis, "TypeError");\n  const ambientTypeErrorCandidate =\n    ambientTypeErrorDescriptor !== undefined &&\n    !("get" in ambientTypeErrorDescriptor) &&\n    !("set" in ambientTypeErrorDescriptor)\n      ? ambientTypeErrorDescriptor.value\n      : null;\n'''
new = '''  const ambientTypeErrorCandidate =\n    packageAuthority.TypeErrorConstructor;\n'''
if old not in text:
    raise SystemExit("provider TypeError ambient marker missing")
text = text.replace(old, new, 1)
path.write_text(text)

path = Path("src/provider-adapter.js")
text = path.read_text()
old = '''const { types: utilTypes } = require("node:util");\nconst {\n  isUnsupportedRuntimeObject\n} = require("./ai-data-core");\n\nconst PromiseConstructor = Promise;\nconst PromisePrototype = Promise.prototype;\nconst TypeErrorConstructor = TypeError;\n'''
new = '''const runtimeAuthority = require("./runtime-authority");\nconst packageAuthority = require("./package-authority");\nconst {\n  isUnsupportedRuntimeObject\n} = require("./ai-data-core");\n\nconst PromiseConstructor = packageAuthority.PromiseConstructor;\nconst PromisePrototype = packageAuthority.PromisePrototype;\nconst TypeErrorConstructor = packageAuthority.TypeErrorConstructor;\n'''
if old not in text:
    raise SystemExit("legacy provider authority header missing")
text = text.replace(old, new, 1)
text = text.replace(
    'const promiseThen = Promise.prototype.then;\n',
    'const promiseThen = packageAuthority.PromiseThen;\n',
    1
)
text = text.replace(
    'const isProxy = utilTypes.isProxy;\nconst isPromise = utilTypes.isPromise;\n',
    'const isProxy = runtimeAuthority.isProxy;\nconst isPromise = runtimeAuthority.isPromise;\n',
    1
)
if "utilTypes" in text:
    raise SystemExit("legacy provider still references utilTypes")
path.write_text(text)

# ---------------------------------------------------------------------------
# PerformanceObserver hidden-slot brand detection without node:util.inspect.
# The documented custom-inspect symbol is global; the captured method performs
# the native brand check even after the instance prototype is rewritten.
# ---------------------------------------------------------------------------
path = Path("src/ai-data-core.js")
text = path.read_text()
start = text.find("function capturePerformanceObserverPrototype() {")
end = text.find("\nlet trustedModuleBrandAuthorityAvailable", start)
if start == -1 or end == -1:
    raise SystemExit("generated PerformanceObserver block missing")
performance_block = r'''const performanceObserverInspectCustom =
  Symbol.for("nodejs.util.inspect.custom");
const performanceObserverInspectOptions =
  objectFreeze({ depth: 0 });
const performanceObserverInertInspect =
  function gotchaPerformanceObserverInspect() { return ""; };

function capturePerformanceObserverBrandProbe() {
  if (
    typeof PerformanceObserver !== "function" ||
    runtimeAuthority.isProxy(PerformanceObserver) ||
    PerformanceObserver.prototype === null ||
    typeof PerformanceObserver.prototype !== "object" ||
    runtimeAuthority.isProxy(PerformanceObserver.prototype)
  ) return null;
  let descriptor;
  try {
    descriptor = getOwnPropertyDescriptor(
      PerformanceObserver.prototype,
      performanceObserverInspectCustom
    );
  } catch {
    return null;
  }
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    typeof descriptor.value === "function" &&
    !runtimeAuthority.isProxy(descriptor.value)
  ) ? descriptor.value : null;
}

const performanceObserverBrandProbe =
  capturePerformanceObserverBrandProbe();

function hasUnsupportedPerformanceObserverBrand(value) {
  if (
    performanceObserverBrandProbe === null ||
    value === null ||
    typeof value !== "object" ||
    runtimeAuthority.isProxy(value)
  ) return false;
  try {
    reflectApply(
      performanceObserverBrandProbe,
      value,
      [0, performanceObserverInspectOptions, performanceObserverInertInspect]
    );
    return true;
  } catch {
    return false;
  }
}
'''
text = text[:start] + performance_block + text[end:]
path.write_text(text)

# ---------------------------------------------------------------------------
# Permanent tests: mutable util.types probes are now deliberately irrelevant
# to the authenticated V8 / binding authority. Preserve trap-free assertions,
# update only obsolete identity/fail-closed expectations.
# ---------------------------------------------------------------------------
path = Path("test/runtime-authority.test.js")
text = path.read_text()
text = text.replace(
    'test("runtime authority retains the local util.types.isProxy authority", () => {\n  const authority = require("../src/runtime-authority");\n  assert.equal(authority.isProxy, util.types.isProxy);\n  assert.equal(authority.isProxy({}), false);\n  assert.equal(authority.isProxy(new Proxy({}, {})), true);\n});',
    'test("runtime authority provides trap-free local Proxy detection", () => {\n  const authority = require("../src/runtime-authority");\n  assert.equal(typeof authority.isProxy, "function");\n  assert.equal(authority.isProxy({}), false);\n  assert.equal(authority.isProxy(new Proxy({}, {})), true);\n});',
    1
)
text = text.replace(
    '    if (authority.isProxy({}) !== true) process.exit(22);',
    '    if (authority.isProxy({}) !== false) process.exit(22);\n    if (authority.isProxy(new Proxy({}, {})) !== true) process.exit(23);',
    1
)
path.write_text(text)

path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
text = text.replace(
    'test("round4 rejects Proxy isPromise probe before proposal generator execution", async () => {',
    'test("round4 ignores poisoned mutable isPromise probe without trap execution", async () => {',
    1
)
text = text.replace(
    '      if (generatorCalls !== 0 || trapCalls !== 0) process.exit(25);',
    '      if (generatorCalls !== 1 || trapCalls !== 0) process.exit(25);',
    1
)
text = text.replace(
    'test("round5 pre-load Proxy forbidden-brand probe fails closed without trap execution", async () => {',
    'test("round5 ignores poisoned mutable forbidden-brand probe without trap execution", async () => {',
    1
)
text = text.replace(
    '        if (generatorCalls !== 0 || trapCalls !== 0) process.exitCode = 77;',
    '        if (generatorCalls !== 1 || trapCalls !== 0) process.exitCode = 77;',
    1
)
path.write_text(text)

print("round6 package authority snapshot + host-brand closure applied")
