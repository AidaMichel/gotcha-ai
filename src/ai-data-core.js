"use strict";

const nodeUtil =
  require("node:util");

const {
  types: utilTypes,
  inspect
} = nodeUtil;

const utilTypePredicates =
  Object.freeze(
    Object.create(
      null,
      Object.getOwnPropertyDescriptors(
        utilTypes
      )
    )
  );

const {
  PerformanceObserver
} = require("node:perf_hooks");

const workerThreads =
  require("node:worker_threads");

const nodeUrl =
  require("node:url");

const nodeBuffer =
  require("node:buffer");

let streamWeb = null;

try {
  streamWeb =
    require("node:stream/web");
} catch {}

const nodeCrypto =
  require("node:crypto");

const nodeProcess =
  require("node:process");

const vm =
  require("node:vm");

const {
  AsyncLocalStorage
} = require("node:async_hooks");

const vmIsContext =
  typeof vm.isContext === "function"
    ? vm.isContext
    : null;

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;

const getPrototypeOf =
  Object.getPrototypeOf;

const ownKeys =
  Reflect.ownKeys;

const reflectApply =
  Reflect.apply;

const reflectConstruct =
  Reflect.construct;

const deleteProperty =
  Reflect.deleteProperty;

const defineProperty =
  Object.defineProperty;

const objectCreate =
  Object.create;

const objectFreeze =
  Object.freeze;

const arrayIsArray =
  Array.isArray;

const objectIs =
  Object.is;

const numberIsFinite =
  Number.isFinite;

const numberIsInteger =
  Number.isInteger;

const numberParseInt =
  Number.parseInt;

const WeakSetConstructor =
  WeakSet;

const WeakMapConstructor =
  WeakMap;

const ArrayConstructor =
  Array;

const symbolHasInstance =
  Symbol.hasInstance;

const functionToString =
  vm.runInNewContext(
    "Function.prototype.toString"
  );

const stringIncludes =
  vm.runInNewContext(
    "String.prototype.includes"
  );

const objectConstructorSource =
  reflectApply(
    functionToString,
    Object,
    []
  );

const arrayConstructorSource =
  reflectApply(
    functionToString,
    Array,
    []
  );

const MAX_ARRAY_INDEX =
  2 ** 32 - 1;

function failUnsupportedType(
  value,
  label
) {
  const type =
    typeof value;

  if (type === "undefined") {
    throw new Error(
      `${label} must not contain undefined.`
    );
  }

  if (type === "function") {
    throw new Error(
      `${label} must not contain functions.`
    );
  }

  if (type === "symbol") {
    throw new Error(
      `${label} must not contain symbols.`
    );
  }

  if (type === "bigint") {
    throw new Error(
      `${label} must not contain bigint values.`
    );
  }

  throw new Error(
    `${label} contains an unsupported value.`
  );
}

function requireFiniteNumber(
  value,
  label
) {
  if (!numberIsFinite(value)) {
    throw new Error(
      `${label} must be a finite number.`
    );
  }
}

function isNativeConstructorDescriptor(
  descriptor,
  expectedSource,
  expectedPrototype
) {
  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    typeof descriptor.value !==
      "function" ||
    utilTypePredicates.isProxy(
      descriptor.value
    )
  ) {
    return false;
  }

  let source;
  let prototypeDescriptor;

  try {
    source =
      reflectApply(
        functionToString,
        descriptor.value,
        []
      );

    prototypeDescriptor =
      getOwnPropertyDescriptor(
        descriptor.value,
        "prototype"
      );
  } catch {
    return false;
  }

  return (
    source === expectedSource &&
    prototypeDescriptor !==
      undefined &&
    !("get" in prototypeDescriptor) &&
    !("set" in prototypeDescriptor) &&
    prototypeDescriptor.value ===
      expectedPrototype
  );
}

function isOrdinaryObjectPrototype(
  prototype
) {
  if (prototype === null) {
    return true;
  }

  if (
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return false;
  }

  let parent;
  let constructorDescriptor;

  try {
    parent =
      getPrototypeOf(prototype);

    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
  } catch {
    return false;
  }

  if (parent !== null) {
    return false;
  }

  return isNativeConstructorDescriptor(
    constructorDescriptor,
    objectConstructorSource,
    prototype
  );
}

function isOrdinaryArrayPrototype(
  prototype
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return false;
  }

  let parent;
  let constructorDescriptor;

  try {
    parent =
      getPrototypeOf(prototype);

    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
  } catch {
    return false;
  }

  if (
    !isOrdinaryObjectPrototype(
      parent
    )
  ) {
    return false;
  }

  return isNativeConstructorDescriptor(
    constructorDescriptor,
    arrayConstructorSource,
    prototype
  );
}

function isArrayIndexKey(
  key
) {
  if (
    typeof key !== "string" ||
    key === ""
  ) {
    return false;
  }

  const numeric =
    Number(key);

  return (
    numberIsInteger(numeric) &&
    numeric >= 0 &&
    numeric < MAX_ARRAY_INDEX &&
    String(numeric) === key
  );
}

