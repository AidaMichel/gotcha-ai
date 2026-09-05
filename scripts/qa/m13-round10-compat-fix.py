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
    consumerPrimordials: null,
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
