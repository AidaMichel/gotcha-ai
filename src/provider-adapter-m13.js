"use strict";

const { types: utilTypes } = require("node:util");
const { runInNewContext } = require("node:vm");
const {
  isUnsupportedRuntimeObject
} = require("./ai-data-core");
const ArrayConstructor = Array;
const WeakSetConstructor = WeakSet;
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
const isProxy = utilTypes.isProxy;
const isPromise = utilTypes.isPromise;
const weakSetHas = WeakSet.prototype.has;
const weakSetAdd = WeakSet.prototype.add;
const weakSetDelete = WeakSet.prototype.delete;

const CONTRACT_PROTECTION_INSTRUCTIONS_V1 =
  "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
  "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
  "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
  "The protection statement must describe what the quality system should enforce.\n" +
  "The rationale must explain why this protection addresses the selected survivor.";

let capturedAmbientPromiseConstructor = null;
try {
  const ambientPromiseDescriptor = getOwnPropertyDescriptor(globalThis, "Promise");
  if (
    ambientPromiseDescriptor !== undefined &&
    !("get" in ambientPromiseDescriptor) &&
    !("set" in ambientPromiseDescriptor) &&
    typeof ambientPromiseDescriptor.value === "function" &&
    !isProxy(ambientPromiseDescriptor.value)
  ) {
    capturedAmbientPromiseConstructor = ambientPromiseDescriptor.value;
  }
} catch {
  capturedAmbientPromiseConstructor = null;
}

let trustedPromiseConstructor = null;
let trustedPromisePrototype = null;
let trustedPromiseThen = null;
let promiseAuthorityAvailable = false;
try {
  const pristineReflectApply = runInNewContext("Reflect.apply");
  const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");
  const pristineGetOwnPropertyDescriptor = runInNewContext(
    "Object.getOwnPropertyDescriptor"
  );
  const pristineFunctionToString = runInNewContext("Function.prototype.toString");
  const pristinePromiseConstructorSource = runInNewContext(
    "Function.prototype.toString.call(Promise)"
  );
  const pristinePromiseThenSource = runInNewContext(
    "Function.prototype.toString.call(Promise.prototype.then)"
  );
  const localPromiseProbe =
    (async function m13AdapterLocalPromiseProbe() {})();
  const intrinsicPrototype = pristineReflectApply(
    pristineGetPrototypeOf,
    undefined,
    [localPromiseProbe]
  );
  const constructorDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [intrinsicPrototype, "constructor"]
  );
  const thenDescriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [intrinsicPrototype, "then"]
  );
  const intrinsicConstructorSource =
    constructorDescriptor !== undefined &&
    typeof constructorDescriptor.value === "function"
      ? pristineReflectApply(
          pristineFunctionToString,
          constructorDescriptor.value,
          []
        )
      : null;
  const intrinsicThenSource =
    thenDescriptor !== undefined &&
    typeof thenDescriptor.value === "function"
      ? pristineReflectApply(
          pristineFunctionToString,
          thenDescriptor.value,
          []
        )
      : null;
  const intrinsicAuthorityValid = (
    constructorDescriptor !== undefined &&
    !("get" in constructorDescriptor) &&
    !("set" in constructorDescriptor) &&
    typeof constructorDescriptor.value === "function" &&
    constructorDescriptor.writable === true &&
    constructorDescriptor.enumerable === false &&
    constructorDescriptor.configurable === true &&
    !isProxy(constructorDescriptor.value) &&
    intrinsicConstructorSource === pristinePromiseConstructorSource &&
    thenDescriptor !== undefined &&
    !("get" in thenDescriptor) &&
    !("set" in thenDescriptor) &&
    typeof thenDescriptor.value === "function" &&
    thenDescriptor.writable === true &&
    thenDescriptor.enumerable === false &&
    thenDescriptor.configurable === true &&
    !isProxy(thenDescriptor.value) &&
    intrinsicThenSource === pristinePromiseThenSource
  );

  if (intrinsicAuthorityValid) {
    trustedPromiseConstructor = constructorDescriptor.value;
    trustedPromisePrototype = intrinsicPrototype;
    trustedPromiseThen = thenDescriptor.value;
  }

  let ambientPrototypeMatches = false;
  if (
    intrinsicAuthorityValid &&
    typeof capturedAmbientPromiseConstructor === "function" &&
    !isProxy(capturedAmbientPromiseConstructor) &&
    capturedAmbientPromiseConstructor === trustedPromiseConstructor
  ) {
    const ambientPrototypeDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [capturedAmbientPromiseConstructor, "prototype"]
    );
    ambientPrototypeMatches = (
      ambientPrototypeDescriptor !== undefined &&
      !("get" in ambientPrototypeDescriptor) &&
      !("set" in ambientPrototypeDescriptor) &&
      ambientPrototypeDescriptor.value === trustedPromisePrototype
    );
  }

  promiseAuthorityAvailable =
    intrinsicAuthorityValid && ambientPrototypeMatches;
} catch {
  trustedPromiseConstructor = null;
  trustedPromisePrototype = null;
  trustedPromiseThen = null;
  promiseAuthorityAvailable = false;
}