function captureNavigatorSingleton() {
  try {
    const value =
      globalThis.navigator;

    return (
      value !== null &&
      typeof value === "object" &&
      !utilTypePredicates.isProxy(value)
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

const navigatorSingleton =
  captureNavigatorSingleton();

function captureNavigatorLocks() {
  if (navigatorSingleton === null) {
    return null;
  }

  try {
    const locks =
      navigatorSingleton.locks;

    return (
      locks !== null &&
      typeof locks === "object" &&
      !utilTypePredicates.isProxy(locks)
    )
      ? locks
      : null;
  } catch {
    return null;
  }
}

const navigatorLocks =
  captureNavigatorLocks();

function captureCryptoSingleton() {
  try {
    const value =
      globalThis.crypto;

    return (
      value !== null &&
      typeof value === "object" &&
      !utilTypePredicates.isProxy(value)
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

const cryptoSingleton =
  captureCryptoSingleton();

function captureCryptoSubtleSingleton() {
  try {
    const cryptoObject =
      cryptoSingleton;

    if (
      cryptoObject === undefined ||
      cryptoObject === null ||
      typeof cryptoObject !== "object"
    ) {
      return null;
    }

    const subtle =
      cryptoObject.subtle;

    return (
      subtle !== null &&
      typeof subtle === "object"
    )
      ? subtle
      : null;
  } catch {
    return null;
  }
}

const cryptoSubtleSingleton =
  captureCryptoSubtleSingleton();

function captureNodeCryptoSubtleSingleton() {
  try {
    const webcrypto =
      nodeCrypto.webcrypto;

    if (
      webcrypto === undefined ||
      webcrypto === null ||
      typeof webcrypto !== "object"
    ) {
      return null;
    }

    const subtle =
      webcrypto.subtle;

    return (
      subtle !== null &&
      typeof subtle === "object"
    )
      ? subtle
      : null;
  } catch {
    return null;
  }
}

const nodeCryptoSubtleSingleton =
  captureNodeCryptoSubtleSingleton();

const unsupportedHostSingletons =
  objectFreeze(
    [
      workerThreads.locks,
      navigatorSingleton,
      navigatorLocks,
      cryptoSingleton,
      cryptoSubtleSingleton,
      nodeCryptoSubtleSingleton
    ].filter(
      (value, index, values) =>
        value !== undefined &&
        value !== null &&
        values.indexOf(value) === index
    )
  );

function hasUnsupportedHostSingleton(
  value
) {
  return unsupportedHostSingletons
    .some(
      (singleton) =>
        singleton === value
    );
}

function captureConstructorPrototype(
  constructor
) {
  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );
  } catch {
    return null;
  }

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    descriptor.value === null ||
    typeof descriptor.value !== "object" ||
    utilTypePredicates.isProxy(
      descriptor.value
    )
  ) {
    return null;
  }

  return descriptor.value;
}

function captureGetterFromPrototypeObject(
  prototype,
  propertyName
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    typeof descriptor.get === "function" &&
    !utilTypePredicates.isProxy(
      descriptor.get
    )
  )
    ? descriptor.get
    : null;
}

function captureMethodFromPrototypeObject(
  prototype,
  propertyName
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value === "function" &&
    !utilTypePredicates.isProxy(
      descriptor.value
    )
  )
    ? descriptor.value
    : null;
}

function capturePrototypeGetter(
  constructor,
  propertyName
) {
  return captureGetterFromPrototypeObject(
    captureConstructorPrototype(constructor),
    propertyName
  );
}

function capturePrototypeMethod(
  constructor,
  propertyName
) {
  return captureMethodFromPrototypeObject(
    captureConstructorPrototype(constructor),
    propertyName
  );
}

function captureMethodFromPrototype(
  prototype,
  propertyName
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return null;
  }

  const descriptor =
    getOwnPropertyDescriptor(
      prototype,
      propertyName
    );

  return (
    descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value ===
      "function"
  )
    ? descriptor.value
    : null;
}

const nodeMajorVersion =
  numberParseInt(
    nodeProcess.versions.node,
    10
  );

const undiciRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 20;

let undiciHostBrandAuthorityAvailable =
  true;

function captureUndiciNativeSource() {
  if (!undiciRuntimeExpected) {
    return null;
  }

  let bindingDescriptor;

  try {
    bindingDescriptor =
      getOwnPropertyDescriptor(
        nodeProcess,
        "binding"
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    bindingDescriptor === undefined ||
    "get" in bindingDescriptor ||
    "set" in bindingDescriptor ||
    typeof bindingDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      bindingDescriptor.value
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let natives;

  try {
    natives =
      reflectApply(
        bindingDescriptor.value,
        nodeProcess,
        ["natives"]
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    natives === null ||
    typeof natives !== "object" ||
    utilTypePredicates.isProxy(natives)
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let sourceDescriptor;

  try {
    sourceDescriptor =
      getOwnPropertyDescriptor(
        natives,
        "internal/deps/undici/undici"
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    sourceDescriptor === undefined ||
    "get" in sourceDescriptor ||
    "set" in sourceDescriptor ||
    typeof sourceDescriptor.value !== "string" ||
    sourceDescriptor.value === ""
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  return sourceDescriptor.value;
}

const undiciNativeSource =
  captureUndiciNativeSource();

function sourceBelongsToUndiciBundle(
  callable
) {
  if (
    undiciNativeSource === null ||
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );

    return reflectApply(
      stringIncludes,
      undiciNativeSource,
      [source]
    );
  } catch {
    return false;
  }
}

function captureEmbeddedNodeSource(
  moduleName
) {
  let bindingDescriptor;

  try {
    bindingDescriptor =
      getOwnPropertyDescriptor(
        nodeProcess,
        "binding"
      );
  } catch {
    return null;
  }

  if (
    bindingDescriptor === undefined ||
    "get" in bindingDescriptor ||
    "set" in bindingDescriptor ||
    typeof bindingDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      bindingDescriptor.value
    )
  ) {
    return null;
  }

  let natives;

  try {
    natives =
      reflectApply(
        bindingDescriptor.value,
        nodeProcess,
        ["natives"]
      );
  } catch {
    return null;
  }

  if (
    natives === null ||
    typeof natives !== "object" ||
    utilTypePredicates.isProxy(natives)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        natives,
        moduleName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    typeof descriptor.value === "string" &&
    descriptor.value !== ""
  )
    ? descriptor.value
    : null;
}

const undiciLazyAccessorCoreSources =
  objectFreeze([
    captureEmbeddedNodeSource(
      "internal/util"
    ),
    captureEmbeddedNodeSource(
      "internal/process/pre_execution"
    )
  ]);

function sourceBelongsToUndiciLazyCore(
  callable
) {
  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );
  } catch {
    return false;
  }

  for (
    const moduleSource of
      undiciLazyAccessorCoreSources
  ) {
    if (
      typeof moduleSource === "string" &&
      reflectApply(
        stringIncludes,
        moduleSource,
        [source]
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasExpectedCallableMetadata(
  callable,
  expectedName,
  expectedLength
) {
  let nameDescriptor;
  let lengthDescriptor;

  try {
    nameDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "name"
      );
    lengthDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "length"
      );
  } catch {
    return false;
  }

  return (
    nameDescriptor !== undefined &&
    !("get" in nameDescriptor) &&
    !("set" in nameDescriptor) &&
    nameDescriptor.value === expectedName &&
    lengthDescriptor !== undefined &&
    !("get" in lengthDescriptor) &&
    !("set" in lengthDescriptor) &&
    lengthDescriptor.value === expectedLength
  );
}

function hasExpectedLazyAccessorMetadata(
  callable,
  shortName,
  qualifiedName,
  expectedLength
) {
  let nameDescriptor;
  let lengthDescriptor;

  try {
    nameDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "name"
      );
    lengthDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "length"
      );
  } catch {
    return false;
  }

  return (
    nameDescriptor !== undefined &&
    !("get" in nameDescriptor) &&
    !("set" in nameDescriptor) &&
    (
      nameDescriptor.value === shortName ||
      nameDescriptor.value === qualifiedName
    ) &&
    lengthDescriptor !== undefined &&
    !("get" in lengthDescriptor) &&
    !("set" in lengthDescriptor) &&
    lengthDescriptor.value === expectedLength
  );
}

function hasTrustedUndiciBlobDependency() {
  if (nodeMajorVersion < 24) {
    return true;
  }

  let globalBlobDescriptor;
  let moduleBlobDescriptor;

  try {
    globalBlobDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        "Blob"
      );
    moduleBlobDescriptor =
      getOwnPropertyDescriptor(
        nodeBuffer,
        "Blob"
      );
  } catch {
    return false;
  }

  if (
    globalBlobDescriptor === undefined ||
    "get" in globalBlobDescriptor ||
    "set" in globalBlobDescriptor ||
    moduleBlobDescriptor === undefined ||
    "get" in moduleBlobDescriptor ||
    "set" in moduleBlobDescriptor ||
    typeof globalBlobDescriptor.value !==
      "function" ||
    globalBlobDescriptor.value !==
      moduleBlobDescriptor.value ||
    utilTypePredicates.isProxy(
      globalBlobDescriptor.value
    )
  ) {
    return false;
  }

  const blobModuleSource =
    captureEmbeddedNodeSource(
      "internal/blob"
    );

  return sourceBelongsToEmbeddedModule(
    globalBlobDescriptor.value,
    blobModuleSource
  );
}

function resolveRequiredUndiciConstructor(
  constructorName
) {
  if (!hasTrustedUndiciBlobDependency()) {
    return null;
  }
  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        constructorName
      );
  } catch {
    return null;
  }

  if (globalDescriptor === undefined) {
    return null;
  }

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    return (
      typeof globalDescriptor.value === "function" &&
      !utilTypePredicates.isProxy(
        globalDescriptor.value
      )
    )
      ? globalDescriptor.value
      : null;
  }

  const getter =
    globalDescriptor.get;
  const setter =
    globalDescriptor.set;

  if (
    globalDescriptor.enumerable !== false ||
    globalDescriptor.configurable !== true ||
    typeof getter !== "function" ||
    typeof setter !== "function" ||
    utilTypePredicates.isProxy(getter) ||
    utilTypePredicates.isProxy(setter) ||
    !hasExpectedLazyAccessorMetadata(
      getter,
      "get",
      `get ${constructorName}`,
      0
    ) ||
    !hasExpectedLazyAccessorMetadata(
      setter,
      "set",
      `set ${constructorName}`,
      1
    ) ||
    !sourceBelongsToUndiciLazyCore(getter) ||
    !sourceBelongsToUndiciLazyCore(setter)
  ) {
    return null;
  }

  let constructor;

  try {
    constructor =
      reflectApply(
        getter,
        globalThis,
        []
      );
  } catch {
    return null;
  }

  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor)
  ) {
    return null;
  }

  let resolvedDescriptor;

  try {
    resolvedDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        constructorName
      );
  } catch {
    return null;
  }

  if (
    resolvedDescriptor === undefined ||
    "get" in resolvedDescriptor ||
    "set" in resolvedDescriptor ||
    resolvedDescriptor.value !== constructor
  ) {
    return null;
  }

  return constructor;
}

