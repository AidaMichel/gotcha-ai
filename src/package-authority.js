"use strict";

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
