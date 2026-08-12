const {
  types: utilTypes,
  inspect
} = require("node:util");

const {
  PerformanceObserver
} = require("node:perf_hooks");

const {
  locks: workerThreadLocks
} = require("node:worker_threads");

const functionToString =
  Function.prototype.toString;

const promiseThen =
  Promise.prototype.then;

const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;

const isExtensible =
  Object.isExtensible;

const defineProperty =
  Object.defineProperty;

const deleteProperty =
  Reflect.deleteProperty;

const safePromiseSpecies =
  Object.freeze({
    [Symbol.species]: Promise
  });

const callbackReceiver =
  Object.freeze(
    Object.create(null)
  );

function captureNavigatorLocks() {
  try {
    if (
      globalThis.navigator ===
        undefined ||
      globalThis.navigator ===
        null
    ) {
      return null;
    }

    const locks =
      globalThis.navigator.locks;

    return (
      locks !== null &&
      typeof locks === "object"
    )
      ? locks
      : null;
  } catch {
    return null;
  }
}

const navigatorLocks =
  captureNavigatorLocks();

const unsupportedHostSingletons =
  Object.freeze(
    [
      workerThreadLocks,
      navigatorLocks
    ].filter(
      (value, index, values) =>
        value !== undefined &&
        value !== null &&
        values.indexOf(value) ===
          index
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

const SCORE_KEYS = [
  "severity",
  "realism",
  "subtlety",
  "novelty",
  "fixability"
];

function requireNonEmptyString(
  value,
  label
) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }
}

