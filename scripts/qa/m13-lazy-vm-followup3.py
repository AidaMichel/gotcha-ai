from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()

old = r'''const consumerPrimordialsAvailable = (
  typeof pristineReflectApply === "function" &&
  typeof pristineGetPrototypeOf === "function" &&
  typeof pristineGetOwnPropertyDescriptor === "function" &&
  typeof pristineFunctionToString === "function" &&
  typeof pristineObjectFreeze === "function" &&
  typeof arrayIsArray === "function" &&
  typeof consumerGetOwnPropertyDescriptors === "function" &&
  typeof consumerIsExtensible === "function" &&
  typeof consumerObjectIs === "function" &&
  typeof consumerDefineProperty === "function" &&
  typeof consumerHasOwnProperty === "function" &&
  typeof consumerOwnKeys === "function" &&
  typeof consumerNumberIsFinite === "function" &&
  typeof consumerStringTrim === "function" &&
  typeof consumerStringIncludes === "function" &&
  typeof consumerSetConstructor === "function" &&
  typeof consumerMapConstructor === "function" &&
  typeof consumerSetHas === "function" &&
  typeof consumerSetAdd === "function" &&
  typeof consumerMapGet === "function" &&
  typeof consumerMapSet === "function" &&
  typeof consumerArrayPush === "function" &&
  typeof consumerArrayPop === "function" &&
  typeof consumerArrayJoin === "function" &&
  consumerTypeErrorConstructorSource ===
    "function TypeError() { [native code] }"
);

const consumerPrimordials = consumerPrimordialsAvailable
  ? pristineReflectApply(pristineObjectFreeze, undefined, [{
      reflectApply: pristineReflectApply,
      getPrototypeOf: pristineGetPrototypeOf,
      getOwnPropertyDescriptor: pristineGetOwnPropertyDescriptor,
      getOwnPropertyDescriptors: consumerGetOwnPropertyDescriptors,
      functionToString: pristineFunctionToString,
      objectFreeze: pristineObjectFreeze,
      isExtensible: consumerIsExtensible,
      objectIs: consumerObjectIs,
      defineProperty: consumerDefineProperty,
      hasOwnProperty: consumerHasOwnProperty,
      ownKeys: consumerOwnKeys,
      arrayIsArray,
      numberIsFinite: consumerNumberIsFinite,
      stringTrim: consumerStringTrim,
      stringIncludes: consumerStringIncludes,
      SetConstructor: consumerSetConstructor,
      MapConstructor: consumerMapConstructor,
      setHas: consumerSetHas,
      setAdd: consumerSetAdd,
      mapGet: consumerMapGet,
      mapSet: consumerMapSet,
      arrayPush: consumerArrayPush,
      arrayPop: consumerArrayPop,
      arrayJoin: consumerArrayJoin,
      promiseConstructorSource: pristinePromiseConstructorSource,
      promiseThenSource: pristinePromiseThenSource,
      typeErrorConstructorSource: consumerTypeErrorConstructorSource
    }])
  : null;'''

new = r'''const consumerPrimordialsCoreAvailable = (
  typeof pristineReflectApply === "function" &&
  typeof pristineGetPrototypeOf === "function" &&
  typeof pristineGetOwnPropertyDescriptor === "function" &&
  typeof pristineFunctionToString === "function" &&
  typeof pristineObjectFreeze === "function" &&
  typeof arrayIsArray === "function" &&
  typeof consumerGetOwnPropertyDescriptors === "function" &&
  typeof consumerIsExtensible === "function" &&
  typeof consumerObjectIs === "function" &&
  typeof consumerDefineProperty === "function" &&
  typeof consumerHasOwnProperty === "function" &&
  typeof consumerOwnKeys === "function" &&
  typeof consumerNumberIsFinite === "function" &&
  typeof consumerStringTrim === "function" &&
  typeof consumerStringIncludes === "function" &&
  typeof consumerSetConstructor === "function" &&
  typeof consumerMapConstructor === "function" &&
  typeof consumerSetHas === "function" &&
  typeof consumerSetAdd === "function" &&
  typeof consumerMapGet === "function" &&
  typeof consumerMapSet === "function" &&
  typeof consumerArrayPush === "function" &&
  typeof consumerArrayPop === "function" &&
  typeof consumerArrayJoin === "function"
);

const consumerPrimordialsAvailable = (
  consumerPrimordialsCoreAvailable === true &&
  consumerTypeErrorConstructorSource ===
    "function TypeError() { [native code] }"
);

// Keep the module graph loadable when one higher-level authority (notably the
// ambient TypeError constructor) is poisoned. Safe core primordials remain
// available for module initialization, while consumerPrimordialsAvailable stays
// false and public execution fails closed until the complete authority set is
// authenticated.
const consumerPrimordials = consumerPrimordialsCoreAvailable
  ? pristineReflectApply(pristineObjectFreeze, undefined, [{
      reflectApply: pristineReflectApply,
      getPrototypeOf: pristineGetPrototypeOf,
      getOwnPropertyDescriptor: pristineGetOwnPropertyDescriptor,
      getOwnPropertyDescriptors: consumerGetOwnPropertyDescriptors,
      functionToString: pristineFunctionToString,
      objectFreeze: pristineObjectFreeze,
      isExtensible: consumerIsExtensible,
      objectIs: consumerObjectIs,
      defineProperty: consumerDefineProperty,
      hasOwnProperty: consumerHasOwnProperty,
      ownKeys: consumerOwnKeys,
      arrayIsArray,
      numberIsFinite: consumerNumberIsFinite,
      stringTrim: consumerStringTrim,
      stringIncludes: consumerStringIncludes,
      SetConstructor: consumerSetConstructor,
      MapConstructor: consumerMapConstructor,
      setHas: consumerSetHas,
      setAdd: consumerSetAdd,
      mapGet: consumerMapGet,
      mapSet: consumerMapSet,
      arrayPush: consumerArrayPush,
      arrayPop: consumerArrayPop,
      arrayJoin: consumerArrayJoin,
      promiseConstructorSource: pristinePromiseConstructorSource,
      promiseThenSource: pristinePromiseThenSource,
      typeErrorConstructorSource: consumerTypeErrorConstructorSource
    }])
  : null;'''

if text.count(old) != 1:
    raise SystemExit(f"consumer primordial availability block: expected 1 match, got {text.count(old)}")
text = text.replace(old, new, 1)
path.write_text(text)
print("Separated load-safe core primordials from full consumer authority approval.")
