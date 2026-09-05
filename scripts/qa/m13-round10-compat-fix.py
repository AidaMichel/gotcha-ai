#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing compat anchor in {path}: {old[:100]!r}")
    path.write_text(text.replace(old, new, 1))

# The stable unavailable runtime object must be sufficient for lazy modules to
# initialize without invoking rejected ambient authority. These local closures
# are inert classification/freeze shims only; availability remains false.
path = Path("src/runtime-authority.js")
replace_once(
    path,
    '''  module.exports = {
    consumerPrimordialsAvailable: false,
    consumerPrimordials: null,
    promiseAuthorityAvailable: false,
    promiseConstructor: null,
    promisePrototype: null,
    promiseThen: null,
    promiseSpecies: null,
    canLoadMutableBuiltinGraph() { return false; }
  };
''',
    '''  module.exports = {
    objectFreeze(value) { return value; },
    functionToString: null,
    consumerPrimordialsAvailable: false,
    consumerPrimordials: { functionToString: null },
    weakRefConstructor: null,
    finalizationRegistryConstructor: null,
    isVmContext() { return true; },
    isProxy() { return true; },
    isPromise() { return false; },
    isAsyncFunction() { return true; },
    isGeneratorFunction() { return true; },
    isCryptoKey: null,
    isKeyObject: null,
    isDate() { return true; },
    isRegExp() { return true; },
    isMap() { return true; },
    isSet() { return true; },
    isWeakMap() { return true; },
    isWeakSet() { return true; },
    isNativeError() { return true; },
    isAnyArrayBuffer() { return true; },
    isDataView() { return true; },
    isTypedArray() { return true; },
    isArrayBufferView() { return true; },
    isBoxedPrimitive() { return true; },
    isArgumentsObject() { return true; },
    isGeneratorObject() { return true; },
    isModuleNamespaceObject() { return true; },
    isMapIterator() { return true; },
    isSetIterator() { return true; },
    isExternal() { return true; },
    bufferIsBuffer() { return true; },
    forbiddenProbes: [],
    hasForbiddenRuntimeBrand() { return true; },
    localFunctionPrototype: null,
    inspect: null,
    inspectCustom: null,
    inspectAuthorityAvailable: false,
    arrayIsArray() { return false; },
    promiseAuthorityAvailable: false,
    promiseConstructor: null,
    promisePrototype: null,
    promiseThen: null,
    promiseSpecies: null,
    hasTrustedLocalPromiseSpecies: false,
    canLoadMutableBuiltinGraph() { return false; }
  };
'''
)

# Authenticate process.getBuiltinModule only at the lazy legacy boundary. The
# Inspector origin proof is intentionally not run during package bootstrap,
# because loading Inspector can consult mutable node:util.inspect / Buffer
# exports on some Node releases. The candidate is never invoked until the
# origin proof succeeds, and the result is memoized after the first attempt.
path = Path("src/runtime-authority.js")
replace_once(
    path,
    '''let authenticatedGetBuiltinModule = null;
let nodeMajorVersion = null;
try {
  const versions = bootstrapOwnDataValue(process, "versions");
  const nodeVersion = bootstrapOwnDataValue(versions, "node");
  if (typeof nodeVersion === "string") {
    let majorText = "";
    for (let index = 0; index < nodeVersion.length; index += 1) {
      const character = nodeVersion[index];
      if (character === ".") break;
      if (character < "0" || character > "9") {
        majorText = "";
        break;
      }
      majorText += character;
    }
    if (majorText !== "") nodeMajorVersion = Number(majorText);
  }

  const candidate = bootstrapOwnDataValue(process, "getBuiltinModule");
  const source = typeof candidate === "function"
    ? pristineReflectApply(pristineFunctionToString, candidate, [])
    : null;
  if (
    nodeMajorVersion !== null &&
    nodeMajorVersion >= 20 &&
    typeof candidate === "function" &&
    source === builtinLoaderSource &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [candidate]
    ) === localFunctionPrototype &&
    inspectorHasNodeInternalFunctionOrigin(
      candidate,
      "node:internal/modules/helpers"
    )
  ) {
    authenticatedGetBuiltinModule = candidate;
  }
} catch {
  authenticatedGetBuiltinModule = null;
}

function canLoadMutableBuiltinGraph() {
''',
    '''let nodeMajorVersion = null;
try {
  const versions = bootstrapOwnDataValue(process, "versions");
  const nodeVersion = bootstrapOwnDataValue(versions, "node");
  if (typeof nodeVersion === "string") {
    let majorText = "";
    for (let index = 0; index < nodeVersion.length; index += 1) {
      const character = nodeVersion[index];
      if (character === ".") break;
      if (character < "0" || character > "9") {
        majorText = "";
        break;
      }
      majorText += character;
    }
    if (majorText !== "") nodeMajorVersion = Number(majorText);
  }
} catch {
  nodeMajorVersion = null;
}

let authenticatedGetBuiltinModule = null;
let builtinLoaderAuthenticationAttempted = false;

function getAuthenticatedBuiltinModule() {
  if (builtinLoaderAuthenticationAttempted) {
    return authenticatedGetBuiltinModule;
  }
  builtinLoaderAuthenticationAttempted = true;

  if (
    nodeMajorVersion === null ||
    nodeMajorVersion < 20
  ) return null;

  try {
    const candidate = bootstrapOwnDataValue(process, "getBuiltinModule");
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      typeof candidate === "function" &&
      source === builtinLoaderSource &&
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      inspectorHasNodeInternalFunctionOrigin(
        candidate,
        "node:internal/modules/helpers"
      )
    ) {
      authenticatedGetBuiltinModule = candidate;
    }
  } catch {
    authenticatedGetBuiltinModule = null;
  }

  return authenticatedGetBuiltinModule;
}

function canLoadMutableBuiltinGraph() {
'''
)
replace_once(
    path,
    '''  if (typeof authenticatedGetBuiltinModule !== "function") return false;

  try {
    const utilModule = pristineReflectApply(
      authenticatedGetBuiltinModule,
      undefined,
      ["node:util"]
    );
''',
    '''  const builtinLoader = getAuthenticatedBuiltinModule();
  if (typeof builtinLoader !== "function") return false;

  try {
    const utilModule = pristineReflectApply(
      builtinLoader,
      undefined,
      ["node:util"]
    );
'''
)

# Legacy provider may be pre-cached directly by adversarial tests. Do not load
# ai-data-core at all when shared runtime authority is unavailable.
path = Path("src/provider-adapter.js")
replace_once(
    path,
    '''const {
  isUnsupportedRuntimeObject
} = require("./ai-data-core");
''',
    '''const isUnsupportedRuntimeObject =
  runtimeAuthority.consumerPrimordialsAvailable === true
    ? require("./ai-data-core").isUnsupportedRuntimeObject
    : function unavailableRuntimeObjectClassifier() { return true; };
'''
)

print("Round10 compatibility remediation staged")