function requireScore(
  value,
  label
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${label} must be a number between 0 and 1.`
    );
  }
}

function isPromiseLike(
  value
) {
  if (
    utilTypes.isPromise(value)
  ) {
    return true;
  }

  if (
    value === null ||
    (
      typeof value !== "object" &&
      typeof value !== "function"
    )
  ) {
    return false;
  }

  // Do not perform reflection through
  // user-controlled Proxy traps.
  if (
    utilTypes.isProxy(value)
  ) {
    return false;
  }

  const thenDescriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        value,
        "then"
      ]
    );

  if (
    thenDescriptor !== undefined
  ) {
    // Own accessor-based values belong to
    // the unsupported deterministic-data
    // path. Never invoke the getter here;
    // clone validation will reject it.
    if (
      "get" in thenDescriptor ||
      "set" in thenDescriptor
    ) {
      return false;
    }

    return (
      typeof thenDescriptor.value ===
      "function"
    );
  }

  const inheritedThenDescriptor =
    getInheritedThenDescriptor(
      value
    );

  if (
    inheritedThenDescriptor ===
      undefined
  ) {
    return false;
  }

  // An inherited accessor named `then`
  // is unsupported too. Treat it as
  // promise-like so mutation results are
  // rejected without invoking the getter.
  if (
    "get" in inheritedThenDescriptor ||
    "set" in inheritedThenDescriptor
  ) {
    return true;
  }

  return (
    typeof inheritedThenDescriptor
      .value === "function"
  );
}

function getInheritedThenDescriptor(
  value
) {
  let prototype =
    Object.getPrototypeOf(
      value
    );

  const maxDepth =
    Array.isArray(value)
      ? 2
      : 1;

  for (
    let depth = 0;
    prototype !== null &&
    depth < maxDepth;
    depth += 1
  ) {
    if (
      utilTypes.isProxy(
        prototype
      )
    ) {
      return undefined;
    }

    const descriptor =
      Reflect.apply(
        getOwnPropertyDescriptor,
        Object,
        [
          prototype,
          "then"
        ]
      );

    if (
      descriptor !== undefined
    ) {
      return descriptor;
    }

    prototype =
      Object.getPrototypeOf(
        prototype
      );
  }

  return undefined;
}

function getCallbackSource(
  fn
) {
  try {
    return Reflect.apply(
      functionToString,
      fn,
      []
    );
  } catch {
    return null;
  }
}

function isNativeCallbackSource(
  source
) {
  if (source === null) {
    return true;
  }

  return (
    /^function(?:\s+[^()]*)?\s*\([^)]*\)\s*\{\s*\[native code\]\s*\}$/
      .test(source.trim())
  );
}

function isOrdinaryArrayPrototype(
  prototype
) {
  if (
    !Array.isArray(prototype) ||
    utilTypes.isProxy(prototype)
  ) {
    return false;
  }

  const constructorDescriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        prototype,
        "constructor"
      ]
    );

  if (
    constructorDescriptor ===
      undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    typeof constructorDescriptor
      .value !== "function" ||
    utilTypes.isProxy(
      constructorDescriptor.value
    )
  ) {
    return false;
  }

  const constructor =
    constructorDescriptor.value;

  const prototypeDescriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        constructor,
        "prototype"
      ]
    );

  if (
    prototypeDescriptor ===
      undefined ||
    "get" in prototypeDescriptor ||
    "set" in prototypeDescriptor ||
    prototypeDescriptor.value !==
      prototype
  ) {
    return false;
  }

  const source =
    getCallbackSource(
      constructor
    );

  return (
    typeof source === "string" &&
    /^function\s+Array\s*\(\s*\)\s*\{\s*\[native code\]\s*\}$/
      .test(source.trim())
  );
}

function isOrdinaryObjectPrototype(
  prototype
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypes.isProxy(prototype)
  ) {
    return false;
  }

  const constructorDescriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        prototype,
        "constructor"
      ]
    );

  if (
    constructorDescriptor ===
      undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    typeof constructorDescriptor
      .value !== "function" ||
    utilTypes.isProxy(
      constructorDescriptor.value
    )
  ) {
    return false;
  }

  const constructor =
    constructorDescriptor.value;

  const prototypeDescriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        constructor,
        "prototype"
      ]
    );

  if (
    prototypeDescriptor ===
      undefined ||
    "get" in prototypeDescriptor ||
    "set" in prototypeDescriptor ||
    prototypeDescriptor.value !==
      prototype
  ) {
    return false;
  }

  const source =
    getCallbackSource(
      constructor
    );

  return (
    typeof source === "string" &&
    /^function\s+Object\s*\(\s*\)\s*\{\s*\[native code\]\s*\}$/
      .test(source.trim())
  );
}

function skipJavaScriptSeparators(
  source,
  startIndex
) {
  let index = startIndex;

  while (index < source.length) {
    if (
      /\s/.test(
        source[index]
      )
    ) {
      index += 1;
      continue;
    }

    if (
      source.startsWith(
        "/*",
        index
      )
    ) {
      const end =
        source.indexOf(
          "*/",
          index + 2
        );

      if (end === -1) {
        return source.length;
      }

      index = end + 2;
      continue;
    }

    if (
      source.startsWith(
        "//",
        index
      )
    ) {
      const end =
        source.indexOf(
          "\n",
          index + 2
        );

      if (end === -1) {
        return source.length;
      }

      index = end + 1;
      continue;
    }

    break;
  }

  return index;
}

function isClassConstructorSource(
  source
) {
  if (
    typeof source !== "string"
  ) {
    return false;
  }

  const trimmed =
    source.trimStart();

  if (
    !trimmed.startsWith(
      "class"
    )
  ) {
    return false;
  }

  const afterKeyword =
    trimmed[5];

  // Ordinary object method:
  // class() {}
  if (
    afterKeyword === "("
  ) {
    return false;
  }

  // Anonymous class:
  // class {}
  if (
    afterKeyword === "{"
  ) {
    return true;
  }

  // Do not confuse identifiers such as
  // className() with the class keyword.
  if (
    afterKeyword !== undefined &&
    !/\s/.test(
      afterKeyword
    ) &&
    !trimmed.startsWith(
      "/*",
      5
    ) &&
    !trimmed.startsWith(
      "//",
      5
    )
  ) {
    return false;
  }

  const nextTokenIndex =
    skipJavaScriptSeparators(
      trimmed,
      5
    );

  // class /**/ Callback {}
  //        -> class constructor
  //
  // class /**/ () {}
  //        -> ordinary method named class
  return (
    trimmed[nextTokenIndex] !==
      "("
  );
}

function requireSyncCallback(
  fn,
  asyncMessage,
  generatorMessage,
  wrapperMessage,
  classMessage
) {
  if (
    utilTypes.isAsyncFunction(fn)
  ) {
    throw new Error(
      asyncMessage
    );
  }

  if (
    utilTypes.isGeneratorFunction(
      fn
    )
  ) {
    throw new Error(
      generatorMessage
    );
  }

  const source =
    getCallbackSource(fn);

  if (
    isClassConstructorSource(
      source
    )
  ) {
    throw new Error(
      classMessage
    );
  }

  // Bound functions, callable proxies,
  // and native functions have the exact
  // native-function representation.
  if (
    isNativeCallbackSource(
      source
    )
  ) {
    throw new Error(
      wrapperMessage
    );
  }
}

function consumeNativePromiseRejection(
  value
) {
  const originalConstructor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        value,
        "constructor"
      ]
    );

  let constructorShadowed =
    false;

  try {
    const canShadowConstructor =
      originalConstructor ===
        undefined
        ? Reflect.apply(
            isExtensible,
            Object,
            [
              value
            ]
          )
        : originalConstructor
            .configurable;

    if (
      canShadowConstructor
    ) {
      Reflect.apply(
        defineProperty,
        Object,
        [
          value,
          "constructor",
          {
            value:
              safePromiseSpecies,
            configurable: true,
            enumerable: false,
            writable: false
          }
        ]
      );

      constructorShadowed =
        true;
    }

    Reflect.apply(
      promiseThen,
      value,
      [
        undefined,
        () => {}
      ]
    );
  } finally {
    if (
      constructorShadowed
    ) {
      if (
        originalConstructor ===
          undefined
      ) {
        Reflect.apply(
          deleteProperty,
          Reflect,
          [
            value,
            "constructor"
          ]
        );
      } else {
        Reflect.apply(
          defineProperty,
          Object,
          [
            value,
            "constructor",
            originalConstructor
          ]
        );
      }
    }
  }
}

function consumePromiseRejection(
  value
) {
  if (
    utilTypes.isPromise(value)
  ) {
    consumeNativePromiseRejection(
      value
    );
  }

  // Non-native thenables are rejected
  // without invoking their `then`.
}

function rejectPromiseLike(
  value,
  message
) {
  if (!isPromiseLike(value)) {
    return value;
  }

  consumePromiseRejection(
    value
  );

  throw new Error(message);
}

function captureHostBrandGetter(
  constructorName,
  propertyName
) {
  const constructor =
    globalThis[constructorName];

  if (
    typeof constructor !== "function" ||
    constructor.prototype === null ||
    typeof constructor.prototype !==
      "object"
  ) {
    return null;
  }

  const descriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        constructor.prototype,
        propertyName
      ]
    );

  if (
    descriptor === undefined ||
    typeof descriptor.get !== "function"
  ) {
    return null;
  }

  return descriptor.get;
}

function capturePerformanceObserverBrandProbe() {
  if (
    typeof PerformanceObserver !==
      "function" ||
    PerformanceObserver.prototype ===
      null ||
    typeof PerformanceObserver
      .prototype !== "object"
  ) {
    return null;
  }

  const descriptor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        PerformanceObserver.prototype,
        inspect.custom
      ]
    );

  if (
    descriptor === undefined ||
    typeof descriptor.value !==
      "function"
  ) {
    return null;
  }

  return descriptor.value;
}

const performanceObserverBrandProbe =
  capturePerformanceObserverBrandProbe();

const performanceObserverInspectOptions =
  Object.freeze({
    depth: 0
  });

function hasUnsupportedPerformanceObserverBrand(
  value
) {
  if (
    performanceObserverBrandProbe ===
      null
  ) {
    return false;
  }

  try {
    Reflect.apply(
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

const HOST_BRAND_GETTER_SPECS =
  Object.freeze([
    [
      "Crypto",
      "subtle"
    ],
    [
      "Navigator",
      "userAgent"
    ],
    [
      "AbortController",
      "signal"
    ],
    [
      "AbortSignal",
      "aborted"
    ],
    [
      "TextEncoder",
      "encoding"
    ],
    [
      "TextDecoder",
      "encoding"
    ],
    [
      "URL",
      "href"
    ],
    [
      "URLSearchParams",
      "size"
    ],
    [
      "Blob",
      "size"
    ],
    [
      "File",
      "name"
    ],
    [
      "Request",
      "url"
    ],
    [
      "Response",
      "status"
    ],
    [
      "ReadableStream",
      "locked"
    ],
    [
      "WritableStream",
      "locked"
    ],
    [
      "TransformStream",
      "readable"
    ],
    [
      "TextEncoderStream",
      "readable"
    ],
    [
      "TextDecoderStream",
      "readable"
    ],
    [
      "CompressionStream",
      "readable"
    ],
    [
      "DecompressionStream",
      "readable"
    ],
    [
      "CountQueuingStrategy",
      "highWaterMark"
    ],
    [
      "ByteLengthQueuingStrategy",
      "highWaterMark"
    ]
  ]);

const unsupportedHostBrandGetters =
  Object.freeze(
    HOST_BRAND_GETTER_SPECS
      .map(
        ([
          constructorName,
          propertyName
        ]) =>
          captureHostBrandGetter(
            constructorName,
            propertyName
          )
      )
      .filter(
        (getter) =>
          getter !== null
      )
  );

function hasUnsupportedHostBrand(
  value
) {
  for (
    const getter of
      unsupportedHostBrandGetters
  ) {
    try {
      Reflect.apply(
        getter,
        value,
        []
      );

      return true;
    } catch {
      // Native Web/host getters throw
      // when the receiver does not carry
      // their required internal brand.
    }
  }

  return false;
}

function hasUnsupportedIntrinsicBrand(
  value
) {
  return (
    utilTypes.isAnyArrayBuffer(
      value
    ) ||
    utilTypes.isArrayBufferView(
      value
    ) ||
    utilTypes.isArgumentsObject(
      value
    ) ||
    utilTypes.isBoxedPrimitive(
      value
    ) ||
    utilTypes.isDate(
      value
    ) ||
    utilTypes.isGeneratorObject(
      value
    ) ||
    utilTypes.isMap(
      value
    ) ||
    utilTypes.isMapIterator(
      value
    ) ||
    utilTypes.isModuleNamespaceObject(
      value
    ) ||
    utilTypes.isNativeError(
      value
    ) ||
    utilTypes.isPromise(
      value
    ) ||
    utilTypes.isRegExp(
      value
    ) ||
    utilTypes.isSet(
      value
    ) ||
    utilTypes.isSetIterator(
      value
    ) ||
    utilTypes.isWeakMap(
      value
    ) ||
    utilTypes.isWeakSet(
      value
    ) ||
    (
      typeof utilTypes.isCryptoKey ===
        "function" &&
      utilTypes.isCryptoKey(
        value
      )
    ) ||
    (
      typeof utilTypes.isKeyObject ===
        "function" &&
      utilTypes.isKeyObject(
        value
      )
    ) ||
    (
      typeof utilTypes.isExternal ===
        "function" &&
      utilTypes.isExternal(
        value
      )
    ) ||
    hasUnsupportedPerformanceObserverBrand(
      value
    ) ||
    hasUnsupportedHostSingleton(
      value
    ) ||
    hasUnsupportedHostBrand(
      value
    )
  );
}

function validateMutationValue(
  value,
  label,
  seen = new WeakSet()
) {
  if (value === null) {
    return;
  }

  const valueType =
    typeof value;

  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean" ||
    valueType === "undefined" ||
    valueType === "bigint"
  ) {
    return;
  }

  if (valueType !== "object") {
    throw new Error(
      `${label} must use only primitives, ordinary arrays, and plain objects.`
    );
  }

  if (
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      `${label} must not contain Proxy values.`
    );
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (
    utilTypes.isSharedArrayBuffer(
      value
    )
  ) {
    throw new Error(
      `${label} must not contain SharedArrayBuffer values.`
    );
  }

  if (
    typeof Buffer !== "undefined" &&
    Buffer.isBuffer(value)
  ) {
    throw new Error(
      `${label} must not contain Buffer values.`
    );
  }

  if (
    hasUnsupportedIntrinsicBrand(
      value
    )
  ) {
    throw new Error(
      `${label} must use only primitives, ordinary arrays, and plain objects.`
    );
  }

  const isArray =
    Array.isArray(value);

  const prototype =
    Object.getPrototypeOf(value);

  if (isArray) {
    // Accept only a realm's genuine
    // native Array.prototype. Arbitrary
    // arrays used as prototypes would be
    // normalized away by structuredClone.
    if (
      !isOrdinaryArrayPrototype(
        prototype
      )
    ) {
      throw new Error(
        `${label} must use ordinary arrays, not array subclasses or custom array prototypes.`
      );
    }
  } else if (
    !isOrdinaryObjectPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must use only primitives, ordinary arrays, and plain objects.`
    );
  }

  if (
    getInheritedThenDescriptor(
      value
    ) !== undefined
  ) {
    throw new Error(
      `${label} must not inherit then properties.`
    );
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(
      value
    );

  const valueIsFrozen =
    Object.isFrozen(value);

  for (
    const key of
      Reflect.ownKeys(descriptors)
  ) {
    const descriptor =
      descriptors[key];

    if (
      isArray &&
      key === "length"
    ) {
      const isDataProperty =
        !("get" in descriptor) &&
        !("set" in descriptor);

      const isOrdinaryArrayLength =
        isDataProperty &&
        !descriptor.enumerable &&
        !descriptor.configurable &&
        descriptor.writable;

      const isFrozenArrayLength =
        isDataProperty &&
        !descriptor.enumerable &&
        !descriptor.configurable &&
        !descriptor.writable &&
        valueIsFrozen;

      if (
        !isOrdinaryArrayLength &&
        !isFrozenArrayLength
      ) {
        throw new Error(
          `${label} array length must use ordinary writable semantics unless the entire array is frozen.`
        );
      }

      continue;
    }

    if (typeof key === "symbol") {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must not contain accessor properties.`
      );
    }

    const isOrdinaryProperty =
      descriptor.enumerable &&
      descriptor.configurable &&
      descriptor.writable;

    const isFrozenProperty =
      descriptor.enumerable &&
      valueIsFrozen &&
      !descriptor.configurable &&
      !descriptor.writable;

    if (
      !isOrdinaryProperty &&
      !isFrozenProperty
    ) {
      throw new Error(
        `${label} properties must use ordinary or frozen data-property descriptors.`
      );
    }

    validateMutationValue(
      descriptor.value,
      `${label}.${String(key)}`,
      seen
    );
  }
}

function cloneMutationValue(
  value,
  label = "Mutation value"
) {
  validateMutationValue(
    value,
    label
  );

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (
    typeof structuredClone !==
    "function"
  ) {
    throw new Error(
      "Mutable mutation outputs require structuredClone support."
    );
  }

  try {
    const cloned =
      structuredClone(value);

    validateMutationValue(
      cloned,
      `${label} clone`
    );

    return cloned;
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes(
          "must use only primitives"
        ) ||
        error.message.includes(
          "must not contain"
        ) ||
        error.message.includes(
          "ordinary"
        )
      )
    ) {
      throw error;
    }

    throw new Error(
      `${label} must be safely cloneable plain structured data.`
    );
  }
}

function freezeMutationValue(
  value,
  seen = new WeakSet()
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  Object.keys(value).forEach(
    (key) => {
      freezeMutationValue(
        value[key],
        seen
      );
    }
  );

  return Object.freeze(value);
}

// Trust boundary:
//
// Mutation Pack treats pack metadata and mutation
// values as untrusted data and validates them before
// mutation execution.
//
// mutate, protection.check, and evaluators are trusted
// local synchronous JavaScript callbacks, not sandboxed
// code. They must not mutate process/global/prototype
// state.
//
// Returning a Promise or thenable violates the
// synchronous callback contract. Rejection cleanup is
// defensive best-effort for ordinary native Promises,
// not a security boundary for adversarial Promise
// prototype/species poisoning.

function captureMetadataDescriptors(
  value,
  label,
  shapeMessage
) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      shapeMessage
    );
  }

  if (
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const descriptors =
    Object.getOwnPropertyDescriptors(
      value
    );

  for (
    const key of
      Reflect.ownKeys(descriptors)
  ) {
    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${label} must use data properties only.`
      );
    }
  }

  return descriptors;
}

