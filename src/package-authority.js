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
const BufferConstructor = dataValue(globalThis, "Buffer");
const ReflectObject = dataValue(globalThis, "Reflect");
const ReflectApply = dataValue(ReflectObject, "apply");
const ObjectConstructor = dataValue(globalThis, "Object");
const ObjectPrototype = dataValue(ObjectConstructor, "prototype");
const ObjectGetPrototypeOf = dataValue(ObjectConstructor, "getPrototypeOf");
const ObjectFreeze = dataValue(ObjectConstructor, "freeze");
const ObjectToString = dataValue(ObjectPrototype, "toString");
const FunctionPrototype = dataValue(FunctionConstructor, "prototype");
const FunctionToString = dataValue(FunctionPrototype, "toString");
const StringConstructor = dataValue(globalThis, "String");
const StringPrototype = dataValue(StringConstructor, "prototype");
const StringStartsWith = dataValue(StringPrototype, "startsWith");
const ArrayBufferConstructor = dataValue(globalThis, "ArrayBuffer");
const ArrayBufferIsView = dataValue(ArrayBufferConstructor, "isView");
const DataViewConstructor = dataValue(globalThis, "DataView");
const DataViewPrototype = dataValue(DataViewConstructor, "prototype");
const DataViewByteLengthGetter = accessorGetter(DataViewPrototype, "byteLength");
const WeakMapConstructor = dataValue(globalThis, "WeakMap");
const WeakMapPrototype = dataValue(WeakMapConstructor, "prototype");
const WeakMapHas = dataValue(WeakMapPrototype, "has");
const WeakSetConstructor = dataValue(globalThis, "WeakSet");
const WeakSetPrototype = dataValue(WeakSetConstructor, "prototype");
const WeakSetHas = dataValue(WeakSetPrototype, "has");
const NumberConstructor = dataValue(globalThis, "Number");
const NumberPrototype = dataValue(NumberConstructor, "prototype");
const NumberValueOf = dataValue(NumberPrototype, "valueOf");
const BooleanConstructor = dataValue(globalThis, "Boolean");
const BooleanPrototype = dataValue(BooleanConstructor, "prototype");
const BooleanValueOf = dataValue(BooleanPrototype, "valueOf");
const BigIntConstructor = dataValue(globalThis, "BigInt");
const BigIntPrototype = dataValue(BigIntConstructor, "prototype");
const BigIntValueOf = dataValue(BigIntPrototype, "valueOf");
const SymbolConstructor = dataValue(globalThis, "Symbol");
const SymbolPrototype = dataValue(SymbolConstructor, "prototype");
const SymbolValueOf = dataValue(SymbolPrototype, "valueOf");
const SymbolSpecies = dataValue(SymbolConstructor, "species");

module.exports = Object.freeze({
  GetOwnPropertyDescriptor: getOwnPropertyDescriptor,
  PromiseConstructor,
  PromisePrototype,
  PromiseThen,
  PromiseSpeciesGetter,
  ArrayConstructor,
  ArrayIsArray,
  FunctionConstructor,
  TypeErrorConstructor,
  BufferConstructor,
  ReflectApply,
  ObjectGetPrototypeOf,
  ObjectFreeze,
  ObjectToString,
  FunctionToString,
  StringStartsWith,
  ArrayBufferIsView,
  DataViewByteLengthGetter,
  WeakMapHas,
  WeakSetHas,
  NumberValueOf,
  StringValueOf: dataValue(StringPrototype, "valueOf"),
  BooleanValueOf,
  BigIntValueOf,
  SymbolValueOf,
  SymbolSpecies,
  PromiseSpeciesGetter
});
