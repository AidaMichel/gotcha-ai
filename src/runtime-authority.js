"use strict";

const nodeUtil = require("node:util");
const { Buffer: BufferConstructor } = require("node:buffer");
const { runInNewContext } = require("node:vm");

const pristineReflectApply = runInNewContext("Reflect.apply");
const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");
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

const localFunctionPrototype = pristineReflectApply(
  pristineGetPrototypeOf,
  undefined,
  [function gotchaLocalFunctionAuthorityAnchor() {}]
);

const inspectCandidate = nodeUtil.inspect;
let inspectAuthorityAvailable = false;
try {
  const inspectSource = pristineReflectApply(
    pristineFunctionToString,
    inspectCandidate,
    []
  );
  const sourceLooksLocal = (
    typeof inspectSource === "string" &&
    pristineReflectApply(
      pristineStringStartsWith,
      inspectSource,
      ["function inspect("]
    ) === true
  );
  inspectAuthorityAvailable = (
    typeof inspectCandidate === "function" &&
    sourceLooksLocal &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [inspectCandidate]
    ) === localFunctionPrototype
  );
} catch {
  inspectAuthorityAvailable = false;
}

function isProxy(value) {
  if (!inspectAuthorityAvailable) return true;
  try {
    const rendered = inspectCandidate(value, {
      showProxy: true,
      customInspect: false,
      depth: 0,
      breakLength: Infinity,
      maxArrayLength: 0,
      maxStringLength: 0
    });
    return (
      typeof rendered === "string" &&
      pristineReflectApply(
        pristineStringStartsWith,
        rendered,
        ["Proxy ["]
      ) === true
    );
  } catch {
    return true;
  }
}

function nativeProbe(name) {
  try {
    const candidate = nodeUtil.types[name];
    if (typeof candidate !== "function") return null;
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    const namedSource = "function " + name + "() { [native code] }";
    if (
      source !== namedSource &&
      source !== "function () { [native code] }"
    ) return null;
    if (isProxy(candidate)) return null;
    if (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}

function unavailableBrandProbe() {
  return true;
}

function retainedProbe(name) {
  const candidate = nativeProbe(name);
  return candidate === null ? unavailableBrandProbe : candidate;
}

const isDate = retainedProbe("isDate");
const isRegExp = retainedProbe("isRegExp");
const isMap = retainedProbe("isMap");
const isSet = retainedProbe("isSet");
const isWeakMap = retainedProbe("isWeakMap");
const isWeakSet = retainedProbe("isWeakSet");
const isPromise = retainedProbe("isPromise");
const isNativeError = retainedProbe("isNativeError");
const isAnyArrayBuffer = retainedProbe("isAnyArrayBuffer");
function isDataView(value) {
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
  try {
    return (
      pristineReflectApply(pristineArrayBufferIsView, undefined, [value]) === true &&
      isDataView(value) !== true
    );
  } catch {
    return true;
  }
}
const isBoxedPrimitive = retainedProbe("isBoxedPrimitive");
const isArgumentsObject = retainedProbe("isArgumentsObject");
const isGeneratorObject = retainedProbe("isGeneratorObject");
const isModuleNamespaceObject = retainedProbe("isModuleNamespaceObject");
const isMapIterator = retainedProbe("isMapIterator");
const isSetIterator = retainedProbe("isSetIterator");
const isExternal = retainedProbe("isExternal");

let bufferIsBuffer = unavailableBrandProbe;
try {
  const candidate = BufferConstructor.isBuffer;
  const source = pristineReflectApply(
    pristineFunctionToString,
    candidate,
    []
  );
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

const forbiddenProbes = Object.freeze([
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
]);

const pristinePromiseSpeciesGetterSource = runInNewContext(
  "Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)"
);

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
    const descriptor = Object.getOwnPropertyDescriptor(constructor, speciesSymbol);
    if (
      descriptor === undefined ||
      typeof descriptor.get !== "function" ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== false ||
      descriptor.configurable !== true ||
      isProxy(descriptor.get)
    ) return false;
    const getterSource = pristineReflectApply(
      pristineFunctionToString,
      descriptor.get,
      []
    );
    if (getterSource !== pristinePromiseSpeciesGetterSource) return false;
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
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (forbiddenProbes[index](value) === true) return true;
  }
  return false;
}

module.exports = Object.freeze({
  isProxy,
  isPromise,
  isTypedArray,
  bufferIsBuffer,
  forbiddenProbes,
  hasForbiddenRuntimeBrand,
  localFunctionPrototype,
  hasTrustedLocalPromiseSpecies
});
