"use strict";

const { types: utilTypes } = require("node:util");
const { Buffer: BufferConstructor } = require("node:buffer");

const PromiseConstructor = Promise;
const PromisePrototype = Promise.prototype;
const promiseThen = Promise.prototype.then;
const promiseSpecies = Symbol.species;
const objectPrototype = Object.prototype;
const arrayPrototype = Array.prototype;
const getPrototypeOf = Object.getPrototypeOf;
const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ownKeys = Reflect.ownKeys;
const reflectApply = Reflect.apply;
const defineProperty = Object.defineProperty;
const deleteProperty = Reflect.deleteProperty;
const objectCreate = Object.create;
const isExtensible = Object.isExtensible;
const arrayIsArray = Array.isArray;
const numberIsFinite = Number.isFinite;
const stringTrim = String.prototype.trim;

const forbiddenProbes = [
  utilTypes.isDate,
  utilTypes.isRegExp,
  utilTypes.isMap,
  utilTypes.isSet,
  utilTypes.isWeakMap,
  utilTypes.isWeakSet,
  utilTypes.isPromise,
  utilTypes.isNativeError,
  utilTypes.isAnyArrayBuffer,
  utilTypes.isDataView,
  utilTypes.isTypedArray,
  utilTypes.isBoxedPrimitive,
  utilTypes.isArgumentsObject,
  utilTypes.isGeneratorObject,
  utilTypes.isModuleNamespaceObject,
  utilTypes.isMapIterator,
  utilTypes.isSetIterator,
  utilTypes.isExternal,
  BufferConstructor.isBuffer
];

const safePromiseConstructor = objectCreate(null);
defineProperty(safePromiseConstructor, promiseSpecies, {
  value: PromiseConstructor,
  writable: false,
  enumerable: false,
  configurable: false
});
Object.freeze(safePromiseConstructor);

const QUALITY_CONTRACT_SCHEMA = Object.freeze({
  dialect: "gotcha-structured-v1",
  type: "record",
  required: Object.freeze(["version", "task", "rules"]),
  additionalProperties: true,
  properties: Object.freeze({
    version: Object.freeze({ type: "literal", value: 1 }),
    task: Object.freeze({ type: "string", minLength: 1 }),
    rules: Object.freeze({
      type: "array",
      minItems: 0,
      maxItems: 7,
      items: Object.freeze({
        type: "record",
        required: Object.freeze([
          "id", "statement", "kind", "severity", "confidence", "rationale", "evidence"
        ]),
        additionalProperties: true,
        properties: Object.freeze({
          id: Object.freeze({ type: "string", minLength: 1 }),
          statement: Object.freeze({ type: "string", minLength: 1 }),
          kind: Object.freeze({ type: "string", enum: Object.freeze(["required", "forbidden", "conditional"]) }),
          severity: Object.freeze({ type: "string", enum: Object.freeze(["critical", "major", "minor"]) }),
          confidence: Object.freeze({ type: "string", enum: Object.freeze(["high", "medium", "low"]) }),
          rationale: Object.freeze({ type: "string", minLength: 1 }),
          evidence: Object.freeze({
            type: "array",
            minItems: 1,
            items: Object.freeze({
              type: "union",
              anyOf: Object.freeze([
                Object.freeze({
                  type: "record",
                  required: Object.freeze(["type"]),
                  additionalProperties: true,
                  properties: Object.freeze({
                    type: Object.freeze({ type: "literal", value: "task" })
                  })
                }),
                Object.freeze({
                  type: "record",
                  required: Object.freeze(["type", "exampleId"]),
                  additionalProperties: true,
                  properties: Object.freeze({
                    type: Object.freeze({ type: "literal", value: "example" }),
                    exampleId: Object.freeze({ type: "string", minLength: 1 })
                  })
                })
              ])
            })
          })
        })
      })
    })
  })
});

