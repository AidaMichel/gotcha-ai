"use strict";

const packageAuthority = require("./package-authority");

if (
  packageAuthority === null ||
  typeof packageAuthority !== "object" ||
  packageAuthority.available !== true
) {
  // Stable fail-closed authority shape. Package-root lazy getters inspect only
  // these fields and therefore never load a rejected host graph.
  module.exports = {
    objectFreeze(value) { return value; },
    functionToString: null,
    consumerPrimordialsAvailable: false,
    consumerPrimordials: { functionToString: null },
    weakRefConstructor: null,
    finalizationRegistryConstructor: null,
    isVmContext() { return true; },
    isProxy() { return true; },
    isPromise() { return false; },
    isAsyncFunction() { return true; },
    isGeneratorFunction() { return true; },
    isCryptoKey: null,
    isKeyObject: null,
    isDate() { return true; },
    isRegExp() { return true; },
    isMap() { return true; },
    isSet() { return true; },
    isWeakMap() { return true; },
    isWeakSet() { return true; },
    isNativeError() { return true; },
    isAnyArrayBuffer() { return true; },
    isDataView() { return true; },
    isTypedArray() { return true; },
    isArrayBufferView() { return true; },
    isBoxedPrimitive() { return true; },
    isArgumentsObject() { return true; },
    isGeneratorObject() { return true; },
    isModuleNamespaceObject() { return true; },
    isMapIterator() { return true; },
    isSetIterator() { return true; },
    isExternal() { return true; },
    bufferIsBuffer() { return true; },
    forbiddenProbes: [],
    hasForbiddenRuntimeBrand() { return true; },
    localFunctionPrototype: null,
    inspect: null,
    inspectCustom: null,
    inspectAuthorityAvailable: false,
    arrayIsArray() { return false; },
    promiseAuthorityAvailable: false,
    promiseConstructor: null,
    promisePrototype: null,
    promiseThen: null,
    promiseSpecies: null,
    hasTrustedLocalPromiseSpecies: false,
    canLoadMutableBuiltinGraph() { return false; }
  };
} else {
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

// process.moduleLoadList is configurable caller-controlled state and cannot
// establish builtin freshness without executing Proxy traps. Treat VM export
// authority as unavailable at bootstrap and use the descriptor-captured package
// primordials plus trap-free Inspector classification instead.
const vmModule = null;
const runInNewContext = null;
const hasFreshVmAuthority = false;

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
  : "function Array() { [native code] }";
const pristineArrayIsArraySource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Array.isArray)")
  : "function isArray() { [native code] }";
const pristinePromiseConstructorSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Promise)")
  : "function Promise() { [native code] }";
const pristinePromiseThenSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Promise.prototype.then)")
  : "function then() { [native code] }";
const pristinePromiseSpecies = hasFreshVmAuthority
  ? runInNewContext("Symbol.species")
  : packageAuthority.SymbolSpecies;
const pristinePromiseSpeciesGetterSource = hasFreshVmAuthority
  ? runInNewContext("Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)")
  : "function get [Symbol.species]() { [native code] }";
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

