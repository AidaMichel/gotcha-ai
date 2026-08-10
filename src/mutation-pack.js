const {
  types: utilTypes
} = require("node:util");

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

function isPromiseLike(value) {
  return (
    value !== null &&
    (
      typeof value === "object" ||
      typeof value === "function"
    ) &&
    typeof value.then === "function"
  );
}

function isUnsupportedAsyncCallback(
  fn
) {
  return utilTypes.isAsyncFunction(
    fn
  );
}

function rejectPromiseLike(
  value,
  message
) {
  if (!isPromiseLike(value)) {
    return value;
  }

  Promise.resolve(value)
    .catch(() => {});

  throw new Error(message);
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
    typeof SharedArrayBuffer !==
      "undefined" &&
    value instanceof SharedArrayBuffer
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

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  const isArray =
    Array.isArray(value);

  const prototype =
    Object.getPrototypeOf(value);

  if (isArray) {
    // Array.prototype is itself an Array.
    // This works across realms while
    // rejecting Array subclasses.
    if (
      !Array.isArray(prototype)
    ) {
      throw new Error(
        `${label} must use ordinary arrays, not array subclasses.`
      );
    }
  } else if (
    prototype === null ||
    Object.getPrototypeOf(
      prototype
    ) !== null
  ) {
    // An ordinary object's prototype is
    // that realm's Object.prototype,
    // whose own prototype is null.
    throw new Error(
      `${label} must use only primitives, ordinary arrays, and plain objects.`
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
    if (
      isArray &&
      key === "length"
    ) {
      continue;
    }

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

    const isOrdinaryProperty =
      descriptor.enumerable &&
      descriptor.configurable &&
      descriptor.writable;

    const isFrozenProperty =
      descriptor.enumerable &&
      Object.isFrozen(value) &&
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
    return structuredClone(value);
  } catch {
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

function captureMutation(
  mutation,
  index,
  ids
) {
  const label =
    `Mutation at index ${index}`;

  if (
    mutation === null ||
    typeof mutation !== "object" ||
    Array.isArray(mutation)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }

  // Capture every public field once.
  const id = mutation.id;
  const type = mutation.type;
  const description =
    mutation.description;
  const mutate = mutation.mutate;
  const scores = mutation.scores;
  const protection =
    mutation.protection;

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

  if (
    isUnsupportedAsyncCallback(
      mutate
    )
  ) {
    throw new Error(
      "Async mutation functions are not supported by this deterministic compiler."
    );
  }

  if (
    scores === null ||
    typeof scores !== "object" ||
    Array.isArray(scores)
  ) {
    throw new Error(
      `${label} scores must be an object.`
    );
  }

  const capturedScores = {};

  SCORE_KEYS.forEach(
    (scoreKey) => {
      // Read each score exactly once.
      const score =
        scores[scoreKey];

      requireScore(
        score,
        `${label} ${scoreKey}`
      );

      capturedScores[scoreKey] =
        score;
    }
  );

  if (
    protection === null ||
    typeof protection !==
      "object" ||
    Array.isArray(protection)
  ) {
    throw new Error(
      `${label} protection must be an object.`
    );
  }

  const protectionDescription =
    protection.description;

  const protectionCheck =
    protection.check;

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

  if (
    isUnsupportedAsyncCallback(
      protectionCheck
    )
  ) {
    throw new Error(
      "Async protection checks are not supported by this deterministic compiler."
    );
  }

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

function compileMutationPack({
  output,
  pack
} = {}) {
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
    if (
      !Object.prototype.hasOwnProperty.call(
        pack,
        index
      )
    ) {
      throw new Error(
        `Mutation at index ${index} must be present.`
      );
    }

    packEntries.push(
      pack[index]
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
      const mutationInput =
        cloneMutationValue(
          sourceOutputSnapshot,
          "Mutation input"
        );

      const mutationResult =
        rejectPromiseLike(
          mutation.mutate(
            mutationInput
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
        id: mutation.id,
        type: mutation.type,
        description:
          mutation.description,

        output:
          freezeMutationValue(
            mutatedOutput
          ),

        severity:
          mutation.scores.severity,
        realism:
          mutation.scores.realism,
        subtlety:
          mutation.scores.subtlety,
        novelty:
          mutation.scores.novelty,
        fixability:
          mutation.scores.fixability,

        protection:
          mutation.protection.description,

        protectionCheck(
          candidateOutput
        ) {
          const protectionInput =
            cloneMutationValue(
              candidateOutput,
              "Protection input"
            );

          return rejectPromiseLike(
            mutation.protection.check(
              protectionInput
            ),
            "Async protection checks are not supported by this deterministic compiler."
          );
        }
      };
    }
  );
}

module.exports = {
  compileMutationPack
};
