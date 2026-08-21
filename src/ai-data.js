"use strict";

const {
  types: utilTypes
} = require("node:util");

const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;

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
function isUnsupportedRuntimeObject(
  value
) {
  return (
    utilTypes.isDate(value) ||
    utilTypes.isMap(value) ||
    utilTypes.isSet(value) ||
    utilTypes.isWeakMap(value) ||
    utilTypes.isWeakSet(value) ||
    utilTypes.isRegExp(value) ||
    utilTypes.isPromise(value) ||
    utilTypes.isNativeError(value) ||
    utilTypes.isArrayBuffer(value) ||
    utilTypes.isSharedArrayBuffer(value) ||
    utilTypes.isDataView(value) ||
    utilTypes.isTypedArray(value) ||
    utilTypes.isBoxedPrimitive(value)
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
  active
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

      active
    }
  };
}

function cloneAiData(
  value,
  label = "AI data"
) {
  const active =
    new WeakSet();

  const root =
    prepareAiDataValue(
      value,
      label,
      active
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
        frame.active
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
  value
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
    value
  ];

  while (
    stack.length > 0
  ) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !==
        "object" ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);

    if (
      Array.isArray(current)
    ) {
      for (
        let index = 0;
        index <
          current.length;
        index += 1
      ) {
        const child =
          current[index];

        if (
          child !== null &&
          typeof child ===
            "object" &&
          !seen.has(child)
        ) {
          stack.push(
            child
          );
        }
      }
    } else {
      for (
        const key of
          Object.keys(
            current
          )
      ) {
        const child =
          current[key];

        if (
          child !== null &&
          typeof child ===
            "object" &&
          !seen.has(child)
        ) {
          stack.push(
            child
          );
        }
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
