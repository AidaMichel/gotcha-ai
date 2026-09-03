"use strict";

const runtimeAuthority = require("./runtime-authority");
const packageAuthority = require("./package-authority");
const {
  isUnsupportedRuntimeObject
} = require("./ai-data-core");

const PromiseConstructor = packageAuthority.PromiseConstructor;
const PromisePrototype = packageAuthority.PromisePrototype;
const TypeErrorConstructor = packageAuthority.TypeErrorConstructor;
const ArrayConstructor = Array;
const WeakSetConstructor = WeakSet;
const promiseThen = packageAuthority.PromiseThen;
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
const objectKeys = Object.keys;
const isExtensible = Object.isExtensible;
const arrayIsArray = Array.isArray;
const arrayPop = Array.prototype.pop;
const numberIsFinite = Number.isFinite;
const numberIsInteger = Number.isInteger;
const numberConstructor = Number;
const stringTrim = String.prototype.trim;
const stringConstructor = String;
const functionHasInstance = Function.prototype[Symbol.hasInstance];
const functionToString = Function.prototype.toString;
const stringStartsWith = String.prototype.startsWith;
const isProxy = runtimeAuthority.isProxy;
const isPromise = runtimeAuthority.isPromise;
const weakSetHas = WeakSet.prototype.has;
const weakSetAdd = WeakSet.prototype.add;
const weakSetDelete = WeakSet.prototype.delete;

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
  return new TypeErrorConstructor(message);
}

function isLocalTypeError(error) {
  return (
    error !== null &&
    (typeof error === "object" || typeof error === "function") &&
    reflectApply(functionHasInstance, TypeErrorConstructor, [error])
  );
}

function isForbiddenRuntimeObject(value) {
  return isUnsupportedRuntimeObject(value);
}