function loadModuleUtilTypesAuthority() {
  try {
    return require("node:util/types");
  } catch {}
  try {
    return require("util/types");
  } catch {
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
    if (remote.subtype === "proxy") {
      classified = true;
    } else if (
      remote.type === "function" &&
      remote.subtype === undefined &&
      typeof remote.objectId === "string"
    ) {
      let propertiesCalled = false;
      let propertiesError = null;
      let propertiesResult = null;
      pristineReflectApply(post, session, [
        "Runtime.getProperties",
        {
          objectId: remote.objectId,
          ownProperties: true,
          generatePreview: false
        },
        function gotchaInspectorPropertiesCallback(error, result) {
          propertiesCalled = true;
          propertiesError = error;
          propertiesResult = result;
        }
      ]);
      if (
        propertiesCalled !== true ||
        propertiesError !== null ||
        propertiesResult === null ||
        typeof propertiesResult !== "object" ||
        propertiesResult.internalProperties === null ||
        typeof propertiesResult.internalProperties !== "object" ||
        typeof propertiesResult.internalProperties.length !== "number"
      ) {
        classified = null;
      } else {
        let bound = false;
        for (
          let index = 0;
          index < propertiesResult.internalProperties.length;
          index += 1
        ) {
          const entry = propertiesResult.internalProperties[index];
          if (
            entry !== null &&
            typeof entry === "object" &&
            (
              entry.name === "[[TargetFunction]]" ||
              entry.name === "[[BoundThis]]" ||
              entry.name === "[[BoundArgs]]"
            )
          ) {
            bound = true;
            break;
          }
        }
        classified = bound;
      }
    } else {
      classified = null;
    }
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

function inspectorHasNodeInternalFunctionOrigin(candidate, expectedEmbedderName) {
  if (
    typeof candidate !== "function" ||
    typeof expectedEmbedderName !== "string" ||
    expectedEmbedderName === "" ||
    isProxy(candidate)
  ) return false;

  let inspectorModule;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    return false;
  }

  const SessionConstructor = bootstrapOwnDataValue(inspectorModule, "Session");
  const sessionPrototype = bootstrapOwnDataValue(SessionConstructor, "prototype");
  const connect = bootstrapOwnDataValue(sessionPrototype, "connect");
  const disconnect = bootstrapOwnDataValue(sessionPrototype, "disconnect");
  const post = bootstrapOwnDataValue(sessionPrototype, "post");
  if (
    typeof SessionConstructor !== "function" ||
    typeof connect !== "function" ||
    typeof disconnect !== "function" ||
    typeof post !== "function" ||
    typeof pristineDefineProperty !== "function" ||
    typeof pristineReflectDeleteProperty !== "function"
  ) return false;

  let session;
  try {
    session = new SessionConstructor();
  } catch {
    return false;
  }

  // `on` lives on EventEmitter.prototype. Find it descriptor-by-descriptor so
  // an accessor-backed inherited replacement is rejected without execution.
  let eventPrototype = sessionPrototype;
  let on = null;
  for (let depth = 0; depth < 8 && eventPrototype !== null; depth += 1) {
    let descriptor;
    try {
      descriptor = pristineReflectApply(
        pristineGetOwnPropertyDescriptor,
        undefined,
        [eventPrototype, "on"]
      );
    } catch {
      return false;
    }
    if (descriptor !== undefined) {
      if (
        "get" in descriptor ||
        "set" in descriptor ||
        typeof descriptor.value !== "function" ||
        isProxy(descriptor.value)
      ) return false;
      on = descriptor.value;
      break;
    }
    try {
      eventPrototype = pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [eventPrototype]
      );
    } catch {
      return false;
    }
  }
  if (typeof on !== "function") return false;

  const key = "__gotchaRuntimeBuiltinLoaderCandidate__";
  let existingDescriptor;
  try {
    existingDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [globalThis, key]
    );
  } catch {
    return false;
  }
  if (existingDescriptor !== undefined) return false;

  const scriptMeta = [];
  function onScriptParsed(message) {
    const params = message && message.params;
    if (
      params !== null &&
      typeof params === "object" &&
      typeof params.scriptId === "string"
    ) {
      scriptMeta[scriptMeta.length] = {
        scriptId: params.scriptId,
        url: params.url,
        embedderName: params.embedderName
      };
    }
  }

  let connected = false;
  let installed = false;
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
    pristineReflectApply(on, session, ["Debugger.scriptParsed", onScriptParsed]);

    let enableCalled = false;
    let enableError = null;
    pristineReflectApply(post, session, [
      "Debugger.enable",
      {},
      function gotchaDebuggerEnableCallback(error) {
        enableCalled = true;
        enableError = error;
      }
    ]);
    if (enableCalled !== true || enableError !== null) return false;

    let evaluateCalled = false;
    let evaluateError = null;
    let evaluateResult = null;
    pristineReflectApply(post, session, [
      "Runtime.evaluate",
      {
        expression: "globalThis.__gotchaRuntimeBuiltinLoaderCandidate__",
        generatePreview: false,
        returnByValue: false
      },
      function gotchaBuiltinLoaderEvaluateCallback(error, result) {
        evaluateCalled = true;
        evaluateError = error;
        evaluateResult = result;
      }
    ]);
    if (
      evaluateCalled !== true ||
      evaluateError !== null ||
      evaluateResult === null ||
      typeof evaluateResult !== "object" ||
      evaluateResult.result === null ||
      typeof evaluateResult.result !== "object" ||
      typeof evaluateResult.result.objectId !== "string"
    ) return false;

    let propertiesCalled = false;
    let propertiesError = null;
    let propertiesResult = null;
    pristineReflectApply(post, session, [
      "Runtime.getProperties",
      {
        objectId: evaluateResult.result.objectId,
        ownProperties: true,
        generatePreview: false
      },
      function gotchaBuiltinLoaderPropertiesCallback(error, result) {
        propertiesCalled = true;
        propertiesError = error;
        propertiesResult = result;
      }
    ]);
    if (
      propertiesCalled !== true ||
      propertiesError !== null ||
      propertiesResult === null ||
      typeof propertiesResult !== "object" ||
      propertiesResult.internalProperties === null ||
      typeof propertiesResult.internalProperties !== "object"
    ) return false;

    let scriptId = null;
    for (
      let index = 0;
      index < propertiesResult.internalProperties.length;
      index += 1
    ) {
      const entry = propertiesResult.internalProperties[index];
      if (
        entry !== null &&
        typeof entry === "object" &&
        entry.name === "[[FunctionLocation]]" &&
        entry.value !== null &&
        typeof entry.value === "object" &&
        entry.value.value !== null &&
        typeof entry.value.value === "object" &&
        typeof entry.value.value.scriptId === "string"
      ) {
        scriptId = entry.value.value.scriptId;
        break;
      }
    }
    if (scriptId === null) return false;

    for (let index = 0; index < scriptMeta.length; index += 1) {
      const meta = scriptMeta[index];
      if (
        meta.scriptId === scriptId &&
        meta.url === expectedEmbedderName &&
        meta.embedderName === expectedEmbedderName
      ) return true;
    }
    return false;
  } catch {
    return false;
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
}