const CONTRACT_ATTACKS_SCHEMA = Object.freeze({
  dialect: "gotcha-structured-v1",
  type: "record",
  required: Object.freeze(["version", "task", "attacks"]),
  additionalProperties: true,
  properties: Object.freeze({
    version: Object.freeze({ type: "literal", value: 1 }),
    task: Object.freeze({ type: "string", minLength: 1 }),
    attacks: Object.freeze({
      type: "array",
      minItems: 0,
      maxItems: 20,
      items: Object.freeze({
        type: "record",
        required: Object.freeze([
          "id", "ruleId", "type", "description", "rationale", "mutatedOutput", "scores"
        ]),
        additionalProperties: true,
        properties: Object.freeze({
          id: Object.freeze({ type: "string", minLength: 1 }),
          ruleId: Object.freeze({ type: "string", minLength: 1 }),
          type: Object.freeze({ type: "string", minLength: 1 }),
          description: Object.freeze({ type: "string", minLength: 1 }),
          rationale: Object.freeze({ type: "string", minLength: 1 }),
          mutatedOutput: Object.freeze({ type: "ai-data" }),
          scores: Object.freeze({
            type: "record",
            required: Object.freeze(["realism", "subtlety", "novelty", "fixability"]),
            additionalProperties: true,
            properties: Object.freeze({
              realism: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
              subtlety: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
              novelty: Object.freeze({ type: "number", minimum: 0, maximum: 1 }),
              fixability: Object.freeze({ type: "number", minimum: 0, maximum: 1 })
            })
          })
        })
      })
    })
  })
});

function boundaryError(message) {
  return new TypeError(message);
}

function isForbiddenBrand(value, allowPromise) {
  for (const probe of forbiddenProbes) {
    if (allowPromise && probe === utilTypes.isPromise) {
      continue;
    }
    if (reflectApply(probe, utilTypes, [value])) {
      return true;
    }
  }
  return false;
}

function exactDataDescriptors(value, expectedKeys, label, requirePlainLocal) {
  if (value === null || typeof value !== "object" || arrayIsArray(value) || utilTypes.isProxy(value)) {
    throw boundaryError(`${label} must be a non-Proxy record.`);
  }
  if (isForbiddenBrand(value, false)) {
    throw boundaryError(`${label} must be a plain record.`);
  }
  if (requirePlainLocal) {
    const prototype = getPrototypeOf(value);
    if (prototype !== objectPrototype && prototype !== null) {
      throw boundaryError(`${label} must use the local Object prototype or null.`);
    }
  }
  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  if (keys.length !== expectedKeys.length) {
    throw boundaryError(`${label} has an invalid key set.`);
  }
  for (const key of keys) {
    if (typeof key !== "string" || !expectedKeys.includes(key)) {
      throw boundaryError(`${label} has an invalid key set.`);
    }
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || "get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label} must use data properties only.`);
    }
  }
  for (const key of expectedKeys) {
    if (descriptors[key] === undefined) {
      throw boundaryError(`${label} is missing ${key}.`);
    }
  }
  return descriptors;
}

function assertSafePrimitive(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number" && numberIsFinite(value)) {
    return;
  }
  throw boundaryError(`${label} contains unsupported data.`);
}

function projectInvocationData(value, label, ancestors) {
  if (value === null || typeof value !== "object") {
    assertSafePrimitive(value, label);
    return value;
  }
  if (utilTypes.isProxy(value) || isForbiddenBrand(value, false)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (ancestors.has(value)) {
    throw boundaryError(`${label} must not contain cycles.`);
  }
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);
  if (arrayIsArray(value)) {
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !("value" in lengthDescriptor)) {
      throw boundaryError(`${label} has an invalid array length.`);
    }
    const length = lengthDescriptor.value;
    const result = new Array(length);
    for (const key of keys) {
      if (typeof key === "symbol") {
        throw boundaryError(`${label} must not contain symbol keys.`);
      }
      const descriptor = descriptors[key];
      if ("get" in descriptor || "set" in descriptor) {
        throw boundaryError(`${label} must not contain accessors.`);
      }
      if (key === "length") {
        continue;
      }
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) {
        throw boundaryError(`${label} has an invalid array property.`);
      }
    }
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor) {
        throw boundaryError(`${label} must not be sparse.`);
      }
      result[index] = projectInvocationData(descriptor.value, `${label}[${index}]`, nextAncestors);
    }
    return result;
  }
  const result = {};
  for (const key of keys) {
    if (typeof key !== "string") {
      throw boundaryError(`${label} must not contain symbol keys.`);
    }
    const descriptor = descriptors[key];
    if ("get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label} must not contain accessors.`);
    }
    result[key] = projectInvocationData(descriptor.value, `${label}.${key}`, nextAncestors);
  }
  return result;
}