function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {
  if (
    !undiciRuntimeExpected ||
    !abortControllerBrandAuthorityAvailable
  ) {
    if (
      undiciRuntimeExpected &&
      !abortControllerBrandAuthorityAvailable
    ) {
      undiciHostBrandAuthorityAvailable = false;
    }

    return null;
  }

  if (undiciNativeSource === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const constructor =
    resolveRequiredUndiciConstructor(
      constructorName
    );

  if (
    constructor === null ||
    !hasExpectedCallableMetadata(
      constructor,
      constructorName,
      0
    ) ||
    !sourceBelongsToUndiciBundle(
      constructor
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let constructorDescriptor;
  let probeDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    probeDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    constructorDescriptor.value !== constructor ||
    probeDescriptor === undefined
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const callable =
    kind === "getter"
      ? probeDescriptor.get
      : probeDescriptor.value;

  const expectedName =
    kind === "getter"
      ? `get ${propertyName}`
      : propertyName;

  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable) ||
    !hasExpectedCallableMetadata(
      callable,
      expectedName,
      expectedLength
    ) ||
    !sourceBelongsToUndiciBundle(
      callable
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  return {
    constructor,
    method: callable,
    args
  };
}

function captureIntlConstructor(
  name
) {
  if (
    typeof Intl !== "object" ||
    Intl === null
  ) {
    return null;
  }

  const value =
    Intl[name];

  return (
    typeof value === "function"
  )
    ? value
    : null;
}

function capturePerformanceObserverBrandProbe() {
  if (
    typeof PerformanceObserver !==
      "function" ||
    PerformanceObserver.prototype ===
      null ||
    typeof PerformanceObserver.prototype !==
      "object"
  ) {
    return null;
  }

  const descriptor =
    getOwnPropertyDescriptor(
      PerformanceObserver.prototype,
      inspect.custom
    );

  return (
    descriptor !== undefined &&
    typeof descriptor.value ===
      "function"
  )
    ? descriptor.value
    : null;
}

const performanceObserverBrandProbe =
  capturePerformanceObserverBrandProbe();

const performanceObserverInspectOptions =
  objectFreeze({
    depth: 0
  });

function hasUnsupportedPerformanceObserverBrand(
  value
) {
  if (
    performanceObserverBrandProbe === null
  ) {
    return false;
  }

  try {
    reflectApply(
      performanceObserverBrandProbe,
      value,
      [
        0,
        performanceObserverInspectOptions,
        inspect
      ]
    );

    return true;
  } catch {
    return false;
  }
}

let trustedModuleBrandAuthorityAvailable =
  true;

function sourceBelongsToEmbeddedModule(
  callable,
  moduleSource
) {
  if (
    typeof moduleSource !== "string" ||
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );

    return reflectApply(
      stringIncludes,
      moduleSource,
      [source]
    );
  } catch {
    return false;
  }
}

function embeddedModuleDeclaresConstructor(
  moduleSource,
  name
) {
  if (typeof moduleSource !== "string") {
    return false;
  }

  return (
    reflectApply(
      stringIncludes,
      moduleSource,
      [`class ${name}`]
    ) ||
    reflectApply(
      stringIncludes,
      moduleSource,
      [`function ${name}`]
    )
  );
}

function matchesAmbientNativeConstructor(
  constructor,
  name
) {
  let descriptor;
  let source;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        globalThis,
        name
      );
    source =
      reflectApply(
        functionToString,
        constructor,
        []
      );
  } catch {
    return false;
  }

  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === constructor &&
    typeof constructor === "function" &&
    !utilTypePredicates.isProxy(constructor) &&
    reflectApply(
      stringIncludes,
      source,
      ["[native code]"]
    )
  );
}