const builtinLoaderSource =
  "function getBuiltinModule(id) {\n" +
  "  validateString(id, 'id');\n" +
  "  const normalizedId = BuiltinModule.normalizeRequirableId(id);\n" +
  "  return normalizedId ? require(normalizedId) : undefined;\n" +
  "}";

let nodeMajorVersion = null;
try {
  const versions = bootstrapOwnDataValue(process, "versions");
  const nodeVersion = bootstrapOwnDataValue(versions, "node");
  if (typeof nodeVersion === "string") {
    let majorText = "";
    for (let index = 0; index < nodeVersion.length; index += 1) {
      const character = nodeVersion[index];
      if (character === ".") break;
      if (character < "0" || character > "9") {
        majorText = "";
        break;
      }
      majorText += character;
    }
    if (majorText !== "") nodeMajorVersion = Number(majorText);
  }
} catch {
  nodeMajorVersion = null;
}

let authenticatedGetBuiltinModule = null;
let builtinLoaderAuthenticationAttempted = false;

function getAuthenticatedBuiltinModule() {
  if (builtinLoaderAuthenticationAttempted) {
    return authenticatedGetBuiltinModule;
  }
  builtinLoaderAuthenticationAttempted = true;

  if (
    nodeMajorVersion === null ||
    nodeMajorVersion < 20
  ) return null;

  try {
    const candidate = bootstrapOwnDataValue(process, "getBuiltinModule");
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      typeof candidate === "function" &&
      source === builtinLoaderSource &&
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      inspectorHasNodeInternalFunctionOrigin(
        candidate,
        "node:internal/modules/helpers"
      )
    ) {
      authenticatedGetBuiltinModule = candidate;
    }
  } catch {
    authenticatedGetBuiltinModule = null;
  }

  return authenticatedGetBuiltinModule;
}

