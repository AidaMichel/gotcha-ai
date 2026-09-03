from pathlib import Path

# Replace runtime-authority with a bootstrap that never imports node:util.
# Proxy detection comes from V8's internal %IsJSProxy intrinsic, compiled while
# native syntax is enabled for the minimum synchronous window and disabled
# immediately afterward. Node 24 no longer exposes process.binding('v8'), so
# it uses process.getBuiltinModule('node:v8') without the public-loader sync.

runtime = r'''"use strict";

const { Buffer: BufferConstructor } = require("node:buffer");
const { runInNewContext } = require("node:vm");

const pristineReflectApply = runInNewContext("Reflect.apply");
const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");
const pristineGetOwnPropertyDescriptor = runInNewContext(
  "Object.getOwnPropertyDescriptor"
);
const pristineFunctionToString = runInNewContext(
  "Function.prototype.toString"
);
const pristineStringStartsWith = runInNewContext(
  "String.prototype.startsWith"
);
const pristineArrayBufferIsView = runInNewContext("ArrayBuffer.isView");
const pristineDataViewByteLengthGetter = runInNewContext(
  "Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get"
);
const pristineArrayConstructorSource = runInNewContext(
  "Function.prototype.toString.call(Array)"
);
const pristineArrayIsArraySource = runInNewContext(
  "Function.prototype.toString.call(Array.isArray)"
);
const pristinePromiseConstructorSource = runInNewContext(
  "Function.prototype.toString.call(Promise)"
);
const pristinePromiseThenSource = runInNewContext(
  "Function.prototype.toString.call(Promise.prototype.then)"
);
const pristinePromiseSpecies = runInNewContext("Symbol.species");
const pristinePromiseSpeciesGetterSource = runInNewContext(
  "Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)"
);
const pristineFunctionConstructor = runInNewContext("Function");
const pristineObjectToString = runInNewContext("Object.prototype.toString");
const pristineWeakMapHas = runInNewContext("WeakMap.prototype.has");
const pristineWeakSetHas = runInNewContext("WeakSet.prototype.has");
const pristineNumberValueOf = runInNewContext("Number.prototype.valueOf");
const pristineStringValueOf = runInNewContext("String.prototype.valueOf");
const pristineBooleanValueOf = runInNewContext("Boolean.prototype.valueOf");
const pristineBigIntValueOf = runInNewContext("BigInt.prototype.valueOf");
const pristineSymbolValueOf = runInNewContext("Symbol.prototype.valueOf");
const pristineObjectFreeze = runInNewContext("Object.freeze");

const localFunctionPrototype = pristineReflectApply(
  pristineGetPrototypeOf,
  undefined,
  [function gotchaLocalFunctionAuthorityAnchor() {}]
);

function unavailableProxyProbe() {
  return true;
}

function captureSetFlagsFromString() {
  try {
    const binding = process.binding("v8");
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [binding, "setFlagsFromString"]
    );
    if (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      typeof descriptor.value === "function"
    ) {
      return descriptor.value;
    }
  } catch {}

  try {
    const getterDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [process, "getBuiltinModule"]
    );
    const getter = (
      getterDescriptor !== undefined &&
      !("get" in getterDescriptor) &&
      !("set" in getterDescriptor) &&
      typeof getterDescriptor.value === "function"
    ) ? getterDescriptor.value : null;
    if (getter === null) return null;
    const v8Module = pristineReflectApply(
      getter,
      process,
      ["node:v8"]
    );
    if (v8Module === undefined || v8Module === null) return null;
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [v8Module, "setFlagsFromString"]
    );
    if (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      typeof descriptor.value === "function"
    ) {
      return descriptor.value;
    }
  } catch {}

  return null;
}

let isProxy = unavailableProxyProbe;
try {
  const setFlagsFromString = captureSetFlagsFromString();
  if (typeof setFlagsFromString === "function") {
    let compiled = null;
    try {
      pristineReflectApply(
        setFlagsFromString,
        undefined,
        ["--allow_natives_syntax"]
      );
      compiled = pristineReflectApply(
        pristineFunctionConstructor,
        undefined,
        ["value", "return %IsJSProxy(value);"]
      );
    } finally {
      try {
        pristineReflectApply(
          setFlagsFromString,
          undefined,
          ["--no-allow-natives-syntax"]
        );
      } catch {}
    }
    if (typeof compiled === "function") {
      isProxy = function isProxy(value) {
        try {
          return pristineReflectApply(compiled, undefined, [value]) === true;
        } catch {
          return true;
        }
      };
    }
  }
} catch {
  isProxy = unavailableProxyProbe;
}

function loadUtilTypesAuthority() {
  try {
    return require("node:util/types");
  } catch {}
  try {
    return process.binding("util");
  } catch {
    return null;
  }
}

const utilTypesAuthority = loadUtilTypesAuthority();

function nativeProbe(name) {
  if (
    utilTypesAuthority === null ||
    typeof utilTypesAuthority !== "object"
  ) return null;
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilTypesAuthority, name]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    if (typeof candidate !== "function" || isProxy(candidate)) return null;
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    if (
      typeof source !== "string" ||
      (
        !pristineReflectApply(
          pristineStringStartsWith,
          source,
          ["function "]
        ) &&
        !pristineReflectApply(
          pristineStringStartsWith,
          source,
          ["("]
        )
      )
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}

function unavailableBrandProbe() {
  return true;
}

function retainedProbe(name, fallback) {
  const candidate = nativeProbe(name);
  if (candidate !== null) return candidate;
  return typeof fallback === "function" ? fallback : unavailableBrandProbe;
}

function tagProbe(tag) {
  return function tagBrandProbe(value) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return false;
    }
    if (isProxy(value)) return false;
    try {
      return pristineReflectApply(pristineObjectToString, value, []) === tag;
    } catch {
      return false;
    }
  };
}

const weakMapKey = {};
function fallbackWeakMap(value) {
  if (value === null || typeof value !== "object" || isProxy(value)) return false;
  try {
    pristineReflectApply(pristineWeakMapHas, value, [weakMapKey]);
    return true;
  } catch {
    return false;
  }
}
function fallbackWeakSet(value) {
  if (value === null || typeof value !== "object" || isProxy(value)) return false;
  try {
    pristineReflectApply(pristineWeakSetHas, value, [weakMapKey]);
    return true;
  } catch {
    return false;
  }
}
function fallbackBoxedPrimitive(value) {
  if (value === null || typeof value !== "object" || isProxy(value)) return false;
  const probes = [
    pristineNumberValueOf,
    pristineStringValueOf,
    pristineBooleanValueOf,
    pristineBigIntValueOf,
    pristineSymbolValueOf
  ];
  for (let index = 0; index < probes.length; index += 1) {
    try {
      pristineReflectApply(probes[index], value, []);
      return true;
    } catch {}
  }
  return false;
}

const isAsyncFunction = retainedProbe(
  "isAsyncFunction",
  tagProbe("[object AsyncFunction]")
);
const isGeneratorFunction = retainedProbe(
  "isGeneratorFunction",
  tagProbe("[object GeneratorFunction]")
);
const isCryptoKey = nativeProbe("isCryptoKey");
const isKeyObject = nativeProbe("isKeyObject");
const isDate = retainedProbe("isDate", tagProbe("[object Date]"));
const isRegExp = retainedProbe("isRegExp", tagProbe("[object RegExp]"));
const isMap = retainedProbe("isMap", tagProbe("[object Map]"));
const isSet = retainedProbe("isSet", tagProbe("[object Set]"));
const isWeakMap = retainedProbe("isWeakMap", fallbackWeakMap);
const isWeakSet = retainedProbe("isWeakSet", fallbackWeakSet);
const isPromise = retainedProbe("isPromise", tagProbe("[object Promise]"));
const isNativeError = retainedProbe("isNativeError", tagProbe("[object Error]"));
const isAnyArrayBuffer = retainedProbe(
  "isAnyArrayBuffer",
  function fallbackArrayBuffer(value) {
    return tagProbe("[object ArrayBuffer]")(value) ||
      tagProbe("[object SharedArrayBuffer]")(value);
  }
);

function isDataView(value) {
  if (isProxy(value)) return false;
  try {
    if (
      pristineReflectApply(
        pristineArrayBufferIsView,
        undefined,
        [value]
      ) !== true
    ) return false;
    pristineReflectApply(
      pristineDataViewByteLengthGetter,
      value,
      []
    );
    return true;
  } catch {
    return false;
  }
}

function isTypedArray(value) {
  if (isProxy(value)) return false;
  try {
    return (
      pristineReflectApply(pristineArrayBufferIsView, undefined, [value]) === true &&
      isDataView(value) !== true
    );
  } catch {
    return false;
  }
}

function isArrayBufferView(value) {
  if (isProxy(value)) return false;
  try {
    return pristineReflectApply(
      pristineArrayBufferIsView,
      undefined,
      [value]
    ) === true;
  } catch {
    return false;
  }
}

const isBoxedPrimitive = retainedProbe("isBoxedPrimitive", fallbackBoxedPrimitive);
const isArgumentsObject = retainedProbe(
  "isArgumentsObject",
  tagProbe("[object Arguments]")
);
const isGeneratorObject = retainedProbe(
  "isGeneratorObject",
  tagProbe("[object Generator]")
);
const isModuleNamespaceObject = retainedProbe(
  "isModuleNamespaceObject",
  tagProbe("[object Module]")
);
const isMapIterator = retainedProbe(
  "isMapIterator",
  tagProbe("[object Map Iterator]")
);
const isSetIterator = retainedProbe(
  "isSetIterator",
  tagProbe("[object Set Iterator]")
);
const isExternal = retainedProbe("isExternal", function neverExternal() { return false; });

let bufferIsBuffer = unavailableBrandProbe;
try {
  const descriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [BufferConstructor, "isBuffer"]
  );
  const candidate = (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor)
  ) ? descriptor.value : null;
  const source = typeof candidate === "function"
    ? pristineReflectApply(pristineFunctionToString, candidate, [])
    : null;
  if (
    typeof candidate === "function" &&
    !isProxy(candidate) &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [candidate]
    ) === localFunctionPrototype &&
    typeof source === "string" &&
    pristineReflectApply(
      pristineStringStartsWith,
      source,
      ["function isBuffer("]
    ) === true
  ) {
    bufferIsBuffer = candidate;
  }
} catch {
  bufferIsBuffer = unavailableBrandProbe;
}

const forbiddenProbes = pristineReflectApply(
  pristineObjectFreeze,
  undefined,
  [[
    isDate,
    isRegExp,
    isMap,
    isSet,
    isWeakMap,
    isWeakSet,
    isPromise,
    isNativeError,
    isAnyArrayBuffer,
    isDataView,
    isTypedArray,
    isBoxedPrimitive,
    isArgumentsObject,
    isGeneratorObject,
    isModuleNamespaceObject,
    isMapIterator,
    isSetIterator,
    isExternal,
    bufferIsBuffer
  ]]
);

let arrayIsArray = null;
try {
  const arrayDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [globalThis, "Array"]
  );
  const arrayConstructor = (
    arrayDescriptor !== undefined &&
    !("get" in arrayDescriptor) &&
    !("set" in arrayDescriptor)
  ) ? arrayDescriptor.value : null;
  const isArrayDescriptor = (
    typeof arrayConstructor === "function" &&
    !isProxy(arrayConstructor)
  ) ? pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [arrayConstructor, "isArray"]
  ) : undefined;
  const candidate = (
    isArrayDescriptor !== undefined &&
    !("get" in isArrayDescriptor) &&
    !("set" in isArrayDescriptor)
  ) ? isArrayDescriptor.value : null;
  if (
    typeof arrayConstructor === "function" &&
    !isProxy(arrayConstructor) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [arrayConstructor]) === localFunctionPrototype &&
    pristineReflectApply(pristineFunctionToString, arrayConstructor, []) === pristineArrayConstructorSource &&
    typeof candidate === "function" &&
    !isProxy(candidate) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [candidate]) === localFunctionPrototype &&
    pristineReflectApply(pristineFunctionToString, candidate, []) === pristineArrayIsArraySource
  ) arrayIsArray = candidate;
} catch {
  arrayIsArray = null;
}

let promiseAuthorityAvailable = false;
let promiseConstructor = null;
let promisePrototype = null;
let promiseThen = null;
try {
  const localPromiseProbe = (async function gotchaRuntimePromiseProbe() {})();
  const localPromisePrototype = pristineReflectApply(
    pristineGetPrototypeOf,
    undefined,
    [localPromiseProbe]
  );
  const constructorDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [localPromisePrototype, "constructor"]
  );
  const thenDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [localPromisePrototype, "then"]
  );
  const ambientDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [globalThis, "Promise"]
  );
  const ambientConstructor = (
    ambientDescriptor !== undefined &&
    !("get" in ambientDescriptor) &&
    !("set" in ambientDescriptor)
  ) ? ambientDescriptor.value : null;
  const constructorCandidate = (
    constructorDescriptor !== undefined &&
    !("get" in constructorDescriptor) &&
    !("set" in constructorDescriptor)
  ) ? constructorDescriptor.value : null;
  const thenCandidate = (
    thenDescriptor !== undefined &&
    !("get" in thenDescriptor) &&
    !("set" in thenDescriptor)
  ) ? thenDescriptor.value : null;
  const prototypeDescriptor = (
    typeof ambientConstructor === "function" &&
    !isProxy(ambientConstructor)
  ) ? pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [ambientConstructor, "prototype"]
  ) : undefined;
  const speciesDescriptor = (
    typeof constructorCandidate === "function" &&
    !isProxy(constructorCandidate)
  ) ? pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [constructorCandidate, pristinePromiseSpecies]
  ) : undefined;
  const speciesGetterSource = (
    speciesDescriptor !== undefined &&
    typeof speciesDescriptor.get === "function"
  ) ? pristineReflectApply(pristineFunctionToString, speciesDescriptor.get, []) : null;
  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.writable === true &&
    constructorDescriptor.enumerable === false &&
    constructorDescriptor.configurable === true &&
    typeof constructorCandidate === "function" &&
    !isProxy(constructorCandidate) &&
    constructorCandidate === ambientConstructor &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [constructorCandidate]) === localFunctionPrototype &&
    pristineReflectApply(pristineFunctionToString, constructorCandidate, []) === pristinePromiseConstructorSource &&
    prototypeDescriptor !== undefined &&
    !("get" in prototypeDescriptor) &&
    !("set" in prototypeDescriptor) &&
    prototypeDescriptor.value === localPromisePrototype &&
    thenDescriptor !== undefined &&
    thenDescriptor.writable === true &&
    thenDescriptor.enumerable === false &&
    thenDescriptor.configurable === true &&
    typeof thenCandidate === "function" &&
    !isProxy(thenCandidate) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenCandidate]) === localFunctionPrototype &&
    pristineReflectApply(pristineFunctionToString, thenCandidate, []) === pristinePromiseThenSource &&
    speciesDescriptor !== undefined &&
    typeof speciesDescriptor.get === "function" &&
    speciesDescriptor.set === undefined &&
    speciesDescriptor.enumerable === false &&
    speciesDescriptor.configurable === true &&
    !isProxy(speciesDescriptor.get) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [speciesDescriptor.get]) === localFunctionPrototype &&
    speciesGetterSource === pristinePromiseSpeciesGetterSource
  ) {
    promiseAuthorityAvailable = true;
    promiseConstructor = constructorCandidate;
    promisePrototype = localPromisePrototype;
    promiseThen = thenCandidate;
  }
} catch {
  promiseAuthorityAvailable = false;
  promiseConstructor = null;
  promisePrototype = null;
  promiseThen = null;
}

function hasTrustedLocalPromiseSpecies(constructor, speciesSymbol) {
  try {
    if (
      typeof constructor !== "function" ||
      isProxy(constructor) ||
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [constructor]
      ) !== localFunctionPrototype
    ) return false;
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [constructor, speciesSymbol]
    );
    if (
      descriptor === undefined ||
      typeof descriptor.get !== "function" ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== false ||
      descriptor.configurable !== true ||
      isProxy(descriptor.get)
    ) return false;
    if (
      pristineReflectApply(
        pristineFunctionToString,
        descriptor.get,
        []
      ) !== pristinePromiseSpeciesGetterSource
    ) return false;
    return pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [descriptor.get]
    ) === localFunctionPrototype;
  } catch {
    return false;
  }
}

function hasForbiddenRuntimeBrand(value) {
  if (isProxy(value)) return true;
  try {
    if (isCryptoKey !== null && isCryptoKey(value) === true) return true;
    if (isKeyObject !== null && isKeyObject(value) === true) return true;
  } catch {
    return true;
  }
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    try {
      if (forbiddenProbes[index](value) === true) return true;
    } catch {
      return true;
    }
  }
  return false;
}

const exported = {
  isProxy,
  isPromise,
  isAsyncFunction,
  isGeneratorFunction,
  isCryptoKey,
  isKeyObject,
  isDate,
  isRegExp,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isNativeError,
  isAnyArrayBuffer,
  isDataView,
  isTypedArray,
  isArrayBufferView,
  isBoxedPrimitive,
  isArgumentsObject,
  isGeneratorObject,
  isModuleNamespaceObject,
  isMapIterator,
  isSetIterator,
  isExternal,
  bufferIsBuffer,
  forbiddenProbes,
  hasForbiddenRuntimeBrand,
  localFunctionPrototype,
  inspect: null,
  inspectCustom: null,
  inspectAuthorityAvailable: false,
  arrayIsArray,
  promiseAuthorityAvailable,
  promiseConstructor,
  promisePrototype,
  promiseThen,
  promiseSpecies: pristinePromiseSpecies,
  hasTrustedLocalPromiseSpecies
};

module.exports = pristineReflectApply(
  pristineObjectFreeze,
  undefined,
  [exported]
);
'''
Path("src/runtime-authority.js").write_text(runtime)