function resolveTrustedModuleOrGlobalConstructor(
  moduleObject,
  constructorName,
  moduleSource,
  nativeRuntimeExpected
) {
  let moduleDescriptor;

  if (
    moduleObject !== null &&
    typeof moduleObject === "object" &&
    !utilTypePredicates.isProxy(moduleObject)
  ) {
    try {
      moduleDescriptor =
        getOwnPropertyDescriptor(
          moduleObject,
          constructorName
        );
    } catch {
      moduleDescriptor = undefined;
    }

    if (
      moduleDescriptor !== undefined &&
      "value" in moduleDescriptor &&
      typeof moduleDescriptor.value ===
        "function" &&
      !utilTypePredicates.isProxy(
        moduleDescriptor.value
      )
    ) {
      const moduleConstructor =
        moduleDescriptor.value;

      if (
        sourceBelongsToEmbeddedModule(
          moduleConstructor,
          moduleSource
        ) ||
        (
          nativeRuntimeExpected &&
          matchesAmbientNativeConstructor(
            moduleConstructor,
            constructorName
          )
        )
      ) {
        return moduleConstructor;
      }
    }
  }

  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        constructorName
      );
  } catch {
    return null;
  }

  if (globalDescriptor === undefined) {
    return null;
  }

  let globalConstructor;

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    globalConstructor =
      globalDescriptor.value;
  } else {
    const getter =
      globalDescriptor.get;
    const setter =
      globalDescriptor.set;

    if (
      globalDescriptor.enumerable !== false ||
      globalDescriptor.configurable !== true ||
      typeof getter !== "function" ||
      utilTypePredicates.isProxy(getter) ||
      !hasExpectedLazyAccessorMetadata(
        getter,
        "get",
        `get ${constructorName}`,
        0
      ) ||
      !sourceBelongsToUndiciLazyCore(getter) ||
      (
        setter !== undefined &&
        (
          typeof setter !== "function" ||
          utilTypePredicates.isProxy(setter) ||
          !hasExpectedLazyAccessorMetadata(
            setter,
            "set",
            `set ${constructorName}`,
            1
          ) ||
          !sourceBelongsToUndiciLazyCore(setter)
        )
      )
    ) {
      return null;
    }

    try {
      globalConstructor =
        reflectApply(
          getter,
          globalThis,
          []
        );
    } catch {
      return null;
    }

    let resolvedDescriptor;

    try {
      resolvedDescriptor =
        getOwnPropertyDescriptor(
          globalThis,
          constructorName
        );
    } catch {
      return null;
    }

    if (
      resolvedDescriptor === undefined ||
      "get" in resolvedDescriptor ||
      "set" in resolvedDescriptor ||
      resolvedDescriptor.value !==
        globalConstructor
    ) {
      return null;
    }
  }

  if (
    typeof globalConstructor !== "function" ||
    utilTypePredicates.isProxy(globalConstructor)
  ) {
    return null;
  }

  return (
    sourceBelongsToEmbeddedModule(
      globalConstructor,
      moduleSource
    ) ||
    (
      nativeRuntimeExpected &&
      matchesAmbientNativeConstructor(
        globalConstructor,
        constructorName
      )
    )
  )
    ? globalConstructor
    : null;
}

function captureTrustedModuleBrandCallable(
  moduleObject,
  constructorName,
  propertyName,
  kind,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  const moduleSource =
    sourceModuleName === null
      ? null
      : captureEmbeddedNodeSource(
          sourceModuleName
        );

  const runtimeExpected =
    embeddedModuleDeclaresConstructor(
      moduleSource,
      constructorName
    ) ||
    nativeRuntimeExpected;

  const constructor =
    resolveTrustedModuleOrGlobalConstructor(
      moduleObject,
      constructorName,
      moduleSource,
      nativeRuntimeExpected
    );

  if (constructor === null) {
    if (runtimeExpected) {
      trustedModuleBrandAuthorityAvailable =
        false;
    }

    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  let prototypeConstructorDescriptor;
  let brandDescriptor;

  try {
    prototypeConstructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    brandDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  if (
    prototypeConstructorDescriptor ===
      undefined ||
    !("value" in
      prototypeConstructorDescriptor) ||
    prototypeConstructorDescriptor.value !==
      constructor ||
    brandDescriptor === undefined
  ) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  const callable =
    kind === "getter"
      ? brandDescriptor.get
      : brandDescriptor.value;

  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  const callableTrusted =
    sourceBelongsToEmbeddedModule(
      callable,
      moduleSource
    ) ||
    (
      nativeRuntimeExpected &&
      matchesAmbientNativeConstructor(
        constructor,
        constructorName
      ) &&
      (() => {
        let source;

        try {
          source =
            reflectApply(
              functionToString,
              callable,
              []
            );
        } catch {
          return false;
        }

        return reflectApply(
          stringIncludes,
          source,
          ["[native code]"]
        );
      })()
    );

  if (!callableTrusted) {
    trustedModuleBrandAuthorityAvailable =
      false;
    return null;
  }

  return callable;
}

function captureTrustedModuleGetter(
  moduleObject,
  constructorName,
  propertyName,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  return captureTrustedModuleBrandCallable(
    moduleObject,
    constructorName,
    propertyName,
    "getter",
    sourceModuleName,
    nativeRuntimeExpected
  );
}

function captureTrustedModuleMethod(
  moduleObject,
  constructorName,
  propertyName,
  sourceModuleName,
  nativeRuntimeExpected = false
) {
  return captureTrustedModuleBrandCallable(
    moduleObject,
    constructorName,
    propertyName,
    "method",
    sourceModuleName,
    nativeRuntimeExpected
  );
}

function hasOpaqueNestedSymbolState(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    utilTypePredicates.isProxy(value)
  ) {
    return false;
  }

  let descriptors;

  try {
    descriptors =
      getOwnPropertyDescriptors(value);
  } catch {
    return false;
  }

  for (const key of ownKeys(descriptors)) {
    if (typeof key !== "symbol") {
      continue;
    }

    const descriptor = descriptors[key];

    if (
      descriptor === undefined ||
      "get" in descriptor ||
      "set" in descriptor
    ) {
      continue;
    }

    const child = descriptor.value;

    if (
      child === null ||
      typeof child !== "object"
    ) {
      continue;
    }

    if (utilTypePredicates.isProxy(child)) {
      return true;
    }

    let childDescriptors;

    try {
      childDescriptors =
        getOwnPropertyDescriptors(child);
    } catch {
      return true;
    }

    for (
      const childKey of
        ownKeys(childDescriptors)
    ) {
      if (typeof childKey === "symbol") {
        return true;
      }
    }
  }

  return false;
}

const abortControllerRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 20;

const abortControllerNativeSource =
  abortControllerRuntimeExpected
    ? captureEmbeddedNodeSource(
        "internal/abort_controller"
      )
    : null;

function sourceBelongsToAbortControllerNative(
  callable
) {
  if (
    abortControllerNativeSource === null ||
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );

    return reflectApply(
      stringIncludes,
      abortControllerNativeSource,
      [source]
    );
  } catch {
    return false;
  }
}

