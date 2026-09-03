from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing followup2 anchor: {label}")
    path.write_text(text.replace(old, new, 1))


package_path = ROOT / "src" / "package-authority.js"
replace_once(
    package_path,
    'const BufferConstructor = dataValue(globalThis, "Buffer");\n',
    '''const BufferConstructor = dataValue(globalThis, "Buffer");
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
const PromiseSpeciesGetter = accessorGetter(PromiseConstructor, SymbolSpecies);
''',
    "same-realm primitive fallback capture",
)
replace_once(
    package_path,
    '''  TypeErrorConstructor,
  BufferConstructor
});
''',
    '''  TypeErrorConstructor,
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
''',
    "same-realm primitive fallback exports",
)

runtime_path = ROOT / "src" / "runtime-authority.js"
replace_once(
    runtime_path,
    '''function bootstrapBuiltinModule(modulePath) {
  const getBuiltinModule = bootstrapOwnDataValue(process, "getBuiltinModule");
  if (typeof getBuiltinModule === "function") {
    try {
      return getBuiltinModule(modulePath);
    } catch {
      return null;
    }
  }

  // Node 14/16/18 have no process.getBuiltinModule(). If a security-sensitive
  // builtin was already loaded, re-require can synchronize mutated exports and
  // execute accessor traps before descriptor inspection. Fail closed instead.
  if (bootstrapBuiltinWasLoaded(modulePath)) return null;
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

const BufferConstructor = packageAuthority.BufferConstructor;
const vmModule = bootstrapBuiltinModule("node:vm");
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");

if (
  typeof BufferConstructor !== "function" ||
  typeof runInNewContext !== "function"
) {
  null.gotchaRuntimeBootstrapAuthority;
}
''',
    '''function bootstrapBuiltinModule(modulePath, rejectIfAlreadyLoaded) {
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

const BufferConstructor = packageAuthority.BufferConstructor;
const vmModule = bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");

if (typeof BufferConstructor !== "function") {
  null.gotchaRuntimeBootstrapAuthority;
}
''',
    "vm fallback instead of blanket bootstrap failure",
)
replace_once(
    runtime_path,
    '    const v8Module = bootstrapBuiltinModule("node:v8");\n',
    '    const v8Module = bootstrapBuiltinModule("node:v8", false);\n',
    "v8 loader mode",
)

old_pristine = '''const pristineReflectApply = runInNewContext("Reflect.apply");
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
'''
new_pristine = '''const hasFreshVmAuthority = typeof runInNewContext === "function";

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
'''
replace_once(runtime_path, old_pristine, new_pristine, "same-realm fallback primitives")

print("round7 followup2 applied")
