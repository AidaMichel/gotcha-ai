"use strict";

// Bootstrap trust root.
//
// Gotcha is not a same-process sandbox: code that can replace these reflection
// roots before the first package load already has process-equivalent authority.
// Keep that unavoidable root intentionally tiny, capture it once, and use it to
// authenticate every other callable primordial before any such candidate is
// invoked. Later mutation of these roots is non-authoritative.
const bootstrapReflectObject = Reflect;
const bootstrapReflectGetOwnPropertyDescriptor =
  bootstrapReflectObject.getOwnPropertyDescriptor;
const bootstrapReflectApply = bootstrapReflectObject.apply;
const bootstrapFunctionConstructor = Function;
const bootstrapFunctionPrototype = bootstrapFunctionConstructor.prototype;
const bootstrapFunctionToString = bootstrapFunctionPrototype.toString;

const bootstrapRootAvailable = (
  typeof bootstrapReflectGetOwnPropertyDescriptor === "function" &&
  typeof bootstrapReflectApply === "function" &&
  typeof bootstrapFunctionConstructor === "function" &&
  bootstrapFunctionPrototype !== null &&
  typeof bootstrapFunctionPrototype === "function" &&
  typeof bootstrapFunctionToString === "function"
);

function rootDataValue(object, key) {
  if (
    bootstrapRootAvailable !== true ||
    object === null ||
    (typeof object !== "object" && typeof object !== "function")
  ) return null;
  try {
    const descriptor = bootstrapReflectGetOwnPropertyDescriptor(object, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

function functionSource(value) {
  if (bootstrapRootAvailable !== true || typeof value !== "function") {
    return null;
  }
  try {
    return bootstrapReflectApply(bootstrapFunctionToString, value, []);
  } catch {
    return null;
  }
}

function captureNativeDataFunction(object, key, expectedSource) {
  const candidate = rootDataValue(object, key);
  if (typeof candidate !== "function") return null;
  return functionSource(candidate) === expectedSource ? candidate : null;
}

function captureNativeGlobalConstructor(name) {
  const candidate = rootDataValue(globalThis, name);
  if (typeof candidate !== "function") return null;
  return functionSource(candidate) ===
    "function " + name + "() { [native code] }"
    ? candidate
    : null;
}

function captureNativeAccessorGetter(object, key, expectedSource) {
  if (
    bootstrapRootAvailable !== true ||
    object === null ||
    (typeof object !== "object" && typeof object !== "function")
  ) return null;
  try {
    const descriptor = bootstrapReflectGetOwnPropertyDescriptor(object, key);
    if (
      descriptor === undefined ||
      typeof descriptor.get !== "function" ||
      descriptor.set !== undefined
    ) return null;
    return functionSource(descriptor.get) === expectedSource
      ? descriptor.get
      : null;
  } catch {
    return null;
  }
}

function capturePrimitiveDataValue(object, key, expectedType) {
  const value = rootDataValue(object, key);
  return typeof value === expectedType ? value : null;
}

// The three callable reflection roots are authoritative by definition of the
// bootstrap contract. Every remaining callable below is source-authenticated
// before retention and is never invoked when that authentication fails.
const GetOwnPropertyDescriptor = bootstrapRootAvailable
  ? bootstrapReflectGetOwnPropertyDescriptor
  : null;
const ReflectApply = bootstrapRootAvailable
  ? bootstrapReflectApply
  : null;
const FunctionConstructor = bootstrapRootAvailable
  ? bootstrapFunctionConstructor
  : null;
const FunctionToString = bootstrapRootAvailable
  ? bootstrapFunctionToString
  : null;

const ObjectConstructor = captureNativeGlobalConstructor("Object");
const ObjectPrototype = rootDataValue(ObjectConstructor, "prototype");
const ObjectGetPrototypeOf = captureNativeDataFunction(
  ObjectConstructor,
  "getPrototypeOf",
  "function getPrototypeOf() { [native code] }"
);
const ObjectDefineProperty = captureNativeDataFunction(
  ObjectConstructor,
  "defineProperty",
  "function defineProperty() { [native code] }"
);
const ObjectFreeze = captureNativeDataFunction(
  ObjectConstructor,
  "freeze",
  "function freeze() { [native code] }"
);
const ObjectToString = captureNativeDataFunction(
  ObjectPrototype,
  "toString",
  "function toString() { [native code] }"
);

const PromiseConstructor = captureNativeGlobalConstructor("Promise");
const PromisePrototype = rootDataValue(PromiseConstructor, "prototype");
const PromiseThen = captureNativeDataFunction(
  PromisePrototype,
  "then",
  "function then() { [native code] }"
);

const ArrayConstructor = captureNativeGlobalConstructor("Array");
const ArrayIsArray = captureNativeDataFunction(
  ArrayConstructor,
  "isArray",
  "function isArray() { [native code] }"
);

const TypeErrorConstructor = captureNativeGlobalConstructor("TypeError");

// Buffer is intentionally not retained as bootstrap authority. Runtime brand
// handling no longer depends on the mutable global Buffer constructor/export.
const BufferConstructor = null;

const StringConstructor = captureNativeGlobalConstructor("String");
const StringPrototype = rootDataValue(StringConstructor, "prototype");
const StringStartsWith = captureNativeDataFunction(
  StringPrototype,
  "startsWith",
  "function startsWith() { [native code] }"
);
const StringValueOf = captureNativeDataFunction(
  StringPrototype,
  "valueOf",
  "function valueOf() { [native code] }"
);

const ArrayBufferConstructor = captureNativeGlobalConstructor("ArrayBuffer");
const ArrayBufferIsView = captureNativeDataFunction(
  ArrayBufferConstructor,
  "isView",
  "function isView() { [native code] }"
);

const DataViewConstructor = captureNativeGlobalConstructor("DataView");
const DataViewPrototype = rootDataValue(DataViewConstructor, "prototype");
const DataViewByteLengthGetter = captureNativeAccessorGetter(
  DataViewPrototype,
  "byteLength",
  "function get byteLength() { [native code] }"
);

const WeakMapConstructor = captureNativeGlobalConstructor("WeakMap");
const WeakMapPrototype = rootDataValue(WeakMapConstructor, "prototype");
const WeakMapHas = captureNativeDataFunction(
  WeakMapPrototype,
  "has",
  "function has() { [native code] }"
);

const WeakSetConstructor = captureNativeGlobalConstructor("WeakSet");
const WeakSetPrototype = rootDataValue(WeakSetConstructor, "prototype");
const WeakSetHas = captureNativeDataFunction(
  WeakSetPrototype,
  "has",
  "function has() { [native code] }"
);

const NumberConstructor = captureNativeGlobalConstructor("Number");
const NumberPrototype = rootDataValue(NumberConstructor, "prototype");
const NumberValueOf = captureNativeDataFunction(
  NumberPrototype,
  "valueOf",
  "function valueOf() { [native code] }"
);

const BooleanConstructor = captureNativeGlobalConstructor("Boolean");
const BooleanPrototype = rootDataValue(BooleanConstructor, "prototype");
const BooleanValueOf = captureNativeDataFunction(
  BooleanPrototype,
  "valueOf",
  "function valueOf() { [native code] }"
);

const BigIntConstructor = captureNativeGlobalConstructor("BigInt");
const BigIntPrototype = rootDataValue(BigIntConstructor, "prototype");
const BigIntValueOf = captureNativeDataFunction(
  BigIntPrototype,
  "valueOf",
  "function valueOf() { [native code] }"
);

const SymbolConstructor = captureNativeGlobalConstructor("Symbol");
const SymbolPrototype = rootDataValue(SymbolConstructor, "prototype");
const SymbolValueOf = captureNativeDataFunction(
  SymbolPrototype,
  "valueOf",
  "function valueOf() { [native code] }"
);
const SymbolSpecies = capturePrimitiveDataValue(
  SymbolConstructor,
  "species",
  "symbol"
);
const PromiseSpeciesGetter = SymbolSpecies === null
  ? null
  : captureNativeAccessorGetter(
      PromiseConstructor,
      SymbolSpecies,
      "function get [Symbol.species]() { [native code] }"
    );

const mandatoryAuthorityAvailable = (
  bootstrapRootAvailable === true &&
  typeof GetOwnPropertyDescriptor === "function" &&
  typeof ReflectApply === "function" &&
  typeof FunctionConstructor === "function" &&
  typeof FunctionToString === "function" &&
  typeof ObjectConstructor === "function" &&
  ObjectPrototype !== null &&
  typeof ObjectGetPrototypeOf === "function" &&
  typeof ObjectDefineProperty === "function" &&
  typeof ObjectFreeze === "function" &&
  typeof ObjectToString === "function" &&
  typeof PromiseConstructor === "function" &&
  PromisePrototype !== null &&
  typeof PromiseThen === "function" &&
  typeof PromiseSpeciesGetter === "function" &&
  typeof ArrayConstructor === "function" &&
  typeof ArrayIsArray === "function" &&
  typeof TypeErrorConstructor === "function" &&
  typeof StringStartsWith === "function" &&
  typeof StringValueOf === "function" &&
  typeof ArrayBufferIsView === "function" &&
  typeof DataViewByteLengthGetter === "function" &&
  typeof WeakMapHas === "function" &&
  typeof WeakSetHas === "function" &&
  typeof NumberValueOf === "function" &&
  typeof BooleanValueOf === "function" &&
  typeof BigIntValueOf === "function" &&
  typeof SymbolValueOf === "function" &&
  typeof SymbolSpecies === "symbol"
);

if (mandatoryAuthorityAvailable !== true) {
  // `null` is intentionally immutable authority absence. Consumers either
  // propagate that absence or the package root substitutes fail-closed public
  // boundaries without invoking the rejected primordial.
  module.exports = null;
} else {
  const authority = {
    GetOwnPropertyDescriptor,
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
    ObjectDefineProperty,
    ObjectFreeze,
    ObjectToString,
    FunctionToString,
    StringStartsWith,
    ArrayBufferIsView,
    DataViewByteLengthGetter,
    WeakMapHas,
    WeakSetHas,
    NumberValueOf,
    StringValueOf,
    BooleanValueOf,
    BigIntValueOf,
    SymbolValueOf,
    SymbolSpecies
  };

  module.exports = bootstrapReflectApply(
    ObjectFreeze,
    undefined,
    [authority]
  );
}
