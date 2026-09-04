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

function bootstrapFreshBuiltinModule(modulePath) {
  // Builtin module exports are mutable. A preloaded builtin cannot be
  // authenticated without invoking authority that may itself be poisoned, so
  // use it only when this module is the first code to load it.
  if (bootstrapBuiltinWasLoaded(modulePath)) return null;
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

const vmModule = bootstrapFreshBuiltinModule("node:vm");
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

let utilTypesAuthorityLoadedFresh = false;

function loadModuleUtilTypesAuthority() {
  // Node 22 exposes the pristine public util/types probes as anonymous native
  // functions. A callable Proxy has the same Function#toString shape, so that
  // anonymous shape is only authoritative when Gotcha itself is the first
  // loader of the public builtin. Preloaded authority remains fail-closed.
  const wasLoaded = bootstrapBuiltinWasLoaded("node:util/types");
  try {
    const authority = require("node:util/types");
    utilTypesAuthorityLoadedFresh = wasLoaded === false;
    return authority;
  } catch {}
  try {
    const authority = require("util/types");
    utilTypesAuthorityLoadedFresh = wasLoaded === false;
    return authority;
  } catch {
    utilTypesAuthorityLoadedFresh = false;
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

function captureBootstrapNamedNativeDataFunction(object, key, expectedSource) {
  const candidate = bootstrapOwnDataValue(object, key);
  if (
    typeof candidate !== "function" ||
    typeof pristineFunctionToString !== "function" ||
    typeof pristineReflectApply !== "function"
  ) return null;
  try {
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    return source === expectedSource ? candidate : null;
  } catch {
    return null;
  }
}

function captureBootstrapDefineProperty() {
  let objectPrototype;
  try {
    objectPrototype = pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [{}]
    );
  } catch {
    return null;
  }
  const objectConstructor = bootstrapOwnDataValue(
    objectPrototype,
    "constructor"
  );
  return captureBootstrapNamedNativeDataFunction(
    objectConstructor,
    "defineProperty",
    "function defineProperty() { [native code] }"
  );
}

function captureBootstrapReflectDeleteProperty() {
  const reflectObject = bootstrapOwnDataValue(globalThis, "Reflect");
  return captureBootstrapNamedNativeDataFunction(
    reflectObject,
    "deleteProperty",
    "function deleteProperty() { [native code] }"
  );
}

// A benign caller may have loaded node:vm before Gotcha. In that case we still
// need mutation primitives solely to expose the anonymous util/types candidate
// to a fresh inspector session for trap-free Proxy classification. Never trust
// ambient replacements: accept only exact named native primordials. Callable
// Proxy wrappers stringify anonymously and therefore fail this capture closed.
const pristineDefineProperty = hasFreshVmAuthority
  ? runInNewContext("Object.defineProperty")
  : captureBootstrapDefineProperty();
const pristineReflectDeleteProperty = hasFreshVmAuthority
  ? runInNewContext("Reflect.deleteProperty")
  : captureBootstrapReflectDeleteProperty();

function inspectorClassifiesProxy(candidate) {
  // Current Node 22/24 expose the pristine util/types isProxy function as an
  // anonymous native function, which is textually indistinguishable from a
  // callable Proxy wrapper. A fresh local inspector session reports callable
  // Proxies as subtype "proxy" without executing their JS traps. If inspector
  // or the fresh-VM mutation primitives are unavailable, fail closed.
  if (
    bootstrapBuiltinWasLoaded("node:inspector") ||
    typeof pristineDefineProperty !== "function" ||
    typeof pristineReflectDeleteProperty !== "function" ||
    typeof pristineGetOwnPropertyDescriptor !== "function" ||
    typeof pristineReflectApply !== "function"
  ) return null;

  // Node 22 can read node:buffer.Buffer while evaluating node:inspector.
  // Never load inspector through an accessor-backed Buffer export: inspect the
  // cached/fresh module descriptor without invoking it and fail closed.
  let bufferModule;
  try {
    bufferModule = require("node:buffer");
  } catch {
    return null;
  }
  let bufferDescriptor;
  try {
    bufferDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [bufferModule, "Buffer"]
    );
  } catch {
    return null;
  }
  if (
    bufferDescriptor === undefined ||
    "get" in bufferDescriptor ||
    "set" in bufferDescriptor ||
    typeof bufferDescriptor.value !== "function"
  ) return null;

  // Loading node:inspector on Node 22 may repeatedly read node:util.inspect.
  // The caller can preload node:util and replace inspect with an accessor, so
  // descriptor-inspect and temporarily neutralize that export before inspector
  // evaluation. This is restoration-only bootstrap surgery: the candidate
  // util/types function is still authenticated independently by Inspector.
  let utilModule;
  let inspectDescriptor;
  try {
    utilModule = require("node:util");
    inspectDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilModule, "inspect"]
    );
  } catch {
    return null;
  }
  if (
    inspectDescriptor === undefined ||
    inspectDescriptor.configurable !== true
  ) return null;

  let inspectNeutralized = false;
  try {
    pristineReflectApply(pristineDefineProperty, undefined, [
      utilModule,
      "inspect",
      {
        value: function gotchaRuntimeBootstrapInspect() { return ""; },
        writable: true,
        enumerable: inspectDescriptor.enumerable,
        configurable: true
      }
    ]);
    inspectNeutralized = true;
  } catch {
    return null;
  }

  let inspectorModule = null;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    inspectorModule = null;
  } finally {
    if (inspectNeutralized) {
      try {
        pristineReflectApply(pristineDefineProperty, undefined, [
          utilModule,
          "inspect",
          inspectDescriptor
        ]);
      } catch {
        inspectorModule = null;
      }
    }
  }
  if (inspectorModule === null) return null;

  const SessionConstructor = bootstrapOwnDataValue(inspectorModule, "Session");
  if (typeof SessionConstructor !== "function") return null;

  const sessionPrototype = bootstrapOwnDataValue(SessionConstructor, "prototype");
  const connect = bootstrapOwnDataValue(sessionPrototype, "connect");
  const disconnect = bootstrapOwnDataValue(sessionPrototype, "disconnect");
  const post = bootstrapOwnDataValue(sessionPrototype, "post");
  if (
    typeof connect !== "function" ||
    typeof disconnect !== "function" ||
    typeof post !== "function"
  ) return null;

  let session;
  try {
    session = new SessionConstructor();
  } catch {
    return null;
  }

  const key = "__gotchaRuntimeProxyAuthorityCandidate__";
  let existingDescriptor;
  try {
    existingDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [globalThis, key]
    );
  } catch {
    return null;
  }
  if (existingDescriptor !== undefined) return null;

  let connected = false;
  let installed = false;
  let classified = null;
  try {
    pristineReflectApply(pristineDefineProperty, undefined, [
      globalThis,
      key,
      {
        value: candidate,
        writable: false,
        enumerable: false,
        configurable: true
      }
    ]);
    installed = true;

    pristineReflectApply(connect, session, []);
    connected = true;

    let callbackCalled = false;
    let callbackError = null;
    let callbackResult = null;
    pristineReflectApply(post, session, [
      "Runtime.evaluate",
      {
        expression: "globalThis.__gotchaRuntimeProxyAuthorityCandidate__",
        generatePreview: false,
        returnByValue: false
      },
      function gotchaInspectorCallback(error, result) {
        callbackCalled = true;
        callbackError = error;
        callbackResult = result;
      }
    ]);

    if (
      callbackCalled !== true ||
      callbackError !== null ||
      callbackResult === null ||
      typeof callbackResult !== "object" ||
      callbackResult.result === null ||
      typeof callbackResult.result !== "object"
    ) return null;

    const remote = callbackResult.result;
    if (remote.subtype === "proxy") classified = true;
    else if (remote.type === "function" && remote.subtype === undefined) classified = false;
    else classified = null;
  } catch {
    classified = null;
  } finally {
    if (connected) {
      try { pristineReflectApply(disconnect, session, []); } catch {}
    }
    if (installed) {
      try {
        pristineReflectApply(
          pristineReflectDeleteProperty,
          undefined,
          [globalThis, key]
        );
      } catch {}
    }
  }
  return classified;
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
  const candidate = bootstrapOwnDataValue(utilTypesAuthority, "isProxy");
  let candidateSource = null;
  if (
    typeof candidate === "function" &&
    typeof pristineFunctionToString === "function" &&
    typeof pristineReflectApply === "function"
  ) {
    try {
      candidateSource = pristineReflectApply(pristineFunctionToString, candidate, []);
    } catch {
      candidateSource = null;
    }
  }
  if (
    candidateSource === "function () { [native code] }" &&
    inspectorClassifiesProxy(candidate) === false
  ) {
    isProxy = function isProxy(value) {
      try {
        return pristineReflectApply(candidate, undefined, [value]) === true;
      } catch {
        return true;
      }
    };
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

function tagProbe() {
  // Object.prototype.toString reads Symbol.toStringTag and can execute an
  // attacker-controlled getter. If the authenticated native brand probe is
  // unavailable, fail closed without touching the boundary value.
  return unavailableBrandProbe;
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