function resolveTrustedAbortControllerConstructor() {
  if (!abortControllerRuntimeExpected) {
    return null;
  }

  if (abortControllerNativeSource === null) {
    return null;
  }

  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        "AbortController"
      );
  } catch {
    return null;
  }

  if (globalDescriptor === undefined) {
    return null;
  }

  let constructor;

  if (
    !("get" in globalDescriptor) &&
    !("set" in globalDescriptor)
  ) {
    constructor =
      globalDescriptor.value;
  } else {
    const getter =
      globalDescriptor.get;
    const setter =
      globalDescriptor.set;

    if (
      globalDescriptor.enumerable !== false ||
      globalDescriptor.configurable !== true ||
      typeof getter !== "function" ||
      typeof setter !== "function" ||
      utilTypePredicates.isProxy(getter) ||
      utilTypePredicates.isProxy(setter) ||
      !hasExpectedLazyAccessorMetadata(
        getter,
        "get",
        "get AbortController",
        0
      ) ||
      !hasExpectedLazyAccessorMetadata(
        setter,
        "set",
        "set AbortController",
        1
      ) ||
      !sourceBelongsToUndiciLazyCore(
        getter
      ) ||
      !sourceBelongsToUndiciLazyCore(
        setter
      )
    ) {
      return null;
    }

    try {
      constructor =
        reflectApply(
          getter,
          globalThis,
          []
        );
    } catch {
      return null;
    }

    let resolvedDescriptor;

    try {
      resolvedDescriptor =
        getOwnPropertyDescriptor(
          globalThis,
          "AbortController"
        );
    } catch {
      return null;
    }

    if (
      resolvedDescriptor === undefined ||
      "get" in resolvedDescriptor ||
      "set" in resolvedDescriptor ||
      resolvedDescriptor.value !== constructor
    ) {
      return null;
    }
  }

  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor) ||
    !hasExpectedCallableMetadata(
      constructor,
      "AbortController",
      0
    ) ||
    !sourceBelongsToAbortControllerNative(
      constructor
    )
  ) {
    return null;
  }

  return constructor;
}

function captureAbortControllerBrandGetter() {
  const constructor =
    resolveTrustedAbortControllerConstructor();

  if (constructor === null) {
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    return null;
  }

  let constructorDescriptor;
  let signalDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    signalDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "signal"
      );
  } catch {
    return null;
  }

  if (
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    constructorDescriptor.value !== constructor ||
    signalDescriptor === undefined ||
    signalDescriptor.enumerable !== true ||
    signalDescriptor.configurable !== true ||
    typeof signalDescriptor.get !== "function" ||
    signalDescriptor.set !== undefined ||
    utilTypePredicates.isProxy(
      signalDescriptor.get
    ) ||
    !hasExpectedCallableMetadata(
      signalDescriptor.get,
      "get signal",
      0
    ) ||
    !sourceBelongsToAbortControllerNative(
      signalDescriptor.get
    )
  ) {
    return null;
  }

  return signalDescriptor.get;
}

const abortControllerBrandGetter =
  captureAbortControllerBrandGetter();

const abortControllerBrandAuthorityAvailable =
  !abortControllerRuntimeExpected ||
  abortControllerBrandGetter !== null;

const trustedHostBrandGetters =
  objectFreeze(
    [
      abortControllerBrandGetter,
      captureTrustedModuleGetter(
        nodeUtil,
        "TextEncoder",
        "encoding",
        "internal/encoding",
        false
      ),
      captureTrustedModuleGetter(
        nodeUtil,
        "TextDecoder",
        "encoding",
        "internal/encoding",
        false
      ),
      captureTrustedModuleGetter(
        nodeUrl,
        "URL",
        "href",
        "internal/url",
        false
      ),
      captureTrustedModuleGetter(
        nodeUrl,
        "URLPattern",
        "pathname",
        null,
        nodeMajorVersion >= 24
      ),
      captureTrustedModuleGetter(
        nodeBuffer,
        "File",
        "name",
        "internal/file",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "ReadableStream",
        "locked",
        "internal/webstreams/readablestream",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "WritableStream",
        "locked",
        "internal/webstreams/writablestream",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "TransformStream",
        "readable",
        "internal/webstreams/transformstream",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "TextEncoderStream",
        "readable",
        "internal/webstreams/encoding",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "TextDecoderStream",
        "readable",
        "internal/webstreams/encoding",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "CompressionStream",
        "readable",
        "internal/webstreams/compression",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "DecompressionStream",
        "readable",
        "internal/webstreams/compression",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "CountQueuingStrategy",
        "highWaterMark",
        "internal/webstreams/queuingstrategies",
        false
      ),
      captureTrustedModuleGetter(
        streamWeb,
        "ByteLengthQueuingStrategy",
        "highWaterMark",
        "internal/webstreams/queuingstrategies",
        false
      ),
    ].filter(
      (getter) =>
        getter !== null
    )
  );

const trustedHostBrandMethods =
  objectFreeze(
    [
      captureTrustedModuleMethod(
        nodeUrl,
        "URLSearchParams",
        "toString",
        "internal/url"
      ),
      captureTrustedModuleMethod(
        nodeBuffer,
        "Blob",
        "slice",
        "internal/blob"
      )
    ].filter(
      (method) =>
        method !== null
    )
  );

const headersBrandProbe =
  captureRequiredUndiciProbe(
    "Headers",
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const additionalHostBrandMethodAuthorityAvailable =
  !undiciRuntimeExpected ||
  (
    undiciHostBrandAuthorityAvailable &&
    headersBrandProbe !== null
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    headersBrandProbe === null
      ? []
      : [headersBrandProbe]
  );

const pristineWeakRefConstructor =
  vm.runInNewContext(
    "typeof WeakRef === 'function' ? WeakRef : null"
  );

const pristineFinalizationRegistryConstructor =
  vm.runInNewContext(
    "typeof FinalizationRegistry === 'function' ? FinalizationRegistry : null"
  );

const weakRefDeref =
  capturePrototypeMethod(
    pristineWeakRefConstructor,
    "deref"
  );

const finalizationRegistryUnregister =
  capturePrototypeMethod(
    pristineFinalizationRegistryConstructor,
    "unregister"
  );

const finalizationRegistryProbeToken =
  objectFreeze({});

const intlResolvedOptionMethods =
  objectFreeze(
    [
      "Collator",
      "DateTimeFormat",
      "DisplayNames",
      "ListFormat",
      "NumberFormat",
      "PluralRules",
      "RelativeTimeFormat",
      "Segmenter"
    ]
      .map(
        (name) =>
          capturePrototypeMethod(
            captureIntlConstructor(name),
            "resolvedOptions"
          )
      )
      .filter(
        (method) =>
          method !== null
      )
  );

const intlLocaleBaseNameGetter =
  capturePrototypeGetter(
    captureIntlConstructor(
      "Locale"
    ),
    "baseName"
  );

const webAssemblyModuleExports =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Module ===
    "function" &&
  typeof WebAssembly.Module.exports ===
    "function"
    ? WebAssembly.Module.exports
    : null;

const webAssemblyInstanceExportsGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Instance ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Instance,
        "exports"
      )
    : null;

const webAssemblyMemoryBufferGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Memory ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Memory,
        "buffer"
      )
    : null;

const webAssemblyTableLengthGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Table ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Table,
        "length"
      )
    : null;

const webAssemblyGlobalValueGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Global ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Global,
        "value"
      )
    : null;

const webAssemblyTagProbeSentinel =
  objectFreeze({});

const webAssemblyExceptionConstructor =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Exception ===
    "function"
    ? WebAssembly.Exception
    : null;

const webAssemblyTagProbeValues =
  webAssemblyExceptionConstructor !== null
    ? new Proxy(
        [],
        {
          get(target, key) {
            if (key === "length") {
              throw webAssemblyTagProbeSentinel;
            }

            return target[key];
          }
        }
      )
    : null;

const webAssemblyProbeTag =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Tag === "function"
    ? new WebAssembly.Tag({
        parameters: []
      })
    : null;

const webAssemblyExceptionIs =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Exception ===
    "function"
    ? capturePrototypeMethod(
        WebAssembly.Exception,
        "is"
      )
    : null;

const vmScriptBasePrototype =
  typeof vm.Script === "function" &&
  vm.Script.prototype !== null &&
  typeof vm.Script.prototype ===
    "object"
    ? getPrototypeOf(
        vm.Script.prototype
      )
    : null;

const vmScriptCreateCachedData =
  captureMethodFromPrototype(
    vmScriptBasePrototype,
    "createCachedData"
  );

const asyncLocalStorageGetStore =
  capturePrototypeMethod(
    AsyncLocalStorage,
    "getStore"
  );

function methodRejectsOrdinaryReceiver(
  method
) {
  if (method === null) {
    return false;
  }

  try {
    reflectApply(
      method,
      {},
      []
    );

    return false;
  } catch {
    return true;
  }
}

const asyncLocalStorageGetStoreAuthenticatesReceiver =
  methodRejectsOrdinaryReceiver(
    asyncLocalStorageGetStore
  );

const messagePortHasRef =
  typeof workerThreads.MessagePort ===
    "function"
    ? capturePrototypeMethod(
        workerThreads.MessagePort,
        "hasRef"
      )
    : null;

function captureMessagePortCloneProbe() {
  if (
    typeof workerThreads.MessageChannel !==
      "function" ||
    typeof workerThreads.receiveMessageOnPort !==
      "function"
  ) {
    return null;
  }

  const postMessage =
    capturePrototypeMethod(
      workerThreads.MessagePort,
      "postMessage"
    );

  if (postMessage === null) {
    return null;
  }

  let channel;

  try {
    channel =
      new workerThreads.MessageChannel();

    if (
      typeof channel.port1.unref ===
        "function"
    ) {
      channel.port1.unref();
    }

    if (
      typeof channel.port2.unref ===
        "function"
    ) {
      channel.port2.unref();
    }
  } catch {
    return null;
  }

  return objectFreeze({
    postMessage,
    sendPort: channel.port1,
    receivePort: channel.port2,
    receiveMessageOnPort:
      workerThreads.receiveMessageOnPort
  });
}

const messagePortCloneProbe =
  captureMessagePortCloneProbe();

function hasUnsupportedHostBrand(
  value
) {
  for (
    const getter of
      trustedHostBrandGetters
  ) {
    try {
      reflectApply(
        getter,
        value,
        []
      );

      return true;
    } catch {}
  }

  for (
    const method of
      trustedHostBrandMethods
  ) {
    try {
      reflectApply(
        method,
        value,
        []
      );

      return true;
    } catch {}
  }

  return false;
}

function samePropertyDescriptor(
  left,
  right
) {
  if (
    left === undefined ||
    right === undefined
  ) {
    return left === right;
  }

  const leftKeys = ownKeys(left);
  const rightKeys = ownKeys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (
    let index = 0;
    index < leftKeys.length;
    index += 1
  ) {
    const key = leftKeys[index];
    let found = false;

    for (
      let rightIndex = 0;
      rightIndex < rightKeys.length;
      rightIndex += 1
    ) {
      if (rightKeys[rightIndex] === key) {
        found = true;
        break;
      }
    }

    if (
      !found ||
      !objectIs(left[key], right[key])
    ) {
      return false;
    }
  }

  return true;
}

function hostBrandAuthorityError() {
  return new Error(
    "Host brand probe authority is unavailable."
  );
}

function assertHostBrandAuthorityRestored(
  probe,
  expectedDescriptor
) {
  let currentDescriptor;

  try {
    currentDescriptor =
      getOwnPropertyDescriptor(
        probe.constructor,
        symbolHasInstance
      );
  } catch {
    throw hostBrandAuthorityError();
  }

  if (
    !samePropertyDescriptor(
      currentDescriptor,
      expectedDescriptor
    )
  ) {
    throw hostBrandAuthorityError();
  }
}

function probeAdditionalHostBrand(
  probe,
  value
) {
  try {
    reflectApply(
      probe.method,
      value,
      probe.args
    );

    return true;
  } catch {}

  let previousHasInstanceDescriptor;

  try {
    previousHasInstanceDescriptor =
      getOwnPropertyDescriptor(
        probe.constructor,
        symbolHasInstance
      );
  } catch {
    throw hostBrandAuthorityError();
  }

  if (
    previousHasInstanceDescriptor !==
      undefined &&
    !previousHasInstanceDescriptor.configurable
  ) {
    throw hostBrandAuthorityError();
  }

  let installed = false;

  try {
    defineProperty(
      probe.constructor,
      symbolHasInstance,
      {
        value(candidate) {
          return candidate === value;
        },
        configurable: true
      }
    );

    installed = true;

    try {
      reflectApply(
        probe.method,
        value,
        probe.args
      );

      return true;
    } catch {
      return false;
    }
  } catch {
    throw hostBrandAuthorityError();
  } finally {
    if (installed) {
      try {
        if (
          previousHasInstanceDescriptor ===
            undefined
        ) {
          if (
            !deleteProperty(
              probe.constructor,
              symbolHasInstance
            )
          ) {
            throw hostBrandAuthorityError();
          }
        } else {
          defineProperty(
            probe.constructor,
            symbolHasInstance,
            previousHasInstanceDescriptor
          );
        }
      } catch {
        throw hostBrandAuthorityError();
      }

      assertHostBrandAuthorityRestored(
        probe,
        previousHasInstanceDescriptor
      );
    }
  }
}