# AI-data no longer imports node:util, and PerformanceObserver identification
# no longer depends on util.inspect/custom inspection. A non-Proxy prototype
# chain comparison is enough for an unsupported-host-object rejection boundary.
path = Path("src/ai-data-core.js")
text = path.read_text()
text = text.replace('const nodeUtil =\n  require("node:util");\n\n', '', 1)
text = text.replace(
    'const inspect =\n  runtimeAuthority.inspect;\nconst inspectCustom =\n  runtimeAuthority.inspectCustom;\n\n',
    '',
    1
)
start = text.find("function capturePerformanceObserverBrandProbe() {")
end = text.find("\nlet trustedModuleBrandAuthorityAvailable", start)
if start == -1 or end == -1:
    raise SystemExit("PerformanceObserver authority block missing")
replacement = r'''function capturePerformanceObserverPrototype() {
  if (
    typeof PerformanceObserver !== "function" ||
    runtimeAuthority.isProxy(PerformanceObserver)
  ) return null;

  let descriptor;
  try {
    descriptor = getOwnPropertyDescriptor(
      PerformanceObserver,
      "prototype"
    );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value !== null &&
    typeof descriptor.value === "object" &&
    !runtimeAuthority.isProxy(descriptor.value)
  ) ? descriptor.value : null;
}

const performanceObserverPrototype =
  capturePerformanceObserverPrototype();

function hasUnsupportedPerformanceObserverBrand(value) {
  if (
    performanceObserverPrototype === null ||
    value === null ||
    typeof value !== "object" ||
    runtimeAuthority.isProxy(value)
  ) return false;

  let current = value;
  for (let depth = 0; depth < 32; depth += 1) {
    try {
      current = getPrototypeOf(current);
    } catch {
      return true;
    }
    if (current === performanceObserverPrototype) return true;
    if (current === null) return false;
    if (runtimeAuthority.isProxy(current)) return true;
  }
  return true;
}
'''
text = text[:start] + replacement + text[end:]
Path("src/ai-data-core.js").write_text(text)

