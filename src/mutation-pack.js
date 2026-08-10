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

function isAsyncFunction(fn) {
  return (
    fn.constructor !== undefined &&
    fn.constructor.name ===
      "AsyncFunction"
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

function cloneMutationValue(
  value
) {
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
      "Mutable mutation outputs must be structured-cloneable."
    );
  }
}

function validateMutation(
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

  requireNonEmptyString(
    mutation.id,
    `${label} id`
  );

  if (ids.has(mutation.id)) {
    throw new Error(
      `Duplicate mutation id: ${mutation.id}`
    );
  }

  ids.add(mutation.id);

  requireNonEmptyString(
    mutation.type,
    `${label} type`
  );

  requireNonEmptyString(
    mutation.description,
    `${label} description`
  );

  if (
    typeof mutation.mutate !==
    "function"
  ) {
    throw new Error(
      `${label} mutate must be a function.`
    );
  }

  if (isAsyncFunction(mutation.mutate)) {
    throw new Error(
      "Async mutation functions are not supported by this deterministic compiler."
    );
  }

  if (
    mutation.scores === null ||
    typeof mutation.scores !==
      "object" ||
    Array.isArray(mutation.scores)
  ) {
    throw new Error(
      `${label} scores must be an object.`
    );
  }

  SCORE_KEYS.forEach(
    (scoreKey) => {
      requireScore(
        mutation.scores[scoreKey],
        `${label} ${scoreKey}`
      );
    }
  );

  if (
    mutation.protection === null ||
    typeof mutation.protection !==
      "object" ||
    Array.isArray(
      mutation.protection
    )
  ) {
    throw new Error(
      `${label} protection must be an object.`
    );
  }

  requireNonEmptyString(
    mutation.protection.description,
    `${label} protection description`
  );

  if (
    typeof mutation.protection.check !==
    "function"
  ) {
    throw new Error(
      `${label} protection check must be a function.`
    );
  }

  if (
    isAsyncFunction(
      mutation.protection.check
    )
  ) {
    throw new Error(
      "Async protection checks are not supported by this deterministic compiler."
    );
  }
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

  const ids = new Set();
  const validatedMutations = [];

  // Validate and snapshot the entire pack
  // before executing any mutation.
  for (
    let index = 0;
    index < pack.length;
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

    const mutation = pack[index];

    validateMutation(
      mutation,
      index,
      ids
    );

    validatedMutations.push({
      id: mutation.id,
      type: mutation.type,
      description:
        mutation.description,

      mutate: mutation.mutate,

      scores: {
        severity:
          mutation.scores.severity,
        realism:
          mutation.scores.realism,
        subtlety:
          mutation.scores.subtlety,
        novelty:
          mutation.scores.novelty,
        fixability:
          mutation.scores.fixability
      },

      protection: {
        description:
          mutation.protection.description,
        check:
          mutation.protection.check
      }
    });
  }

  return validatedMutations.map(
    (mutation) => {
      const mutationInput =
        cloneMutationValue(output);

      const mutatedOutput =
        rejectPromiseLike(
          mutation.mutate(
            mutationInput
          ),
          "Async mutation functions are not supported by this deterministic compiler."
        );

      return {
        id: mutation.id,
        type: mutation.type,
        description:
          mutation.description,

        output: mutatedOutput,

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
              candidateOutput
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