function readMetadataValue(
  descriptors,
  key
) {
  const descriptor =
    descriptors[key];

  if (descriptor === undefined) {
    return undefined;
  }

  return descriptor.value;
}

function captureMutation(
  mutation,
  index,
  ids
) {
  const label =
    `Mutation at index ${index}`;

  const mutationDescriptors =
    captureMetadataDescriptors(
      mutation,
      label,
      `${label} must be an object.`
    );

  // Capture every public field from its
  // data-property descriptor exactly once.
  const id =
    readMetadataValue(
      mutationDescriptors,
      "id"
    );

  const type =
    readMetadataValue(
      mutationDescriptors,
      "type"
    );

  const description =
    readMetadataValue(
      mutationDescriptors,
      "description"
    );

  const mutate =
    readMetadataValue(
      mutationDescriptors,
      "mutate"
    );

  const scores =
    readMetadataValue(
      mutationDescriptors,
      "scores"
    );

  const protection =
    readMetadataValue(
      mutationDescriptors,
      "protection"
    );

  requireNonEmptyString(
    id,
    `${label} id`
  );

  if (ids.has(id)) {
    throw new Error(
      `Duplicate mutation id: ${id}`
    );
  }

  ids.add(id);

  requireNonEmptyString(
    type,
    `${label} type`
  );

  requireNonEmptyString(
    description,
    `${label} description`
  );

  if (
    typeof mutate !== "function"
  ) {
    throw new Error(
      `${label} mutate must be a function.`
    );
  }

  requireSyncCallback(
    mutate,
    "Async mutation functions are not supported by this deterministic compiler.",
    "Generator mutation functions are not supported by this deterministic compiler.",
    "Bound, proxied, or native mutation callbacks are not supported by this deterministic compiler.",
    "Class constructors cannot be used as mutation callbacks in this deterministic compiler."
  );

  const scoreDescriptors =
    captureMetadataDescriptors(
      scores,
      `${label} scores`,
      `${label} scores must be an object.`
    );

  const capturedScores = {};

  SCORE_KEYS.forEach(
    (scoreKey) => {
      const score =
        readMetadataValue(
          scoreDescriptors,
          scoreKey
        );

      requireScore(
        score,
        `${label} ${scoreKey}`
      );

      capturedScores[scoreKey] =
        score;
    }
  );

  const protectionDescriptors =
    captureMetadataDescriptors(
      protection,
      `${label} protection`,
      `${label} protection must be an object.`
    );

  const protectionDescription =
    readMetadataValue(
      protectionDescriptors,
      "description"
    );

  const protectionCheck =
    readMetadataValue(
      protectionDescriptors,
      "check"
    );

  requireNonEmptyString(
    protectionDescription,
    `${label} protection description`
  );

  if (
    typeof protectionCheck !==
    "function"
  ) {
    throw new Error(
      `${label} protection check must be a function.`
    );
  }

  requireSyncCallback(
    protectionCheck,
    "Async protection checks are not supported by this deterministic compiler.",
    "Generator protection checks are not supported by this deterministic compiler.",
    "Bound, proxied, or native protection callbacks are not supported by this deterministic compiler.",
    "Class constructors cannot be used as protection callbacks in this deterministic compiler."
  );

  return {
    id,
    type,
    description,
    mutate,

    scores: capturedScores,

    protection: {
      description:
        protectionDescription,
      check: protectionCheck
    }
  };
}

