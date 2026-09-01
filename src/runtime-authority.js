"use strict";

const nodeUtil = require("node:util");
const nodeProcess = require("node:process");
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
  inspectAuthorityAvailable = (
    typeof inspectCandidate === "function" &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [inspectCandidate]
    ) === localFunctionPrototype &&
    typeof inspectSource === "string" &&
    pristineReflectApply(
      pristineStringStartsWith,
      inspectSource,
      ["function inspect("]
    ) === true
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

let internalUtil = null;
try {
  const binding = nodeProcess.binding;
  if (
    typeof binding === "function" &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [binding]
    ) === localFunctionPrototype
  ) {
    internalUtil = pristineReflectApply(binding, nodeProcess, ["util"]);
  }
} catch {
  internalUtil = null;
}

function internalProbe(name, value) {
  if (internalUtil === null || typeof internalUtil !== "object") return true;
  const descriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [internalUtil, name]
  );
  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    typeof descriptor.value !== "function" ||
    isProxy(descriptor.value)
  ) return true;
  try {
    return pristineReflectApply(descriptor.value, undefined, [value]) === true;
  } catch {
    return true;
  }
}

function isPromise(value) {
  return internalProbe("isPromise", value);
}
function isDate(value) {
  return internalProbe("isDate", value);
}
function isRegExp(value) {
  return internalProbe("isRegExp", value);
}
function isMap(value) {
  return internalProbe("isMap", value);
}
function isSet(value) {
  return internalProbe("isSet", value);
}
function isNativeError(value) {
  return internalProbe("isNativeError", value);
}
function isAnyArrayBuffer(value) {
  return internalProbe("isAnyArrayBuffer", value);
}
function isDataView(value) {
  return internalProbe("isDataView", value);
}
function isTypedArray(value) {
  return internalProbe("isTypedArray", value);
}
function isMapIterator(value) {
  return internalProbe("isMapIterator", value);
}
function isSetIterator(value) {
  return internalProbe("isSetIterator", value);
}
function isExternal(value) {
  return internalProbe("isExternal", value);
}

const pristineWeakMapHas = runInNewContext("WeakMap.prototype.has");
const pristineWeakSetHas = runInNewContext("WeakSet.prototype.has");
const weakProbeKey = Object.freeze(Object.create(null));
function isWeakMap(value) {
  try {
    pristineReflectApply(pristineWeakMapHas, value, [weakProbeKey]);
    return true;
  } catch {
    return false;
  }
}
function isWeakSet(value) {
  try {
    pristineReflectApply(pristineWeakSetHas, value, [weakProbeKey]);
    return true;
  } catch {
    return false;
  }
}

const boxedValueOfs = Object.freeze([
  runInNewContext("Number.prototype.valueOf"),
  runInNewContext("String.prototype.valueOf"),
  runInNewContext("Boolean.prototype.valueOf"),
  runInNewContext("BigInt.prototype.valueOf"),
  runInNewContext("Symbol.prototype.valueOf")
]);
function isBoxedPrimitive(value) {
  for (let index = 0; index < boxedValueOfs.length; index += 1) {
    try {
      pristineReflectApply(boxedValueOfs[index], value, []);
      return true;
    } catch {}
  }
  return false;
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
  isMapIterator,
  isSetIterator,
  isExternal
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
      isProxy(descriptor.get) ||
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [descriptor.get]
      ) !== localFunctionPrototype
    ) return false;
    return pristineReflectApply(
      pristineFunctionToString,
      descriptor.get,
      []
    ) === pristinePromiseSpeciesGetterSource;
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
  forbiddenProbes,
  hasForbiddenRuntimeBrand,
  localFunctionPrototype,
  hasTrustedLocalPromiseSpecies
});