function appendInternal(array, value) {
  defineProperty(array, stringConstructor(array.length), {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function expectedKeyContains(expectedKeys, key) {
  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (expectedKeys[index] === key) return true;
  }
  return false;
}

function exactDataDescriptors(value, expectedKeys, label, requirePlainLocal) {
  if (value === null || typeof value !== "object" || arrayIsArray(value) || isProxy(value)) {
    throw boundaryError(`${label} must be a non-Proxy record.`);
  }
  if (isForbiddenRuntimeObject(value)) {
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
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    if (typeof key !== "string" || !expectedKeyContains(expectedKeys, key)) {
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

function assertDataDescriptor(descriptor, label) {
  if (
    descriptor === undefined ||
    !("value" in descriptor) ||
    "get" in descriptor ||
    "set" in descriptor ||
    descriptor.enumerable !== true
  ) {
    throw boundaryError(`${label} must use enumerable data properties only.`);
  }
}

function captureArrayEntries(value, label, descriptors) {
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    "get" in lengthDescriptor ||
    "set" in lengthDescriptor ||
    typeof lengthDescriptor.value !== "number" ||
    !numberIsInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    throw boundaryError(`${label} has an invalid array length.`);
  }

  const length = lengthDescriptor.value;
  const entries = new ArrayConstructor();
  const keys = ownKeys(descriptors);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    if (key === "length") continue;
    if (typeof key !== "string") {
      throw boundaryError(`${label} must not contain symbol keys.`);
    }
    const index = numberConstructor(key);
    if (
      !numberIsInteger(index) ||
      index < 0 ||
      index >= length ||
      stringConstructor(index) !== key
    ) {
      throw boundaryError(`${label} has an invalid array property.`);
    }
    assertDataDescriptor(descriptors[key], `${label}[${index}]`);
  }

  for (let index = 0; index < length; index += 1) {
    const key = stringConstructor(index);
    const descriptor = descriptors[key];
    if (descriptor === undefined) {
      throw boundaryError(`${label} must not be sparse.`);
    }
    assertDataDescriptor(descriptor, `${label}[${index}]`);
    appendInternal(entries, {
      key,
      value: descriptor.value,
      label: `${label}[${index}]`
    });
  }

  return { entries, length };
}

function captureRecordEntries(value, label, descriptors) {
  const entries = new ArrayConstructor();
  const keys = ownKeys(descriptors);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    if (typeof key !== "string") {
      throw boundaryError(`${label} must not contain symbol keys.`);
    }
    const descriptor = descriptors[key];
    assertDataDescriptor(descriptor, `${label}.${key}`);
    appendInternal(entries, {
      key,
      value: descriptor.value,
      label: `${label}.${key}`
    });
  }
  return entries;
}

function prepareInvocationNode(value, label, active) {
  if (value === null || typeof value !== "object") {
    assertSafePrimitive(value, label);
    return { value, frame: null };
  }
  if (isProxy(value) || isForbiddenRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (reflectApply(weakSetHas, active, [value])) {
    throw boundaryError(`${label} must not contain cycles.`);
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const isArray = arrayIsArray(value);
  let entries;
  let target;
  if (isArray) {
    const captured = captureArrayEntries(value, label, descriptors);
    entries = captured.entries;
    target = new ArrayConstructor(captured.length);
  } else {
    entries = captureRecordEntries(value, label, descriptors);
    target = objectCreate(null);
  }

  reflectApply(weakSetAdd, active, [value]);
  return {
    value: target,
    frame: {
      source: value,
      target,
      entries,
      index: 0,
      active
    }
  };
}

function projectInvocationData(value, label) {
  const active = new WeakSetConstructor();
  const root = prepareInvocationNode(value, label, active);
  if (root.frame === null) return root.value;

  const stack = new ArrayConstructor();
  appendInternal(stack, root.frame);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.entries.length) {
      reflectApply(weakSetDelete, frame.active, [frame.source]);
      reflectApply(arrayPop, stack, []);
      continue;
    }

    const entry = frame.entries[frame.index];
    frame.index += 1;
    const child = prepareInvocationNode(entry.value, entry.label, frame.active);
    defineProperty(frame.target, entry.key, {
      value: child.value,
      writable: true,
      enumerable: true,
      configurable: true
    });
    if (child.frame !== null) appendInternal(stack, child.frame);
  }
  return root.value;
}

function prepareProviderNode(value, label, seen, root) {
  if (value === null || typeof value !== "object") {
    if (root) {
      throw boundaryError("provider response output root must be a record.");
    }
    assertSafePrimitive(value, label);
    return { value, frame: null };
  }
  if (isProxy(value) || isForbiddenRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (reflectApply(weakSetHas, seen, [value])) {
    throw boundaryError(`${label} must not contain cycles or repeated mutable identity.`);
  }
  reflectApply(weakSetAdd, seen, [value]);

  const isArray = arrayIsArray(value);
  const prototype = getPrototypeOf(value);
  const descriptors = getOwnPropertyDescriptors(value);
  let entries;
  let target;
  if (isArray) {
    if (root) {
      throw boundaryError("provider response output root must be a record.");
    }
    if (prototype !== arrayPrototype) {
      throw boundaryError(`${label} must be a local array.`);
    }
    const captured = captureArrayEntries(value, label, descriptors);
    entries = captured.entries;
    target = new ArrayConstructor(captured.length);
  } else {
    if (prototype !== objectPrototype && prototype !== null) {
      throw boundaryError(`${label} must be a local plain record.`);
    }
    entries = captureRecordEntries(value, label, descriptors);
    target = objectCreate(null);
  }

  return {
    value: target,
    frame: {
      target,
      entries,
      index: 0,
      seen
    }
  };
}

function detachProviderData(value, label, root) {
  const seen = new WeakSetConstructor();
  const prepared = prepareProviderNode(value, label, seen, root);
  if (prepared.frame === null) return prepared.value;

  const stack = new ArrayConstructor();
  appendInternal(stack, prepared.frame);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.entries.length) {
      reflectApply(arrayPop, stack, []);
      continue;
    }

    const entry = frame.entries[frame.index];
    frame.index += 1;
    const child = prepareProviderNode(entry.value, entry.label, frame.seen, false);
    defineProperty(frame.target, entry.key, {
      value: child.value,
      writable: true,
      enumerable: true,
      configurable: true
    });
    if (child.frame !== null) appendInternal(stack, child.frame);
  }
  return prepared.value;
}

function cloneSchema(value) {
  if (arrayIsArray(value)) {
    const result = new ArrayConstructor(value.length);
    for (let index = 0; index < value.length; index += 1) {
      defineProperty(result, stringConstructor(index), {
        value: cloneSchema(value[index]),
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    return result;
  }
  if (value !== null && typeof value === "object") {
    const out = objectCreate(null);
    const keys = objectKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      defineProperty(out, key, {
        value: cloneSchema(value[key]),
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
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
  return detachProviderData(
    descriptors.output.value,
    "provider response.output",
    true
  );
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

function isClassConstructor(value) {
  const source = reflectApply(functionToString, value, []);
  if (!reflectApply(stringStartsWith, source, ["class"])) {
    return false;
  }
  const separator = source[5];
  return (
    separator === " " ||
    separator === "\n" ||
    separator === "\r" ||
    separator === "\t" ||
    separator === "{" ||
    separator === "/"
  );
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

  if (
    typeof transport !== "function" ||
    isProxy(transport) ||
    isClassConstructor(transport)
  ) {
    throw boundaryError("transport must be a non-Proxy callable function.");
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
              task: projectInvocationData(requestDescriptors.task.value, "generator request.task"),
              examples: projectInvocationData(requestDescriptors.examples.value, "generator request.examples")
            }
          : {
              contract: projectInvocationData(requestDescriptors.contract.value, "generator request.contract"),
              input: projectInvocationData(requestDescriptors.input.value, "generator request.input"),
              expectedOutput: projectInvocationData(requestDescriptors.expectedOutput.value, "generator request.expectedOutput")
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
        reject(isLocalTypeError(error) ? error : boundaryError("generator request capture failed."));
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
          reject(isLocalTypeError(error) ? error : boundaryError("provider response validation failed."));
        }
      };

      if (transportResult !== null && typeof transportResult === "object" && !isProxy(transportResult) && reflectApply(isPromise, undefined, [transportResult])) {
        try {
          if (getPrototypeOf(transportResult) !== PromisePrototype) {
            throw boundaryError("transport Promise has an unsupported current prototype.");
          }
          observeAcceptedPromise(transportResult, settleResponse, reject);
        } catch (error) {
          reject(isLocalTypeError(error) ? error : boundaryError("transport Promise cannot be safely observed."));
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
