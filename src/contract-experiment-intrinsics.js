"use strict";

const {
  types: utilTypes
} = require("node:util");
const {
  Buffer: BufferConstructor
} = require("node:buffer");
const {
  runInNewContext
} = require("node:vm");

const pristineFreeze =
  runInNewContext("Object.freeze");
const pristineString =
  runInNewContext("String");

const forbiddenProbes = pristineFreeze([
  utilTypes.isDate,
  utilTypes.isRegExp,
  utilTypes.isMap,
  utilTypes.isSet,
  utilTypes.isWeakMap,
  utilTypes.isWeakSet,
  utilTypes.isPromise,
  utilTypes.isNativeError,
  utilTypes.isAnyArrayBuffer,
  utilTypes.isDataView,
  utilTypes.isTypedArray,
  utilTypes.isBoxedPrimitive,
  utilTypes.isArgumentsObject,
  utilTypes.isGeneratorObject,
  utilTypes.isModuleNamespaceObject,
  utilTypes.isMapIterator,
  utilTypes.isSetIterator,
  utilTypes.isExternal,
  BufferConstructor.isBuffer
]);

module.exports = pristineFreeze({
  isProxy: utilTypes.isProxy,
  forbiddenProbes,
  stringConstructor: pristineString
});