function hasUnsupportedAdditionalBrand(
  value
) {
  if (
    !additionalHostBrandMethodAuthorityAvailable ||
    !abortControllerBrandAuthorityAvailable ||
    !trustedModuleBrandAuthorityAvailable
  ) {
    throw hostBrandAuthorityError();
  }

  for (
    const probe of
      additionalHostBrandMethodProbes
  ) {
    if (
      probeAdditionalHostBrand(
        probe,
        value
      )
    ) {
      return true;
    }
  }

  if (
    webAssemblyExceptionConstructor !== null &&
    webAssemblyTagProbeValues !== null
  ) {
    try {
      reflectConstruct(
        webAssemblyExceptionConstructor,
        [
          value,
          webAssemblyTagProbeValues
        ]
      );

      return true;
    } catch (error) {
      if (
        error ===
          webAssemblyTagProbeSentinel
      ) {
        return true;
      }
    }
  }

  if (
    webAssemblyExceptionIs !== null &&
    webAssemblyProbeTag !== null
  ) {
    try {
      reflectApply(
        webAssemblyExceptionIs,
        value,
        [webAssemblyProbeTag]
      );

      return true;
    } catch {}
  }

  for (
    const getter of [
      webAssemblyMemoryBufferGetter,
      webAssemblyTableLengthGetter,
      webAssemblyGlobalValueGetter
    ]
  ) {
    if (getter === null) {
      continue;
    }

    try {
      reflectApply(
        getter,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (weakRefDeref !== null) {
    try {
      reflectApply(
        weakRefDeref,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (
    finalizationRegistryUnregister !==
      null
  ) {
    try {
      reflectApply(
        finalizationRegistryUnregister,
        value,
        [
          finalizationRegistryProbeToken
        ]
      );

      return true;
    } catch {}
  }

  for (
    const method of
      intlResolvedOptionMethods
  ) {
    try {
      reflectApply(
        method,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (
    intlLocaleBaseNameGetter !== null
  ) {
    try {
      reflectApply(
        intlLocaleBaseNameGetter,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (webAssemblyModuleExports !== null) {
    try {
      reflectApply(
        webAssemblyModuleExports,
        WebAssembly.Module,
        [value]
      );

      return true;
    } catch {}
  }

  if (
    webAssemblyInstanceExportsGetter !==
      null
  ) {
    try {
      reflectApply(
        webAssemblyInstanceExportsGetter,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (vmScriptCreateCachedData !== null) {
    try {
      reflectApply(
        vmScriptCreateCachedData,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (messagePortHasRef !== null) {
    try {
      reflectApply(
        messagePortHasRef,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (asyncLocalStorageGetStore !== null) {
    try {
      const store =
        reflectApply(
          asyncLocalStorageGetStore,
          value,
          []
        );

      if (
        asyncLocalStorageGetStoreAuthenticatesReceiver ||
        store !== undefined
      ) {
        return true;
      }
    } catch {}
  }

  return false;
}

function isStructuredCloneProbeSafe(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    utilTypePredicates.isProxy(value)
  ) {
    return false;
  }

  let descriptors;

  try {
    descriptors =
      getOwnPropertyDescriptors(
        value
      );
  } catch {
    return false;
  }

  for (
    const key of ownKeys(descriptors)
  ) {
    if (typeof key === "symbol") {
      return false;
    }

    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      return false;
    }

    const child =
      descriptor.value;

    if (
      typeof child === "function" ||
      typeof child === "symbol" ||
      (
        child !== null &&
        typeof child === "object"
      )
    ) {
      return false;
    }
  }

  return true;
}

function hasUncloneableStructuredCloneBrand(
  value
) {
  if (
    messagePortCloneProbe === null ||
    !isStructuredCloneProbeSafe(value)
  ) {
    return false;
  }

  try {
    reflectApply(
      messagePortCloneProbe.postMessage,
      messagePortCloneProbe.sendPort,
      [value]
    );

    reflectApply(
      messagePortCloneProbe.receiveMessageOnPort,
      undefined,
      [
        messagePortCloneProbe.receivePort
      ]
    );

    return false;
  } catch (error) {
    return (
      error !== null &&
      typeof error === "object" &&
      (
        error.name === "DataCloneError" ||
        error.name === "TypeError"
      )
    );
  }
}

function isUnsupportedRuntimeObject(
  value
) {
  return (
    (
      vmIsContext !== null &&
      reflectApply(
        vmIsContext,
        vm,
        [value]
      )
    ) ||
    utilTypePredicates.isAnyArrayBuffer(value) ||
    utilTypePredicates.isArrayBufferView(value) ||
    utilTypePredicates.isArgumentsObject(value) ||
    utilTypePredicates.isBoxedPrimitive(value) ||
    utilTypePredicates.isDate(value) ||
    utilTypePredicates.isGeneratorObject(value) ||
    utilTypePredicates.isMap(value) ||
    utilTypePredicates.isMapIterator(value) ||
    utilTypePredicates.isModuleNamespaceObject(value) ||
    utilTypePredicates.isNativeError(value) ||
    utilTypePredicates.isPromise(value) ||
    utilTypePredicates.isRegExp(value) ||
    utilTypePredicates.isSet(value) ||
    utilTypePredicates.isSetIterator(value) ||
    utilTypePredicates.isWeakMap(value) ||
    utilTypePredicates.isWeakSet(value) ||
    (
      typeof utilTypePredicates.isCryptoKey ===
        "function" &&
      utilTypePredicates.isCryptoKey(value)
    ) ||
    (
      typeof utilTypePredicates.isKeyObject ===
        "function" &&
      utilTypePredicates.isKeyObject(value)
    ) ||
    (
      typeof utilTypePredicates.isExternal ===
        "function" &&
      utilTypePredicates.isExternal(value)
    ) ||
    hasOpaqueNestedSymbolState(value) ||
    hasUnsupportedPerformanceObserverBrand(
      value
    ) ||
    hasUnsupportedHostSingleton(value) ||
    hasUnsupportedHostBrand(value) ||
    hasUnsupportedAdditionalBrand(value) ||
    hasUncloneableStructuredCloneBrand(value)
  );
}

function capturePlainObjectEntries(
  value,
  label
) {
  const prototype =
    getPrototypeOf(value);

  if (
    !isOrdinaryObjectPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must be a plain object.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  const entries = [];

  for (
    const key of ownKeys(descriptors)
  ) {
    if (typeof key === "symbol") {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must not contain accessor properties.`
      );
    }

    if (!descriptor.enumerable) {
      throw new Error(
        `${label} must not contain non-enumerable own properties.`
      );
    }

    entries.push({
      key,
      value:
        descriptor.value,
      label:
        `${label}.${key}`
    });
  }

  return entries;
}

function captureArrayEntries(
  value,
  label
) {
  const prototype =
    getPrototypeOf(value);

  if (
    !isOrdinaryArrayPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must be an ordinary array.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(value);

  const lengthDescriptor =
    descriptors.length;

  if (
    lengthDescriptor === undefined ||
    "get" in lengthDescriptor ||
    "set" in lengthDescriptor ||
    typeof lengthDescriptor.value !==
      "number" ||
    !numberIsInteger(
      lengthDescriptor.value
    ) ||
    lengthDescriptor.value < 0
  ) {
    throw new Error(
      `${label} must use an ordinary array length.`
    );
  }

  const length =
    lengthDescriptor.value;

  const indexedEntries = [];

  for (
    const key of ownKeys(descriptors)
  ) {
    if (key === "length") {
      continue;
    }

    if (typeof key === "symbol") {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

    if (!isArrayIndexKey(key)) {
      throw new Error(
        `${label} must contain indexed elements only.`
      );
    }

    const index =
      Number(key);

    if (index >= length) {
      throw new Error(
        `${label} contains an invalid array index.`
      );
    }

    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must not contain accessor properties.`
      );
    }

    if (!descriptor.enumerable) {
      throw new Error(
        `${label} must not contain non-enumerable array elements.`
      );
    }

    indexedEntries.push({
      index,
      value:
        descriptor.value
    });
  }

  if (
    indexedEntries.length !== length
  ) {
    throw new Error(
      `${label} must not be sparse.`
    );
  }

  indexedEntries.sort(
    (left, right) =>
      left.index - right.index
  );

  for (
    let expectedIndex = 0;
    expectedIndex <
      indexedEntries.length;
    expectedIndex += 1
  ) {
    if (
      indexedEntries[
        expectedIndex
      ].index !== expectedIndex
    ) {
      throw new Error(
        `${label} must not be sparse.`
      );
    }
  }

  return indexedEntries.map(
    (entry) => ({
      key:
        String(entry.index),
      value:
        entry.value,
      label:
        `${label}[${entry.index}]`
    })
  );
}

function prepareAiDataValue(
  value,
  label,
  active,
  memo
) {
  if (value === null) {
    return {
      value: null,
      frame: null
    };
  }

  const type =
    typeof value;

  if (
    type === "string" ||
    type === "boolean"
  ) {
    return {
      value,
      frame: null
    };
  }

  if (type === "number") {
    requireFiniteNumber(
      value,
      label
    );

    return {
      value:
        objectIs(value, -0)
          ? 0
          : value,
      frame: null
    };
  }

  if (type !== "object") {
    failUnsupportedType(
      value,
      label
    );
  }

  if (utilTypePredicates.isProxy(value)) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const directPrototype =
    getPrototypeOf(value);

  if (
    directPrototype !== null &&
    utilTypePredicates.isProxy(
      directPrototype
    )
  ) {
    throw new Error(
      `${label} must not use a Proxy prototype.`
    );
  }

  if (
    isUnsupportedRuntimeObject(value)
  ) {
    throw new Error(
      `${label} contains an unsupported runtime object.`
    );
  }

  if (active.has(value)) {
    throw new Error(
      `${label} must not contain cyclic references.`
    );
  }

  if (memo.has(value)) {
    return {
      value:
        memo.get(value),
      frame: null
    };
  }

  const isArray =
    arrayIsArray(value);

  const entries =
    isArray
      ? captureArrayEntries(
          value,
          label
        )
      : capturePlainObjectEntries(
          value,
          label
        );

  const sourcePrototype =
    isArray
      ? null
      : directPrototype;

  const target =
    isArray
      ? new ArrayConstructor(entries.length)
      : sourcePrototype === null
        ? objectCreate(null)
        : {};

  memo.set(
    value,
    target
  );

  active.add(value);

  return {
    value: target,
    frame: {
      source: value,
      target,
      entries,
      index: 0,
      active,
      memo
    }
  };
}

function cloneAiData(
  value,
  label = "AI data"
) {
  const active =
    new WeakSetConstructor();

  const memo =
    new WeakMapConstructor();

  const root =
    prepareAiDataValue(
      value,
      label,
      active,
      memo
    );

  if (root.frame === null) {
    return root.value;
  }

  const stack = [
    root.frame
  ];

  while (stack.length > 0) {
    const frame =
      stack[
        stack.length - 1
      ];

    if (
      frame.index >=
        frame.entries.length
    ) {
      frame.active.delete(
        frame.source
      );

      stack.pop();
      continue;
    }

    const entry =
      frame.entries[
        frame.index
      ];

    frame.index += 1;

    const child =
      prepareAiDataValue(
        entry.value,
        entry.label,
        frame.active,
        frame.memo
      );

    defineProperty(
      frame.target,
      entry.key,
      {
        value:
          child.value,
        enumerable: true,
        configurable: true,
        writable: true
      }
    );

    if (child.frame !== null) {
      stack.push(
        child.frame
      );
    }
  }

  return root.value;
}

function freezeAiData(
  value,
  label = "AI data"
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  const seen =
    new WeakSetConstructor();

  const stack = [
    {
      value,
      label
    }
  ];

  while (stack.length > 0) {
    const frame =
      stack.pop();

    const current =
      frame.value;

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    if (utilTypePredicates.isProxy(current)) {
      throw new Error(
        `${frame.label} must not be a Proxy.`
      );
    }

    if (
      isUnsupportedRuntimeObject(current)
    ) {
      throw new Error(
        `${frame.label} contains an unsupported runtime object.`
      );
    }

    const isArray =
      arrayIsArray(current);

    const entries =
      isArray
        ? captureArrayEntries(
            current,
            frame.label
          )
        : capturePlainObjectEntries(
            current,
            frame.label
          );

    seen.add(current);

    for (const entry of entries) {
      const child =
        entry.value;

      if (
        child !== null &&
        typeof child === "object" &&
        !seen.has(child)
      ) {
        stack.push({
          value: child,
          label:
            entry.label
        });
      }
    }

    objectFreeze(current);
  }

  return value;
}

function snapshotAiData(
  value,
  label = "AI data"
) {
  return freezeAiData(
    cloneAiData(
      value,
      label
    )
  );
}

module.exports = {
  cloneAiData,
  freezeAiData,
  snapshotAiData,
  isUnsupportedRuntimeObject
};