function detachProviderData(value, label, ancestors, root) {
  if (value === null || typeof value !== "object") {
    if (root) {
      throw boundaryError("provider response output root must be a record.");
    }
    assertSafePrimitive(value, label);
    return value;
  }
  if (utilTypes.isProxy(value) || isForbiddenBrand(value, false)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (ancestors.has(value)) {
    throw boundaryError(`${label} must not contain cycles or repeated identity.`);
  }
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  const prototype = getPrototypeOf(value);
  if (arrayIsArray(value)) {
    if (root) {
      throw boundaryError("provider response output root must be a record.");
    }
    if (prototype !== arrayPrototype) {
      throw boundaryError(`${label} must be a local array.`);
    }
    const descriptors = getOwnPropertyDescriptors(value);
    const keys = ownKeys(descriptors);
    const length = descriptors.length && descriptors.length.value;
    const result = new Array(length);
    for (const key of keys) {
      if (typeof key === "symbol") {
        throw boundaryError(`${label} must not contain symbol keys.`);
      }
      const descriptor = descriptors[key];
      if ("get" in descriptor || "set" in descriptor) {
        throw boundaryError(`${label} must not contain accessors.`);
      }
      if (key === "length") continue;
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) {
        throw boundaryError(`${label} has an invalid array property.`);
      }
    }
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor) throw boundaryError(`${label} must not be sparse.`);
      result[index] = detachProviderData(descriptor.value, `${label}[${index}]`, nextAncestors, false);
    }
    return result;
  }
  if (prototype !== objectPrototype && prototype !== null) {
    throw boundaryError(`${label} must be a local plain record.`);
  }
  const descriptors = getOwnPropertyDescriptors(value);
  const result = root ? objectCreate(null) : {};
  for (const key of ownKeys(descriptors)) {
    if (typeof key !== "string") {
      throw boundaryError(`${label} must not contain symbol keys.`);
    }
    const descriptor = descriptors[key];
    if ("get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label} must not contain accessors.`);
    }
    const child = descriptor.value;
    if (child !== null && typeof child === "object" && nextAncestors.has(child)) {
      throw boundaryError(`${label} must not contain cycles or repeated identity.`);
    }
    result[key] = detachProviderData(child, `${label}.${key}`, nextAncestors, false);
  }
  return result;
}

function cloneSchema(value) {
  if (Array.isArray(value)) return value.map(cloneSchema);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = cloneSchema(value[key]);
    return out;
  }
  return value;
}

function buildOutputFormat(mode) {
  return {
    version: 1,
    kind: "gotcha-output-format",
    mode,
    schema: cloneSchema(mode === "quality-contract" ? QUALITY_CONTRACT_SCHEMA : CONTRACT_ATTACKS_SCHEMA)
  };
}

function assertUniqueProviderIdentity(value, seen) {
  if (value === null || typeof value !== "object") return;
  if (utilTypes.isProxy(value) || isForbiddenBrand(value, false)) return;
  if (seen.has(value)) {
    throw boundaryError("provider response.output must not contain repeated mutable identity.");
  }
  seen.add(value);
  const descriptors = getOwnPropertyDescriptors(value);
  for (const key of ownKeys(descriptors)) {
    if (key === "length") continue;
    const descriptor = descriptors[key];
    if (descriptor && "value" in descriptor) {
      assertUniqueProviderIdentity(descriptor.value, seen);
    }
  }
}

function validateProviderResponse(response) {
  const descriptors = exactDataDescriptors(
    response,
    ["version", "kind", "output"],
    "provider response",
    true
  );
  if (descriptors.version.value !== 1 || descriptors.kind.value !== "gotcha-provider-response") {
    throw boundaryError("provider response has invalid version or kind.");
  }
  assertUniqueProviderIdentity(descriptors.output.value, new Set());
  return detachProviderData(descriptors.output.value, "provider response.output", new Set(), true);
}