# Keep package bootstrap narrow: public exports are stable wrappers that load
# implementation modules only when called. This prevents unrelated Node lazy
# builtin initialization (perf_hooks/worker_threads) from executing a poisoned
# util.inspect accessor merely because the package was required.
index = r'''"use strict";

function call(modulePath, exportName, args) {
  const implementation = require(modulePath)[exportName];
  return Reflect.apply(implementation, undefined, args);
}

function runGotcha({ evaluator, expectedOutput, mutationPack }) {
  const { compileMutationPack } = require("./mutation-pack");
  const { runImprovementLoop } = require("./engine");
  const mutations = compileMutationPack({
    output: expectedOutput,
    pack: mutationPack
  });
  return runImprovementLoop({
    evaluator,
    mutations,
    knownGoodOutput: expectedOutput
  });
}

function draftQualityContract(...args) {
  return call("./quality-contract", "draftQualityContract", args);
}
function confirmQualityContract(...args) {
  return call("./quality-contract", "confirmQualityContract", args);
}
function runContractAttacks(...args) {
  return call("./contract-attacks", "runContractAttacks", args);
}
function draftContractProtection(...args) {
  return call("./contract-remediation", "draftContractProtection", args);
}
function confirmContractProtection(...args) {
  return call("./contract-remediation", "confirmContractProtection", args);
}
function verifyContractProtection(...args) {
  return call("./contract-remediation", "verifyContractProtection", args);
}
function generateContractProtectionProposal(...args) {
  return call(
    "./contract-protection-proposal",
    "generateContractProtectionProposal",
    args
  );
}
function createStructuredProviderAdapter(...args) {
  return call(
    "./provider-adapter-m13",
    "createStructuredProviderAdapter",
    args
  );
}
function prepareContractQualityLoop(...args) {
  return call(
    "./contract-quality-loop",
    "prepareContractQualityLoop",
    args
  );
}
function completeContractQualityLoop(...args) {
  return call(
    "./contract-quality-loop",
    "completeContractQualityLoop",
    args
  );
}

module.exports = {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection,
  generateContractProtectionProposal,
  createStructuredProviderAdapter,
  prepareContractQualityLoop,
  completeContractQualityLoop
};
'''
Path("src/index.js").write_text(index)

print("round6 V8 proxy authority + util-free bootstrap redesign applied")
