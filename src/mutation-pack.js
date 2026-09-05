const runtimeAuthority = require("./runtime-authority");

const functionToString =
  runtimeAuthority.consumerPrimordials.functionToString;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getPrototypeOf = Object.getPrototypeOf;
const isExtensible = Object.isExtensible;
const defineProperty = Object.defineProperty;
const deleteProperty = Reflect.deleteProperty;
const ownKeys = Reflect.ownKeys;

const promiseThen =
  runtimeAuthority.promiseAuthorityAvailable
    ? runtimeAuthority.promiseThen
    : null;
const promiseConstructor =
  runtimeAuthority.promiseAuthorityAvailable
    ? runtimeAuthority.promiseConstructor
    : null;
const promiseSpecies = runtimeAuthority.promiseSpecies;
const asyncFunctionProbe = runtimeAuthority.isAsyncFunction;
const generatorFunctionProbe = runtimeAuthority.isGeneratorFunction;
const objectPrototype = Object.prototype;

const safePromiseSpecies = Object.freeze({
  [promiseSpecies]: null
});

const callbackReceiver = Object.freeze(Object.create(null));
const SCORE_KEYS = [
  "severity",
  "realism",
  "subtlety",
  "novelty",
  "fixability"
];

// Mutation Pack accepts canonical data, not arbitrary JavaScript runtime state.
//
// Supported values:
// - primitives
// - ordinary arrays
// - ordinary plain objects
// - cycles/shared references composed from those values
//
// Meaning comes from OWN enumerable data properties only.
//
// Prototype state, extensibility/frozen state, descriptor flags,
// hidden host slots, and custom runtime identity are intentionally
// outside the Mutation Pack data model.
//
// mutate() and protection.check() are trusted local synchronous
// callbacks. They must be deterministic and must not mutate
// process/global/prototype state.
//
// Mutation Pack is not a JavaScript sandbox.

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

function getCallbackSource(fn) {
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

function isNativeCallbackSource(source) {
  if (source === null) {
    return true;
  }

  return (
    /^function(?:\s+[^()]*)?\s*\([^)]*\)\s*\{\s*\[native code\]\s*\}$/
      .test(source.trim())
  );
}

function requireSyncCallback(
  fn,
  asyncMessage,
  generatorMessage,
  wrapperMessage
) {
  if (
    asyncFunctionProbe(fn)
  ) {
    throw new Error(
      asyncMessage
    );
  }

  if (
    generatorFunctionProbe(fn)
  ) {
    throw new Error(
      generatorMessage
    );
  }

  if (
    isNativeCallbackSource(
      getCallbackSource(fn)
    )
  ) {
    throw new Error(
      wrapperMessage
    );
  }
}

function constructorUsesSafeDefaultSpecies(constructor) {
  if (constructor === undefined) return true;
  if (constructor === promiseConstructor) {
    return runtimeAuthority.hasTrustedLocalPromiseSpecies(
      constructor,
      promiseSpecies
    );
  }
  const objectConstructorDescriptor = Reflect.apply(
    getOwnPropertyDescriptor,
    Object,
    [objectPrototype, "constructor"]
  );
  const objectConstructor = (
    objectConstructorDescriptor !== undefined &&
    !("get" in objectConstructorDescriptor) &&
    !("set" in objectConstructorDescriptor)
  ) ? objectConstructorDescriptor.value : null;
  if (
    constructor !== objectConstructor ||
    typeof constructor !== "function" ||
    runtimeAuthority.isProxy(constructor)
  ) return false;
  const speciesDescriptor = Reflect.apply(
    getOwnPropertyDescriptor,
    Object,
    [constructor, promiseSpecies]
  );
  return speciesDescriptor === undefined;
}

function withSafeInheritedPromiseConstructor(
  value,
  callback
) {
  let prototype = getPrototypeOf(value);
  while (prototype !== null) {
    if (runtimeAuthority.isProxy(prototype)) return false;
    const descriptor = Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [prototype, "constructor"]
    );
    if (descriptor === undefined) {
      prototype = getPrototypeOf(prototype);
      continue;
    }
    if ("get" in descriptor || "set" in descriptor) return false;
    if (constructorUsesSafeDefaultSpecies(descriptor.value)) {
      callback();
      return true;
    }
    if (descriptor.configurable !== true) return false;
    Reflect.apply(
      defineProperty,
      Object,
      [
        prototype,
        "constructor",
        {
          value: safePromiseSpecies,
          writable: true,
          enumerable: descriptor.enumerable,
          configurable: true
        }
      ]
    );
    try {
      callback();
      return true;
    } finally {
      Reflect.apply(
        defineProperty,
        Object,
        [prototype, "constructor", descriptor]
      );
    }
  }
  callback();
  return true;
}

function consumeNativePromiseRejection(
  value
) {
  if (typeof promiseThen !== "function") return false;

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
    } else {
      return withSafeInheritedPromiseConstructor(
        value,
        () => Reflect.apply(
          promiseThen,
          value,
          [
            undefined,
            () => {}
          ]
        )
      );
    }

    Reflect.apply(
      promiseThen,
      value,
      [
        undefined,
        () => {}
      ]
    );
    return true;
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

