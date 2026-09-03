"use strict";

const packageAuthority = require("./package-authority");
const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;

function bootstrapOwnDataValue(object, key) {
  if (
    typeof bootstrapGetOwnPropertyDescriptor !== "function" ||
    object === null ||
    (typeof object !== "object" && typeof object !== "function")
  ) return null;
  try {
    const descriptor = bootstrapGetOwnPropertyDescriptor(object, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

function bootstrapBuiltinWasLoaded(modulePath) {
  const list = bootstrapOwnDataValue(process, "moduleLoadList");
  if (list === null || typeof list !== "object") return true;
  const bareName = modulePath.slice(0, 5) === "node:"
    ? modulePath.slice(5)
    : modulePath;
  try {
    for (let index = 0; index < list.length; index += 1) {
      if (list[index] === "NativeModule " + bareName) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function bootstrapBuiltinModule(modulePath, rejectIfAlreadyLoaded) {
  const getBuiltinModule = bootstrapOwnDataValue(process, "getBuiltinModule");
  if (typeof getBuiltinModule === "function") {
    try {
      return getBuiltinModule(modulePath);
    } catch {
      return null;
    }
  }

  // Node 14/16/18 have no process.getBuiltinModule(). Requiring an already
  // mutated builtin may synchronize its exports and execute accessors before
  // we can inspect descriptors. For vm we therefore use a same-realm captured
  // fallback when it was already loaded. V8 is allowed to re-require because
  // its candidate is never invoked until exact implementation authentication.
  if (rejectIfAlreadyLoaded === true && bootstrapBuiltinWasLoaded(modulePath)) {
    return null;
  }
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

function bootstrapBuiltinDataExportIsSafe(modulePath, key) {
  const getBuiltinModule = bootstrapOwnDataValue(process, "getBuiltinModule");
  // Older supported Nodes do not expose getBuiltinModule. Preserve their
  // already-validated bootstrap path instead of re-requiring a loaded builtin.
  if (typeof getBuiltinModule !== "function") return true;
  try {
    const moduleObject = getBuiltinModule(modulePath);
    const descriptor = bootstrapGetOwnPropertyDescriptor(moduleObject, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    );
  } catch {
    return false;
  }
}

// On Node 22, loading node:vm can transitively read node:buffer.Buffer.
// Inspect the export descriptor without invoking it. Only the accessor-backed
// hostile case skips vm and uses the descriptor-captured fallback authority;
// a normal already-loaded Buffer still retains fresh vm authority.
const vmModule = bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")
  ? bootstrapBuiltinModule("node:vm", true)
  : null;
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");

const hasFreshVmAuthority = typeof runInNewContext === "function";

const pristineReflectApply = hasFreshVmAuthority
  ? runInNewContext("Reflect.apply")
  : packageAuthority.ReflectApply;
const pristineGetPrototypeOf = hasFreshVmAuthority
  ? runInNewContext("Object.getPrototypeOf")
  : packageAuthority.ObjectGetPrototypeOf;
const pristineGetOwnPropertyDescriptor = hasFreshVmAuthority
  ? runInNewContext("Object.getOwnPropertyDescriptor")
  : packageAuthority.GetOwnPropertyDescriptor;
const pristineFunctionToString = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString")
  : packageAuthority.FunctionToString;
const pristineStringStartsWith = hasFreshVmAuthority
  ? runInNewContext("String.prototype.startsWith")
  : packageAuthority.StringStartsWith;
const pristineArrayBufferIsView = hasFreshVmAuthority
  ? runInNewContext("ArrayBuffer.isView")
  : packageAuthority.ArrayBufferIsView;
const pristineDataViewByteLengthGetter = hasFreshVmAuthority
  ? runInNewContext("Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get")
  : packageAuthority.DataViewByteLengthGetter;

function bootstrapFunctionSource(value) {
  if (
    typeof pristineReflectApply !== "function" ||
    typeof pristineFunctionToString !== "function" ||
    typeof value !== "function"
  ) return null;
  try {
    return pristineReflectApply(pristineFunctionToString, value, []);
  } catch {
    return null;
  }
}

const pristineArrayConstructorSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Array)")
  : bootstrapFunctionSource(packageAuthority.ArrayConstructor);
const pristineArrayIsArraySource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Array.isArray)")
  : bootstrapFunctionSource(packageAuthority.ArrayIsArray);
const pristinePromiseConstructorSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Promise)")
  : bootstrapFunctionSource(packageAuthority.PromiseConstructor);
const pristinePromiseThenSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Promise.prototype.then)")
  : bootstrapFunctionSource(packageAuthority.PromiseThen);
const pristinePromiseSpecies = hasFreshVmAuthority
  ? runInNewContext("Symbol.species")
  : packageAuthority.SymbolSpecies;
const pristinePromiseSpeciesGetterSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)")
  : bootstrapFunctionSource(packageAuthority.PromiseSpeciesGetter);
const pristineFunctionConstructor = hasFreshVmAuthority
  ? runInNewContext("Function")
  : packageAuthority.FunctionConstructor;
const pristineObjectToString = hasFreshVmAuthority
  ? runInNewContext("Object.prototype.toString")
  : packageAuthority.ObjectToString;
const pristineWeakMapHas = hasFreshVmAuthority
  ? runInNewContext("WeakMap.prototype.has")
  : packageAuthority.WeakMapHas;
const pristineWeakSetHas = hasFreshVmAuthority
  ? runInNewContext("WeakSet.prototype.has")
  : packageAuthority.WeakSetHas;
const pristineNumberValueOf = hasFreshVmAuthority
  ? runInNewContext("Number.prototype.valueOf")
  : packageAuthority.NumberValueOf;
const pristineStringValueOf = hasFreshVmAuthority
  ? runInNewContext("String.prototype.valueOf")
  : packageAuthority.StringValueOf;
const pristineBooleanValueOf = hasFreshVmAuthority
  ? runInNewContext("Boolean.prototype.valueOf")
  : packageAuthority.BooleanValueOf;
const pristineBigIntValueOf = hasFreshVmAuthority
  ? runInNewContext("BigInt.prototype.valueOf")
  : packageAuthority.BigIntValueOf;
const pristineSymbolValueOf = hasFreshVmAuthority
  ? runInNewContext("Symbol.prototype.valueOf")
  : packageAuthority.SymbolValueOf;
const pristineObjectFreeze = hasFreshVmAuthority
  ? runInNewContext("Object.freeze")
  : packageAuthority.ObjectFreeze;

const localFunctionPrototype = pristineReflectApply(
  pristineGetPrototypeOf,
  undefined,
  [function gotchaLocalFunctionAuthorityAnchor() {}]
);

function unavailableProxyProbe() {
  return true;
}

const supportedSetFlagsFromStringSource =
  "function setFlagsFromString(flags) {\n" +
  "  validateString(flags, 'flags');\n" +
  "  _setFlagsFromString(flags);\n" +
  "}";

function captureSetFlagsFromString() {
  // Node 22's node:v8 module imports node:buffer.Buffer during evaluation.
  // Never load it when that export is accessor-backed: doing so would execute
  // attacker-controlled bootstrap code before proxy authority exists. In that
  // hostile state the V8 proxy fallback is unavailable and callers fail closed.
  if (!bootstrapBuiltinDataExportIsSafe("node:buffer", "Buffer")) {
    return null;
  }
  try {
    const v8Module = bootstrapBuiltinModule("node:v8", false);
    if (v8Module === null) return null;
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [v8Module, "setFlagsFromString"]
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
      descriptor !== undefined &&
      descriptor.writable === true &&
      descriptor.enumerable === true &&
      descriptor.configurable === true &&
      typeof candidate === "function" &&
      source === supportedSetFlagsFromStringSource
    ) {
      return candidate;
    }
  } catch {}
  return null;
}

function loadModuleUtilTypesAuthority() {
  try {
    return require("node:util/types");
  } catch {}
  try {
    return require("util/types");
  } catch {
    return null;
  }
}

let utilTypesAuthority = loadModuleUtilTypesAuthority();

function captureNamedNativeIsProxy() {
  if (
    utilTypesAuthority === null ||
    typeof utilTypesAuthority !== "object"
  ) return null;
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilTypesAuthority, "isProxy"]
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
      descriptor !== undefined &&
      descriptor.writable === true &&
      descriptor.enumerable === true &&
      descriptor.configurable === true &&
      typeof candidate === "function" &&
      source === "function isProxy() { [native code] }"
    ) {
      return candidate;
    }
  } catch {}
  return null;
}