let legacyTypeErrorAuthorityAvailable = false;
try {
  let localTypeErrorPrototype = null;
  try {
    null.m13LegacyTypeErrorProbe;
  } catch (error) {
    localTypeErrorPrototype = getPrototypeOf(error);
  }
  const ambientTypeErrorDescriptor =
    getOwnPropertyDescriptor(globalThis, "TypeError");
  const ambientTypeErrorCandidate =
    ambientTypeErrorDescriptor !== undefined &&
    !("get" in ambientTypeErrorDescriptor) &&
    !("set" in ambientTypeErrorDescriptor)
      ? ambientTypeErrorDescriptor.value
      : null;
  const ambientTypeErrorPrototypeDescriptor =
    typeof ambientTypeErrorCandidate === "function" &&
    !isProxy(ambientTypeErrorCandidate)
      ? getOwnPropertyDescriptor(ambientTypeErrorCandidate, "prototype")
      : undefined;
  legacyTypeErrorAuthorityAvailable = (
    localTypeErrorPrototype !== null &&
    typeof ambientTypeErrorCandidate === "function" &&
    !isProxy(ambientTypeErrorCandidate) &&
    ambientTypeErrorPrototypeDescriptor !== undefined &&
    !("get" in ambientTypeErrorPrototypeDescriptor) &&
    !("set" in ambientTypeErrorPrototypeDescriptor) &&
    ambientTypeErrorPrototypeDescriptor.value === localTypeErrorPrototype
  );
} catch {
  legacyTypeErrorAuthorityAvailable = false;
}

let createLegacyStructuredProviderAdapter = null;
if (promiseAuthorityAvailable && legacyTypeErrorAuthorityAvailable) {
  const legacyAdapter = require("./provider-adapter");
  if (
    legacyAdapter !== null &&
    typeof legacyAdapter === "object" &&
    typeof legacyAdapter.createStructuredProviderAdapter === "function"
  ) {
    createLegacyStructuredProviderAdapter =
      legacyAdapter.createStructuredProviderAdapter;
  }
}

let safePromiseConstructor = null;
if (promiseAuthorityAvailable) {
  try {
    safePromiseConstructor = objectCreate(null);
    defineProperty(safePromiseConstructor, promiseSpecies, {
      value: trustedPromiseConstructor,
      writable: false,
      enumerable: false,
      configurable: false
    });
    Object.freeze(safePromiseConstructor);
  } catch {
    safePromiseConstructor = null;
    promiseAuthorityAvailable = false;
  }
}

const CONTRACT_PROTECTION_SCHEMA = Object.freeze({
  dialect: "gotcha-structured-v1",
  type: "record",
  required: Object.freeze([
    "version", "task", "sourceAttackId", "ruleId", "protection"
  ]),
  additionalProperties: false,
  properties: Object.freeze({
    version: Object.freeze({ type: "literal", value: 1 }),
    task: Object.freeze({ type: "string", minLength: 1 }),
    sourceAttackId: Object.freeze({ type: "string", minLength: 1 }),
    ruleId: Object.freeze({ type: "string", minLength: 1 }),
    protection: Object.freeze({
      type: "record",
      required: Object.freeze(["statement", "rationale"]),
      additionalProperties: false,
      properties: Object.freeze({
        statement: Object.freeze({ type: "string", minLength: 1 }),
        rationale: Object.freeze({ type: "string", minLength: 1 })
      })
    })
  })
});

const adapterTypeErrorPrototype = (() => {
  try {
    null.m13AdapterBoundary;
  } catch (error) {
    return getPrototypeOf(error);
  }
  return null;
})();

function boundaryError() {
  try {
    null.m13AdapterBoundary;
  } catch (error) {
    return error;
  }
  return null;
}

async function rejectAdapterBoundaryPromise(error) {
  throw error;
}