function canLoadMutableBuiltinGraph() {
  // Node 14/16/18 do not expose process.getBuiltinModule and do not use the
  // modern builtin sync-exports path implicated by the Node 20+ regression.
  if (
    nodeMajorVersion !== null &&
    nodeMajorVersion < 20
  ) return true;

  const builtinLoader = getAuthenticatedBuiltinModule();
  if (typeof builtinLoader !== "function") return false;

  try {
    const utilModule = pristineReflectApply(
      builtinLoader,
      undefined,
      ["node:util"]
    );
    if (
      utilModule === null ||
      typeof utilModule !== "object" ||
      isProxy(utilModule)
    ) return false;
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilModule, "types"]
    );
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      descriptor.value === utilTypesAuthority &&
      descriptor.value !== null &&
      typeof descriptor.value === "object" &&
      !isProxy(descriptor.value)
    );
  } catch {
    return false;
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
    if (source === namedNativeSource) return candidate;
    if (
      source === "function () { [native code] }" &&
      inspectorClassifiesProxy(candidate) === false
    ) return candidate;
    return null;
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


function captureLocalNativeDataFunction(object, key, expectedSource) {
  if (object === null || (typeof object !== "object" && typeof object !== "function")) {
    return null;
  }
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [object, key]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    if (
      typeof candidate !== "function" ||
      isProxy(candidate) ||
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    return pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    ) === expectedSource ? candidate : null;
  } catch {
    return null;
  }
}

function captureLocalNativeConstructor(name) {
  const candidate = bootstrapOwnDataValue(globalThis, name);
  if (
    typeof candidate !== "function" ||
    isProxy(candidate)
  ) return null;
  try {
    if (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    return pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    ) === "function " + name + "() { [native code] }"
      ? candidate
      : null;
  } catch {
    return null;
  }
}

const consumerObjectConstructor = captureLocalNativeConstructor("Object");
const consumerArrayConstructor = captureLocalNativeConstructor("Array");
const consumerSetConstructor = captureLocalNativeConstructor("Set");
const consumerMapConstructor = captureLocalNativeConstructor("Map");
const consumerNumberConstructor = captureLocalNativeConstructor("Number");
const consumerStringConstructor = captureLocalNativeConstructor("String");
const consumerTypeErrorConstructorCandidate =
  bootstrapOwnDataValue(globalThis, "TypeError");
let consumerTypeErrorConstructor = null;
try {
  if (
    typeof consumerTypeErrorConstructorCandidate === "function" &&
    !isProxy(consumerTypeErrorConstructorCandidate) &&
    pristineReflectApply(
      pristineFunctionToString,
      consumerTypeErrorConstructorCandidate,
      []
    ) === "function TypeError() { [native code] }"
  ) {
    consumerTypeErrorConstructor = consumerTypeErrorConstructorCandidate;
  }
} catch {
  consumerTypeErrorConstructor = null;
}
const consumerReflectObject = bootstrapOwnDataValue(globalThis, "Reflect");

const consumerObjectPrototype = bootstrapOwnDataValue(
  consumerObjectConstructor,
  "prototype"
);
const consumerArrayPrototype = bootstrapOwnDataValue(
  consumerArrayConstructor,
  "prototype"
);
const consumerSetPrototype = bootstrapOwnDataValue(
  consumerSetConstructor,
  "prototype"
);
const consumerMapPrototype = bootstrapOwnDataValue(
  consumerMapConstructor,
  "prototype"
);
const consumerStringPrototype = bootstrapOwnDataValue(
  consumerStringConstructor,
  "prototype"
);

const consumerGetOwnPropertyDescriptors = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "getOwnPropertyDescriptors",
  "function getOwnPropertyDescriptors() { [native code] }"
);
const consumerIsExtensible = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "isExtensible",
  "function isExtensible() { [native code] }"
);
const consumerObjectIs = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "is",
  "function is() { [native code] }"
);
const consumerDefineProperty = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "defineProperty",
  "function defineProperty() { [native code] }"
);
const consumerHasOwnProperty = captureLocalNativeDataFunction(
  consumerObjectPrototype,
  "hasOwnProperty",
  "function hasOwnProperty() { [native code] }"
);
const consumerOwnKeys = captureLocalNativeDataFunction(
  consumerReflectObject,
  "ownKeys",
  "function ownKeys() { [native code] }"
);
const consumerNumberIsFinite = captureLocalNativeDataFunction(
  consumerNumberConstructor,
  "isFinite",
  "function isFinite() { [native code] }"
);
const consumerStringTrim = captureLocalNativeDataFunction(
  consumerStringPrototype,
  "trim",
  "function trim() { [native code] }"
);
const capturedConsumerStringIncludes = hasFreshVmAuthority
  ? runInNewContext("String.prototype.includes")
  : captureLocalNativeDataFunction(
      consumerStringPrototype,
      "includes",
      "function includes() { [native code] }"
    );