function compileMutationPack(
  options = {}
) {
  const optionDescriptors =
    captureMetadataDescriptors(
      options,
      "Mutation Pack options",
      "Mutation Pack options must be an object."
    );

  const output =
    readMetadataValue(
      optionDescriptors,
      "output"
    );

  const pack =
    readMetadataValue(
      optionDescriptors,
      "pack"
    );
  if (
    utilTypes.isProxy(pack)
  ) {
    throw new Error(
      "Mutation pack must not be a Proxy."
    );
  }

  if (!Array.isArray(pack)) {
    throw new Error(
      "Mutation pack must be an array."
    );
  }

  const sourceOutputSnapshot =
    cloneMutationValue(
      output,
      "Source output"
    );

  const packLength = pack.length;
  const packEntries = [];

  // Snapshot the pack entries before
  // reading mutation metadata.
  for (
    let index = 0;
    index < packLength;
    index += 1
  ) {
    const entryDescriptor =
      Object.getOwnPropertyDescriptor(
        pack,
        index
      );

    if (
      entryDescriptor === undefined
    ) {
      throw new Error(
        `Mutation at index ${index} must be present.`
      );
    }

    if (
      "get" in entryDescriptor ||
      "set" in entryDescriptor
    ) {
      throw new Error(
        `Mutation at index ${index} must be stored as a data property.`
      );
    }

    packEntries.push(
      entryDescriptor.value
    );
  }

  const ids = new Set();

  // Capture and validate the exact
  // values that compilation will use.
  const validatedMutations =
    packEntries.map(
      (mutation, index) =>
        captureMutation(
          mutation,
          index,
          ids
        )
    );

  return validatedMutations.map(
    (mutation) => {
      const id = mutation.id;
      const type = mutation.type;
      const description =
        mutation.description;
      const mutate =
        mutation.mutate;

      const severity =
        mutation.scores.severity;
      const realism =
        mutation.scores.realism;
      const subtlety =
        mutation.scores.subtlety;
      const novelty =
        mutation.scores.novelty;
      const fixability =
        mutation.scores.fixability;

      const protectionDescription =
        mutation.protection
          .description;

      const protectionCheck =
        mutation.protection.check;

      const mutationInput =
        cloneMutationValue(
          sourceOutputSnapshot,
          "Mutation input"
        );

      const mutationResult =
        rejectPromiseLike(
          Reflect.apply(
            mutate,
            callbackReceiver,
            [
              mutationInput
            ]
          ),
          "Async mutation functions are not supported by this deterministic compiler."
        );

      // Isolate the returned value too.
      // A callback may return a shared
      // mutable object unrelated to input.
      const mutatedOutput =
        cloneMutationValue(
          mutationResult,
          `Mutation ${mutation.id} output`
        );

      return {
        id,
        type,
        description,

        output:
          freezeMutationValue(
            mutatedOutput
          ),

        severity,
        realism,
        subtlety,
        novelty,
        fixability,

        protection:
          protectionDescription,

        protectionCheck(
          candidateOutput
        ) {
          const protectionInput =
            cloneMutationValue(
              candidateOutput,
              "Protection input"
            );

          const protectionResult =
            rejectPromiseLike(
              Reflect.apply(
                protectionCheck,
                callbackReceiver,
                [
                  protectionInput
                ]
              ),
              "Async protection checks are not supported by this deterministic compiler."
            );

          if (
            typeof protectionResult !==
              "boolean"
          ) {
            throw new Error(
              "Protection check must return a boolean."
            );
          }

          return protectionResult;
        }
      };
    }
  );
}

module.exports = {
  compileMutationPack
};