function isLocalTypeError(error) {
  return (
    error !== null &&
    typeof error === "object" &&
    adapterTypeErrorPrototype !== null &&
    getPrototypeOf(error) === adapterTypeErrorPrototype
  );
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
  if (isUnsupportedRuntimeObject(value)) {
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
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string" || !expectedKeyContains(expectedKeys, key)) {
      throw boundaryError(`${label} has an invalid key set.`);
    }
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || "get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label} must use data properties only.`);
    }
  }
  for (let index = 0; index < expectedKeys.length; index += 1) {
    if (descriptors[expectedKeys[index]] === undefined) {
      throw boundaryError(`${label} is missing ${expectedKeys[index]}.`);
    }
  }
  return descriptors;
}

function assertSafePrimitive(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && numberIsFinite(value)) return;
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
  ) throw boundaryError(`${label} has an invalid array length.`);

  const length = lengthDescriptor.value;
  const entries = new ArrayConstructor();
  const keys = ownKeys(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "length") continue;
    if (typeof key !== "string") throw boundaryError(`${label} must not contain symbol keys.`);
    const numeric = numberConstructor(key);
    if (
      !numberIsInteger(numeric) || numeric < 0 || numeric >= length ||
      stringConstructor(numeric) !== key
    ) throw boundaryError(`${label} has an invalid array property.`);
    assertDataDescriptor(descriptors[key], `${label}[${numeric}]`);
  }
  for (let index = 0; index < length; index += 1) {
    const key = stringConstructor(index);
    const descriptor = descriptors[key];
    if (descriptor === undefined) throw boundaryError(`${label} must not be sparse.`);
    assertDataDescriptor(descriptor, `${label}[${index}]`);
    appendInternal(entries, { key, value: descriptor.value, label: `${label}[${index}]` });
  }
  return { entries, length };
}

function captureRecordEntries(value, label, descriptors) {
  const entries = new ArrayConstructor();
  const keys = ownKeys(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (typeof key !== "string") throw boundaryError(`${label} must not contain symbol keys.`);
    assertDataDescriptor(descriptors[key], `${label}.${key}`);
    appendInternal(entries, { key, value: descriptors[key].value, label: `${label}.${key}` });
  }
  return entries;
}

function prepareInvocationNode(value, label, active) {
  if (value === null || typeof value !== "object") {
    assertSafePrimitive(value, label);
    return { value, frame: null };
  }
  if (isProxy(value) || isUnsupportedRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (reflectApply(weakSetHas, active, [value])) {
    throw boundaryError(`${label} must not contain cycles.`);
  }
  const descriptors = getOwnPropertyDescriptors(value);
  let entries;
  let target;
  if (arrayIsArray(value)) {
    const captured = captureArrayEntries(value, label, descriptors);
    entries = captured.entries;
    target = new ArrayConstructor(captured.length);
  } else {
    entries = captureRecordEntries(value, label, descriptors);
    target = objectCreate(null);
  }
  reflectApply(weakSetAdd, active, [value]);
  return { value: target, frame: { source: value, target, entries, index: 0, active } };
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
    const entry = frame.entries[frame.index++];
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
    if (root) throw boundaryError("provider response output root must be a record.");
    assertSafePrimitive(value, label);
    return { value, frame: null };
  }
  if (isProxy(value) || isUnsupportedRuntimeObject(value)) {
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
    if (root) throw boundaryError("provider response output root must be a record.");
    if (prototype !== arrayPrototype) throw boundaryError(`${label} must be a local array.`);
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
  return { value: target, frame: { target, entries, index: 0, seen } };
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
    const entry = frame.entries[frame.index++];
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
      defineProperty(out, keys[index], {
        value: cloneSchema(value[keys[index]]),
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    return out;
  }
  return value;
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
  return detachProviderData(descriptors.output.value, "provider response.output", true);
}

function constructorDescriptorIsTrusted(descriptor) {
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === trustedPromiseConstructor
  );
}

function prototypeConstructorIsTrusted(promise) {
  if (getPrototypeOf(promise) !== trustedPromisePrototype) return false;
  return constructorDescriptorIsTrusted(
    getOwnPropertyDescriptor(trustedPromisePrototype, "constructor")
  );
}

function consumeRejectedRecognizedPromise(promise) {
  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.configurable !== true
  ) {
    if (!constructorDescriptorIsTrusted(constructorDescriptor)) return false;
    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);
    return true;
  }
  if (constructorDescriptor === undefined && isExtensible(promise) !== true) {
    return false;
  }
  defineProperty(promise, "constructor", {
    value: safePromiseConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let consumed = false;
  try {
    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);
    consumed = true;
  } finally {
    if (constructorDescriptor === undefined) {
      if (deleteProperty(promise, "constructor") !== true) consumed = false;
    } else {
      try {
        defineProperty(promise, "constructor", constructorDescriptor);
      } catch {
        consumed = false;
      }
    }
  }
  return consumed;
}