let isProxy = unavailableProxyProbe;
const namedNativeIsProxy = captureNamedNativeIsProxy();
if (typeof namedNativeIsProxy === "function") {
  isProxy = function isProxy(value) {
    try {
      return pristineReflectApply(namedNativeIsProxy, undefined, [value]) === true;
    } catch {
      return true;
    }
  };
} else {
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
}

// Node 14 has no util/types module. Only after trap-free proxy authority exists
// may we consult its legacy util binding for optional native brand probes.
if (utilTypesAuthority === null) {
  try {
    const binding = bootstrapOwnDataValue(process, "binding");
    if (typeof binding === "function" && isProxy(binding) !== true) {
      const legacyTypes = pristineReflectApply(binding, process, ["util"]);
      if (
        legacyTypes !== null &&
        typeof legacyTypes === "object" &&
        isProxy(legacyTypes) !== true
      ) {
        utilTypesAuthority = legacyTypes;
      }
    }
  } catch {
    utilTypesAuthority = null;
  }
}

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
    if (
      descriptor === undefined ||
      descriptor.writable !== true ||
      descriptor.enumerable !== true ||
      descriptor.configurable !== true ||
      typeof candidate !== "function" ||
      isProxy(candidate)
    ) return null;
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    const namedNativeSource =
      "function " + name + "() { [native code] }";
    if (
      source !== namedNativeSource &&
      source !== "function () { [native code] }"
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

function bufferIsBuffer(value) {
  // Buffer is a typed-array view and is rejected by isTypedArray above.
  // Keeping this redundant slot inert avoids any dependency on Node's lazy
  // Buffer constructor/export while preserving the forbidden-value boundary.
  return false;
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
  const ambientConstructor = packageAuthority.PromiseConstructor;
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
    packageAuthority.PromisePrototype === localPromisePrototype &&
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
    thenCandidate === packageAuthority.PromiseThen &&
    !isProxy(thenCandidate) &&
    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenCandidate]) === localFunctionPrototype &&
    pristineReflectApply(pristineFunctionToString, thenCandidate, []) === pristinePromiseThenSource &&
    speciesDescriptor !== undefined &&
    typeof speciesDescriptor.get === "function" &&
    speciesDescriptor.get === packageAuthority.PromiseSpeciesGetter &&
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
