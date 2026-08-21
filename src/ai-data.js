"use strict";

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

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;

const getPrototypeOf =
  Object.getPrototypeOf;

const ownKeys =
  Reflect.ownKeys;

const defineProperty =
  Object.defineProperty;

const MAX_ARRAY_INDEX =
  2 ** 32 - 1;

function failUnsupportedType(
  value,
  label
) {
  const type =
    typeof value;

  if (
    type === "undefined"
  ) {
    throw new Error(
      `${label} must not contain undefined.`
    );
  }

  if (
    type === "function"
  ) {
    throw new Error(
      `${label} must not contain functions.`
    );
  }

  if (
    type === "symbol"
  ) {
    throw new Error(
      `${label} must not contain symbols.`
    );
  }

  if (
    type === "bigint"
  ) {
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
  if (
    !Number.isFinite(value)
  ) {
    throw new Error(
      `${label} must be a finite number.`
    );
  }
}

function isPlainObjectPrototype(
  prototype
) {
  return (
    prototype ===
      Object.prototype ||
    prototype === null
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
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric <
      MAX_ARRAY_INDEX &&
    String(numeric) === key
  );
}
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

function captureHostBrandGetter(
  constructorName,
  propertyName
) {
  const constructor =
    globalThis[constructorName];

  if (
    typeof constructor !==
      "function" ||
    constructor.prototype ===
      null ||
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
    typeof descriptor.get !==
      "function"
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
      // Wrong receivers fail native
      // brand checks without being
      // accepted as runtime objects.
    }
  }

  return false;
}

function isUnsupportedRuntimeObject(
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
function capturePlainObjectEntries(
  value,
  label
) {
  const prototype =
    getPrototypeOf(value);

  if (
    !isPlainObjectPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must be a plain object.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  const entries = [];

  for (
    const key of
      ownKeys(descriptors)
  ) {
    if (
      typeof key ===
        "symbol"
    ) {
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

    if (
      !descriptor.enumerable
    ) {
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
    prototype !==
      Array.prototype
  ) {
    throw new Error(
      `${label} must be an ordinary array.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  const lengthDescriptor =
    descriptors.length;

  if (
    lengthDescriptor ===
      undefined ||
    "get" in
      lengthDescriptor ||
    "set" in
      lengthDescriptor ||
    typeof lengthDescriptor
      .value !== "number" ||
    !Number.isInteger(
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
    const key of
      ownKeys(descriptors)
  ) {
    if (
      key === "length"
    ) {
      continue;
    }

    if (
      typeof key ===
        "symbol"
    ) {
      throw new Error(
        `${label} must not contain symbol-keyed properties.`
      );
    }

    if (
      !isArrayIndexKey(key)
    ) {
      throw new Error(
        `${label} must contain indexed elements only.`
      );
    }

    const index =
      Number(key);

    if (
      index >= length
    ) {
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

    if (
      !descriptor.enumerable
    ) {
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
    indexedEntries.length !==
      length
  ) {
    throw new Error(
      `${label} must not be sparse.`
    );
  }

  indexedEntries.sort(
    (left, right) =>
      left.index -
      right.index
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
      ].index !==
        expectedIndex
    ) {
      throw new Error(
        `${label} must not be sparse.`
      );
    }
  }

  return indexedEntries.map(
    (entry) => ({
      key:
        String(
          entry.index
        ),

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
  if (
    value === null
  ) {
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

  if (
    type === "number"
  ) {
    requireFiniteNumber(
      value,
      label
    );

    return {
      value:
        Object.is(
          value,
          -0
        )
          ? 0
          : value,

      frame: null
    };
  }

  if (
    type !== "object"
  ) {
    failUnsupportedType(
      value,
      label
    );
  }

  if (
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  if (
    isUnsupportedRuntimeObject(
      value
    )
  ) {
    throw new Error(
      `${label} contains an unsupported runtime object.`
    );
  }

  if (
    active.has(value)
  ) {
    throw new Error(
      `${label} must not contain cyclic references.`
    );
  }

  if (
    memo.has(value)
  ) {
    return {
      value:
        memo.get(value),
      frame: null
    };
  }

  const isArray =
    Array.isArray(value);

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

  const target =
    isArray
      ? new Array(
          entries.length
        )
      : {};

  memo.set(
    value,
    target
  );

  active.add(value);

  return {
    value:
      target,

    frame: {
      source:
        value,

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
    new WeakSet();

  const memo =
    new WeakMap();

  const root =
    prepareAiDataValue(
      value,
      label,
      active,
      memo
    );

  if (
    root.frame === null
  ) {
    return root.value;
  }

  const stack = [
    root.frame
  ];

  while (
    stack.length > 0
  ) {
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

    if (
      child.frame !== null
    ) {
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
    typeof value !==
      "object"
  ) {
    return value;
  }

  const seen =
    new WeakSet();

  const stack = [
    {
      value,
      label
    }
  ];

  while (
    stack.length > 0
  ) {
    const frame =
      stack.pop();

    const current =
      frame.value;

    if (
      current === null ||
      typeof current !==
        "object" ||
      seen.has(current)
    ) {
      continue;
    }

    if (
      utilTypes.isProxy(
        current
      )
    ) {
      throw new Error(
        `${frame.label} must not be a Proxy.`
      );
    }

    if (
      isUnsupportedRuntimeObject(
        current
      )
    ) {
      throw new Error(
        `${frame.label} contains an unsupported runtime object.`
      );
    }

    const isArray =
      Array.isArray(current);

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

    for (
      const entry of entries
    ) {
      const child =
        entry.value;

      if (
        child !== null &&
        typeof child ===
          "object" &&
        !seen.has(child)
      ) {
        stack.push({
          value:
            child,

          label:
            entry.label
        });
      }
    }

    Object.freeze(
      current
    );
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
  snapshotAiData
};