function localPrimitiveStringIncludes(search) {
  const source = this;
  if (typeof source !== "string" || typeof search !== "string") return false;
  const sourceLength = source.length;
  const searchLength = search.length;
  if (searchLength === 0) return true;
  if (searchLength > sourceLength) return false;
  const lastStart = sourceLength - searchLength;
  for (let start = 0; start <= lastStart; start += 1) {
    let matched = true;
    for (let offset = 0; offset < searchLength; offset += 1) {
      if (source[start + offset] !== search[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

const consumerStringIncludes =
  typeof capturedConsumerStringIncludes === "function"
    ? capturedConsumerStringIncludes
    : localPrimitiveStringIncludes;
const consumerSetHas = captureLocalNativeDataFunction(
  consumerSetPrototype,
  "has",
  "function has() { [native code] }"
);
const consumerSetAdd = captureLocalNativeDataFunction(
  consumerSetPrototype,
  "add",
  "function add() { [native code] }"
);
const consumerMapGet = captureLocalNativeDataFunction(
  consumerMapPrototype,
  "get",
  "function get() { [native code] }"
);
const consumerMapSet = captureLocalNativeDataFunction(
  consumerMapPrototype,
  "set",
  "function set() { [native code] }"
);
const consumerArrayPush = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "push",
  "function push() { [native code] }"
);
const consumerArrayPop = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "pop",
  "function pop() { [native code] }"
);
const consumerArrayJoin = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "join",
  "function join() { [native code] }"
);

function captureOptionalNativeConstructor(name) {
  const candidate = bootstrapOwnDataValue(globalThis, name);
  if (candidate === null || candidate === undefined) return null;
  if (
    typeof candidate !== "function" ||
    isProxy(candidate)
  ) return null;
  try {
    return (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      pristineReflectApply(
        pristineFunctionToString,
        candidate,
        []
      ) === "function " + name + "() { [native code] }"
    ) ? candidate : null;
  } catch {
    return null;
  }
}

const consumerWeakRefConstructor = captureOptionalNativeConstructor("WeakRef");
const consumerFinalizationRegistryConstructor =
  captureOptionalNativeConstructor("FinalizationRegistry");

const freshVmIsContext = hasFreshVmAuthority
  ? bootstrapOwnDataValue(vmModule, "isContext")
  : null;
function isVmContext(value) {
  if (typeof freshVmIsContext !== "function") return false;
  try {
    return pristineReflectApply(freshVmIsContext, vmModule, [value]) === true;
  } catch {
    return true;
  }
}

const consumerTypeErrorConstructorSource =
  bootstrapFunctionSource(consumerTypeErrorConstructor);

const consumerPrimordialsBundleAvailable = (
  typeof pristineReflectApply === "function" &&
  typeof pristineGetPrototypeOf === "function" &&
  typeof pristineGetOwnPropertyDescriptor === "function" &&
  typeof pristineFunctionToString === "function" &&
  typeof pristineObjectFreeze === "function"
);

const consumerPrimordialsAvailable = (
  consumerPrimordialsBundleAvailable === true &&
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

// Keep the module graph loadable when one higher-level authority (notably the
// ambient TypeError constructor) is poisoned. Safe core primordials remain
// available for module initialization, while consumerPrimordialsAvailable stays
// false and public execution fails closed until the complete authority set is
// authenticated.
const consumerPrimordials = consumerPrimordialsBundleAvailable
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
  : null;

const exported = {
  objectFreeze: pristineObjectFreeze,
  functionToString: pristineFunctionToString,
  consumerPrimordialsAvailable,
  consumerPrimordials,
  weakRefConstructor: consumerWeakRefConstructor,
  finalizationRegistryConstructor: consumerFinalizationRegistryConstructor,
  isVmContext,
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
  hasTrustedLocalPromiseSpecies,
  canLoadMutableBuiltinGraph
};

module.exports = pristineReflectApply(
  pristineObjectFreeze,
  undefined,
  [exported]
);
}
