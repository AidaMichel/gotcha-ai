"use strict";

const packageAuthority = require("./package-authority");
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
    const v8Module = require("node:v8");
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
      typeof candidate === "function" &&
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      typeof source === "string" &&
      pristineReflectApply(
        pristineStringStartsWith,
        source,
        ["function setFlagsFromString("]
      ) === true
    ) {
      return candidate;
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