function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");
  if (constructorDescriptor !== undefined && constructorDescriptor.configurable !== true) {
    throw boundaryError("transport Promise has an unshieldable constructor property.");
  }
  if (constructorDescriptor === undefined && !isExtensible(promise)) {
    throw boundaryError("transport Promise cannot be safely observed.");
  }
  defineProperty(promise, "constructor", {
    value: safePromiseConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  try {
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
  } finally {
    if (constructorDescriptor === undefined) {
      deleteProperty(promise, "constructor");
    } else {
      defineProperty(promise, "constructor", constructorDescriptor);
    }
  }
}

function createStructuredProviderAdapter(options) {
  const descriptors = exactDataDescriptors(
    options,
    ["transport", "model", "mode"],
    "adapter options",
    true
  );
  const transport = descriptors.transport.value;
  const model = descriptors.model.value;
  const mode = descriptors.mode.value;

  if (typeof transport !== "function" || utilTypes.isProxy(transport)) {
    throw boundaryError("transport must be a non-Proxy function.");
  }
  if (
    typeof model !== "string" ||
    model.length === 0 ||
    reflectApply(stringTrim, model, []) !== model
  ) {
    throw boundaryError("model must be a non-empty canonical string.");
  }
  if (mode !== "quality-contract" && mode !== "contract-attacks") {
    throw boundaryError("mode must be quality-contract or contract-attacks.");
  }

  return function structuredProviderGenerator(generatorRequest) {
    return new PromiseConstructor((resolve, reject) => {
      let request;
      try {
        const expectedKeys = mode === "quality-contract"
          ? ["task", "examples", "instructions"]
          : ["contract", "input", "expectedOutput", "instructions"];
        const requestDescriptors = exactDataDescriptors(
          generatorRequest,
          expectedKeys,
          "generator request",
          false
        );
        const instructions = requestDescriptors.instructions.value;
        if (typeof instructions !== "string") {
          throw boundaryError("instructions must be a primitive string.");
        }
        const input = mode === "quality-contract"
          ? {
              task: projectInvocationData(requestDescriptors.task.value, "generator request.task", new Set()),
              examples: projectInvocationData(requestDescriptors.examples.value, "generator request.examples", new Set())
            }
          : {
              contract: projectInvocationData(requestDescriptors.contract.value, "generator request.contract", new Set()),
              input: projectInvocationData(requestDescriptors.input.value, "generator request.input", new Set()),
              expectedOutput: projectInvocationData(requestDescriptors.expectedOutput.value, "generator request.expectedOutput", new Set())
            };
        request = {
          version: 1,
          kind: "gotcha-provider-request",
          mode,
          model,
          instructions,
          outputFormat: buildOutputFormat(mode),
          input
        };
      } catch (error) {
        reject(error instanceof TypeError ? error : boundaryError("generator request capture failed."));
        return;
      }

      let transportResult;
      try {
        transportResult = transport(request);
      } catch (error) {
        reject(error);
        return;
      }

      const settleResponse = (response) => {
        try {
          resolve(validateProviderResponse(response));
        } catch (error) {
          reject(error instanceof TypeError ? error : boundaryError("provider response validation failed."));
        }
      };

      if (transportResult !== null && typeof transportResult === "object" && !utilTypes.isProxy(transportResult) && utilTypes.isPromise(transportResult)) {
        try {
          if (getPrototypeOf(transportResult) !== PromisePrototype) {
            throw boundaryError("transport Promise has an unsupported current prototype.");
          }
          observeAcceptedPromise(transportResult, settleResponse, reject);
        } catch (error) {
          reject(error instanceof TypeError ? error : boundaryError("transport Promise cannot be safely observed."));
        }
        return;
      }

      if (transportResult !== null && (typeof transportResult === "object" || typeof transportResult === "function")) {
        settleResponse(transportResult);
        return;
      }

      reject(boundaryError("transport must return a provider response record or accepted Promise."));
    });
  };
}

module.exports = {
  createStructuredProviderAdapter
};