function rejectNativePromiseResult(
  value,
  message
) {
  if (
    !runtimeAuthority.isPromise(value)
  ) {
    return value;
  }

  if (typeof promiseThen === "function") {
    consumeNativePromiseRejection(
      value
    );
  }

  throw new Error(
    message
  );
}

function isOrdinaryObjectPrototype(
  prototype
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    runtimeAuthority.isProxy(prototype)
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
    "get" in
      constructorDescriptor ||
    "set" in
      constructorDescriptor ||
    typeof constructorDescriptor
      .value !== "function" ||
    runtimeAuthority.isProxy(
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
    "get" in
      prototypeDescriptor ||
    "set" in
      prototypeDescriptor ||
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

function isOrdinaryArrayPrototype(
  prototype
) {
  if (
    !runtimeAuthority.arrayIsArray(prototype) ||
    runtimeAuthority.isProxy(prototype)
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
    "get" in
      constructorDescriptor ||
    "set" in
      constructorDescriptor ||
    typeof constructorDescriptor
      .value !== "function" ||
    runtimeAuthority.isProxy(
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
    "get" in
      prototypeDescriptor ||
    "set" in
      prototypeDescriptor ||
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

function createCanonicalState() {
  return {
    seen:
      new WeakMap(),

    approvedObjectPrototypes:
      new WeakSet(),

    approvedArrayPrototypes:
      new WeakSet()
  };
}

function requireOrdinaryObjectPrototype(
  prototype,
  state,
  label
) {
  if (
    state
      .approvedObjectPrototypes
      .has(prototype)
  ) {
    return;
  }

  if (
    !isOrdinaryObjectPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must use ordinary plain objects.`
    );
  }

  state
    .approvedObjectPrototypes
    .add(prototype);
}

function requireOrdinaryArrayPrototype(
  prototype,
  state,
  label
) {
  if (
    state
      .approvedArrayPrototypes
      .has(prototype)
  ) {
    return;
  }

  if (
    !isOrdinaryArrayPrototype(
      prototype
    )
  ) {
    throw new Error(
      `${label} must use ordinary arrays.`
    );
  }

  requireOrdinaryObjectPrototype(
    getPrototypeOf(
      prototype
    ),
    state,
    label
  );

  state
    .approvedArrayPrototypes
    .add(prototype);
}

function prepareCanonicalValue(
  value,
  label,
  state
) {
  if (value === null) {
    return {
      value: null,
      frame: null
    };
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
    return {
      value,
      frame: null
    };
  }

  if (
    valueType !== "object"
  ) {
    throw new Error(
      `${label} must contain only canonical data values.`
    );
  }

  if (
    runtimeAuthority.isProxy(value)
  ) {
    throw new Error(
      `${label} must not contain Proxy values.`
    );
  }

  if (
    runtimeAuthority.isPromise(value)
  ) {
    throw new Error(
      `${label} must not contain Promise values.`
    );
  }

  if (
    state.seen.has(value)
  ) {
    return {
      value:
        state.seen.get(value),
      frame: null
    };
  }

  const isArray =
    runtimeAuthority.arrayIsArray(value);

  const prototype =
    getPrototypeOf(value);

  if (isArray) {
    requireOrdinaryArrayPrototype(
      prototype,
      state,
      label
    );
  } else {
    requireOrdinaryObjectPrototype(
      prototype,
      state,
      label
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  let target;

  if (isArray) {
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
        .value !== "number"
    ) {
      throw new Error(
        `${label} must use an ordinary array length.`
      );
    }

    target =
      new Array(
        lengthDescriptor.value
      );
  } else {
    target = {};
  }

  state.seen.set(
    value,
    target
  );

  return {
    value: target,

    frame: {
      target,
      descriptors,
      keys:
        ownKeys(
          descriptors
        ),
      index: 0,
      isArray,
      label
    }
  };
}

function canonicalizeData(
  value,
  label =
    "Mutation value",
  state =
    createCanonicalState()
) {
  const root =
    prepareCanonicalValue(
      value,
      label,
      state
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
        frame.keys.length
    ) {
      stack.pop();
      continue;
    }

    const key =
      frame.keys[
        frame.index
      ];

    frame.index += 1;

    if (
      frame.isArray &&
      key === "length"
    ) {
      continue;
    }

    if (
      typeof key ===
        "symbol"
    ) {
      throw new Error(
        `${frame.label} must not contain symbol-keyed properties.`
      );
    }

    const descriptor =
      frame.descriptors[
        key
      ];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      throw new Error(
        `${frame.label} must not contain accessor properties.`
      );
    }

    if (
      !descriptor.enumerable
    ) {
      throw new Error(
        `${frame.label} must not contain non-enumerable own data properties.`
      );
    }

    const childLabel =
      `${frame.label}.${String(key)}`;

    const child =
      prepareCanonicalValue(
        descriptor.value,
        childLabel,
        state
      );

    defineProperty(
      frame.target,
      key,
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

function freezeCanonicalData(
  value
) {
  if (
    value === null ||
    typeof value !== "object"
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

    for (
      const key of
        Object.keys(current)
    ) {
      const child =
        current[key];

      if (
        child !== null &&
        typeof child ===
          "object" &&
        !seen.has(child)
      ) {
        stack.push(child);
      }
    }

    Object.freeze(
      current
    );
  }

  return value;
}

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
    runtimeAuthority.isProxy(value)
  ) {
    throw new Error(
      `${label} must not be a Proxy.`
    );
  }

  const descriptors =
    getOwnPropertyDescriptors(
      value
    );

  for (
    const key of
      ownKeys(descriptors)
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

  return (
    descriptor === undefined
      ? undefined
      : descriptor.value
  );
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
    typeof mutate !==
      "function"
  ) {
    throw new Error(
      `${label} mutate must be a function.`
    );
  }

  requireSyncCallback(
    mutate,
    "Async mutation functions are not supported by this deterministic compiler.",
    "Generator mutation functions are not supported by this deterministic compiler.",
    "Bound, proxied, or native mutation callbacks are not supported by this deterministic compiler."
  );

  const scoreDescriptors =
    captureMetadataDescriptors(
      scores,
      `${label} scores`,
      `${label} scores must be an object.`
    );

  const capturedScores = {};

  for (
    const scoreKey of
      SCORE_KEYS
  ) {
    const score =
      readMetadataValue(
        scoreDescriptors,
        scoreKey
      );

    requireScore(
      score,
      `${label} ${scoreKey}`
    );

    capturedScores[
      scoreKey
    ] = score;
  }

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
    "Bound, proxied, or native protection callbacks are not supported by this deterministic compiler."
  );

  return {
    id,
    type,
    description,
    mutate,

    scores:
      capturedScores,

    protection: {
      description:
        protectionDescription,
      check:
        protectionCheck
    }
  };
}

function compileMutationPack(
  options = {}
) {
  if (
    runtimeAuthority.promiseAuthorityAvailable !== true ||
    typeof promiseThen !== "function" ||
    typeof promiseConstructor !== "function" ||
    typeof asyncFunctionProbe !== "function" ||
    typeof generatorFunctionProbe !== "function" ||
    typeof runtimeAuthority.arrayIsArray !== "function" ||
    !runtimeAuthority.hasTrustedLocalPromiseSpecies(
      promiseConstructor,
      promiseSpecies
    )
  ) {
    throw new Error(
      "Mutation Pack runtime authority is unavailable."
    );
  }

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
    runtimeAuthority.isProxy(pack)
  ) {
    throw new Error(
      "Mutation pack must not be a Proxy."
    );
  }

  if (
    !Array.isArray(pack)
  ) {
    throw new Error(
      "Mutation pack must be an array."
    );
  }

  const sourceOutputSnapshot =
    canonicalizeData(
      output,
      "Source output"
    );

  const packEntries = [];

  for (
    let index = 0;
    index < pack.length;
    index += 1
  ) {
    const entryDescriptor =
      getOwnPropertyDescriptor(
        pack,
        index
      );

    if (
      entryDescriptor ===
        undefined
    ) {
      throw new Error(
        `Mutation at index ${index} must be present.`
      );
    }

    if (
      "get" in
        entryDescriptor ||
      "set" in
        entryDescriptor
    ) {
      throw new Error(
        `Mutation at index ${index} must be stored as a data property.`
      );
    }

    packEntries.push(
      entryDescriptor.value
    );
  }

  const ids =
    new Set();

  const validatedMutations =
    packEntries.map(
      (
        mutation,
        index
      ) =>
        captureMutation(
          mutation,
          index,
          ids
        )
    );

  if (typeof promiseThen !== "function") {
    throw new Error(
      "Mutation Pack Promise observation authority is unavailable."
    );
  }

  return validatedMutations.map(
    (mutation) => {
      const mutationInput =
        canonicalizeData(
          sourceOutputSnapshot,
          "Mutation input"
        );

      const mutationResult =
        rejectNativePromiseResult(
          Reflect.apply(
            mutation.mutate,
            callbackReceiver,
            [
              mutationInput
            ]
          ),
          "Async mutation functions are not supported by this deterministic compiler."
        );

      const mutatedOutput =
        canonicalizeData(
          mutationResult,
          `Mutation ${mutation.id} output`
        );

      return {
        id:
          mutation.id,

        type:
          mutation.type,

        description:
          mutation.description,

        output:
          freezeCanonicalData(
            mutatedOutput
          ),

        severity:
          mutation.scores
            .severity,

        realism:
          mutation.scores
            .realism,

        subtlety:
          mutation.scores
            .subtlety,

        novelty:
          mutation.scores
            .novelty,

        fixability:
          mutation.scores
            .fixability,

        protection:
          mutation.protection
            .description,

        protectionCheck(
          candidateOutput
        ) {
          const protectionInput =
            canonicalizeData(
              candidateOutput,
              "Protection input"
            );

          const protectionResult =
            rejectNativePromiseResult(
              Reflect.apply(
                mutation
                  .protection
                  .check,
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