function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.configurable !== true
  ) {
    if (!constructorDescriptorIsTrusted(constructorDescriptor)) throw boundaryError();
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
  if (
    constructorDescriptor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!prototypeConstructorIsTrusted(promise)) throw boundaryError();
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
  defineProperty(promise, "constructor", {
    value: safePromiseConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let restored = false;
  try {
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
  } finally {
    if (constructorDescriptor === undefined) {
      restored = deleteProperty(promise, "constructor") === true;
    } else {
      try {
        defineProperty(promise, "constructor", constructorDescriptor);
        restored = true;
      } catch {
        restored = false;
      }
    }
  }
  if (!restored) throw boundaryError();
}

function isClassConstructor(value) {
  const source = reflectApply(functionToString, value, []);
  if (!reflectApply(stringStartsWith, source, ["class"])) return false;
  const separator = source[5];
  return (
    separator === " " || separator === "\n" || separator === "\r" ||
    separator === "\t" || separator === "{" || separator === "/"
  );
}

function buildOutputFormat() {
  return {
    version: 1,
    kind: "gotcha-output-format",
    mode: "contract-protection",
    schema: cloneSchema(CONTRACT_PROTECTION_SCHEMA)
  };
}

function createContractProtectionAdapter(options, descriptors) {
  const transport = descriptors.transport.value;
  const model = descriptors.model.value;
  if (
    typeof transport !== "function" || isProxy(transport) || isClassConstructor(transport)
  ) throw boundaryError("transport must be a non-Proxy callable function.");
  if (
    typeof model !== "string" || model.length === 0 ||
    reflectApply(stringTrim, model, []) !== model
  ) throw boundaryError("model must be a non-empty canonical string.");

  return function contractProtectionProviderGenerator(generatorRequest) {
    if (
      !promiseAuthorityAvailable ||
      typeof trustedPromiseConstructor !== "function"
    ) {
      return rejectAdapterBoundaryPromise(
        boundaryError("Promise authority is unavailable.")
      );
    }
    return new trustedPromiseConstructor((resolve, reject) => {
      let request;
      try {
        const requestDescriptors = exactDataDescriptors(
          generatorRequest,
          ["task", "case", "source", "rule", "attack", "instructions"],
          "generator request",
          false
        );
        const instructions = requestDescriptors.instructions.value;
        if (instructions !== CONTRACT_PROTECTION_INSTRUCTIONS_V1) {
          throw boundaryError("instructions must match M13 contract-protection instructions.");
        }
        request = {
          version: 1,
          kind: "gotcha-provider-request",
          mode: "contract-protection",
          model,
          instructions,
          outputFormat: buildOutputFormat(),
          input: {
            task: projectInvocationData(requestDescriptors.task.value, "generator request.task"),
            case: projectInvocationData(requestDescriptors.case.value, "generator request.case"),
            source: projectInvocationData(requestDescriptors.source.value, "generator request.source"),
            rule: projectInvocationData(requestDescriptors.rule.value, "generator request.rule"),
            attack: projectInvocationData(requestDescriptors.attack.value, "generator request.attack")
          }
        };
      } catch (error) {
        reject(isLocalTypeError(error) ? error : boundaryError("generator request capture failed."));
        return;
      }

      let transportResult;
      try {
        transportResult = reflectApply(transport, undefined, [request]);
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

      if (
        transportResult !== null &&
        typeof transportResult === "object" &&
        !isProxy(transportResult) &&
        reflectApply(isPromise, utilTypes, [transportResult])
      ) {
        try {
          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {
            consumeRejectedRecognizedPromise(transportResult);
            throw boundaryError("transport Promise has an unsupported current prototype.");
          }
          observeAcceptedPromise(transportResult, settleResponse, reject);
        } catch (error) {
          reject(isLocalTypeError(error) ? error : boundaryError("transport Promise cannot be safely observed."));
        }
        return;
      }

      if (
        transportResult !== null &&
        (typeof transportResult === "object" || typeof transportResult === "function")
      ) {
        settleResponse(transportResult);
        return;
      }

      reject(boundaryError("transport must return a provider response record or accepted Promise."));
    });
  };
}

function createStructuredProviderAdapter(options) {
  const descriptors = exactDataDescriptors(
    options,
    ["transport", "model", "mode"],
    "adapter options",
    true
  );
  if (descriptors.mode.value !== "contract-protection") {
    if (typeof createLegacyStructuredProviderAdapter !== "function") {
      throw boundaryError("legacy provider adapter authority is unavailable.");
    }
    return createLegacyStructuredProviderAdapter(options);
  }
  return createContractProtectionAdapter(options, descriptors);
}

module.exports = {
  createStructuredProviderAdapter
};