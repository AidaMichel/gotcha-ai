"use strict";

const utilTypes = require("node:util").types;
const { Buffer } = require("node:buffer");

const remediation = require("./contract-remediation");

const isProxy = utilTypes.isProxy;
const isPromise = utilTypes.isPromise;
const bufferIsBuffer = Buffer.isBuffer;

const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const getPrototypeOf = Object.getPrototypeOf;
const isExtensible = Object.isExtensible;
const defineProperty = Object.defineProperty;
const ownKeys = Reflect.ownKeys;
const reflectApply = Reflect.apply;
const deleteProperty = Reflect.deleteProperty;
const arrayIsArray = Array.isArray;

const ObjectPrototype = Object.prototype;
const PromiseConstructor = Promise;
const PromisePrototype = Promise.prototype;
const PromiseThen = Promise.prototype.then;
const PromiseSpecies = Symbol.species;
const TypeErrorConstructor = TypeError;

const draftContractProtection = remediation.draftContractProtection;
const confirmContractProtection = remediation.confirmContractProtection;
const verifyContractProtection = remediation.verifyContractProtection;

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
  bufferIsBuffer
];

let authorityAvailable = true;

const requiredFunctions = [
  isProxy,
  isPromise,
  bufferIsBuffer,
  getOwnPropertyDescriptors,
  getOwnPropertyDescriptor,
  getPrototypeOf,
  isExtensible,
  defineProperty,
  ownKeys,
  reflectApply,
  deleteProperty,
  arrayIsArray,
  PromiseConstructor,
  PromiseThen,
  TypeErrorConstructor,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
];

for (let index = 0; index < requiredFunctions.length; index += 1) {
  if (typeof requiredFunctions[index] !== "function") {
    authorityAvailable = false;
    break;
  }
}

if (authorityAvailable) {
  for (let index = 0; index < forbiddenProbes.length; index += 1) {
    if (typeof forbiddenProbes[index] !== "function") {
      authorityAvailable = false;
      break;
    }
  }
}

if (authorityAvailable) {
  try {
    if (
      isProxy(draftContractProtection) === true ||
      isProxy(confirmContractProtection) === true ||
      isProxy(verifyContractProtection) === true
    ) {
      authorityAvailable = false;
    }
  } catch {
    authorityAvailable = false;
  }
}

const safePromiseSpeciesContainer = {};
if (typeof defineProperty === "function") {
  try {
    defineProperty(safePromiseSpeciesContainer, PromiseSpecies, {
      value: PromiseConstructor,
      writable: false,
      enumerable: false,
      configurable: false
    });
  } catch {
    authorityAvailable = false;
  }
} else {
  authorityAvailable = false;
}

function boundaryError() {
  return new TypeErrorConstructor("Invalid M12 contract-quality-loop boundary.");
}

function call(method, receiver, args) {
  return reflectApply(method, receiver, args);
}

function descriptorField(descriptor, key) {
  const field = getOwnPropertyDescriptor(descriptor, key);
  return field === undefined ? undefined : field.value;
}

function ordinaryDataDescriptor(descriptor) {
  if (descriptor === undefined || descriptor === null || typeof descriptor !== "object") {
    return false;
  }

  return (
    getOwnPropertyDescriptor(descriptor, "value") !== undefined &&
    getOwnPropertyDescriptor(descriptor, "get") === undefined &&
    getOwnPropertyDescriptor(descriptor, "set") === undefined &&
    descriptorField(descriptor, "writable") === true &&
    descriptorField(descriptor, "enumerable") === true &&
    descriptorField(descriptor, "configurable") === true
  );
}

function hasForbiddenBrand(value) {
  try {
    for (let index = 0; index < forbiddenProbes.length; index += 1) {
      if (call(forbiddenProbes[index], undefined, [value]) === true) {
        return true;
      }
    }
  } catch {
    throw boundaryError();
  }

  return false;
}

function sameKeySet(keys, expectedKeys, exactOrder) {
  if (keys.length !== expectedKeys.length) {
    return false;
  }

  if (exactOrder) {
    for (let index = 0; index < expectedKeys.length; index += 1) {
      if (keys[index] !== expectedKeys[index]) {
        return false;
      }
    }
    return true;
  }

  for (let index = 0; index < keys.length; index += 1) {
    if (typeof keys[index] !== "string") {
      return false;
    }

    let found = false;
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      if (keys[index] === expectedKeys[expectedIndex]) {
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }
  }

  return true;
}

function captureRecord(value, expectedKeys, allowedPrototypes, exactOrder) {
  if (!authorityAvailable) {
    throw boundaryError();
  }

  if (
    value === null ||
    typeof value !== "object" ||
    arrayIsArray(value) === true ||
    isProxy(value) === true ||
    hasForbiddenBrand(value) ||
    isExtensible(value) !== true
  ) {
    throw boundaryError();
  }

  const prototype = getPrototypeOf(value);
  let prototypeAccepted = false;
  for (let index = 0; index < allowedPrototypes.length; index += 1) {
    if (prototype === allowedPrototypes[index]) {
      prototypeAccepted = true;
      break;
    }
  }

  if (!prototypeAccepted) {
    throw boundaryError();
  }

  const descriptors = getOwnPropertyDescriptors(value);
  const keys = ownKeys(descriptors);

  if (!sameKeySet(keys, expectedKeys, exactOrder)) {
    throw boundaryError();
  }

  const captured = {};

  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const mapEntry = getOwnPropertyDescriptor(descriptors, key);
    if (mapEntry === undefined) {
      throw boundaryError();
    }

    const descriptor = mapEntry.value;
    if (!ordinaryDataDescriptor(descriptor)) {
      throw boundaryError();
    }

    defineProperty(captured, key, {
      value: descriptorField(descriptor, "value"),
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  return captured;
}

function capturePrepareOptions(options) {
  return captureRecord(
    options,
    ["experiment", "sourceAttackId", "proposal"],
    [ObjectPrototype],
    false
  );
}

function captureCompleteOptions(options) {
  return captureRecord(
    options,
    ["checkpoint", "decision", "evaluator", "improvedEvaluator"],
    [ObjectPrototype],
    false
  );
}

function captureCheckpoint(checkpoint) {
  const captured = captureRecord(
    checkpoint,
    ["version", "kind", "state", "draft"],
    [ObjectPrototype, null],
    true
  );

  if (
    captured.version !== 1 ||
    captured.kind !== "contract-quality-loop-checkpoint" ||
    captured.state !== "awaiting-confirmation"
  ) {
    throw boundaryError();
  }

  return captured;
}

function acceptedEvaluator(value) {
  return (
    typeof value === "function" &&
    isProxy(value) === false
  );
}

function defineOrdinary(record, key, value) {
  defineProperty(record, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

function makeOrdinaryRecord(entries) {
  const record = {};
  for (let index = 0; index < entries.length; index += 1) {
    defineOrdinary(record, entries[index][0], entries[index][1]);
  }
  return record;
}

function makeNullPrototypeRecord(entries) {
  const record = { __proto__: null };
  for (let index = 0; index < entries.length; index += 1) {
    defineOrdinary(record, entries[index][0], entries[index][1]);
  }
  return record;
}

function makeCheckpoint(draft) {
  return makeNullPrototypeRecord([
    ["version", 1],
    ["kind", "contract-quality-loop-checkpoint"],
    ["state", "awaiting-confirmation"],
    ["draft", draft]
  ]);
}

function makeRejectedResult(protection) {
  return makeNullPrototypeRecord([
    ["version", 1],
    ["kind", "contract-quality-loop-result"],
    ["state", "rejected"],
    ["protection", protection],
    ["verification", null]
  ]);
}

function makeVerifiedResult(protection, verification) {
  return makeNullPrototypeRecord([
    ["version", 1],
    ["kind", "contract-quality-loop-result"],
    ["state", verification.state],
    ["protection", protection],
    ["verification", verification]
  ]);
}

function observeDelegatedPromise(promise, onFulfilled, onRejected) {
  if (
    !authorityAvailable ||
    isProxy(promise) === true ||
    isPromise(promise) !== true ||
    getPrototypeOf(promise) !== PromisePrototype ||
    isExtensible(promise) !== true ||
    getOwnPropertyDescriptor(promise, "constructor") !== undefined
  ) {
    throw boundaryError();
  }

  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });

  let observation;
  try {
    observation = call(PromiseThen, promise, [onFulfilled, onRejected]);
  } finally {
    if (deleteProperty(promise, "constructor") !== true) {
      throw boundaryError();
    }
  }

  return observation;
}

function createPublicPromise(start) {
  return new PromiseConstructor((resolve, reject) => {
    try {
      start(resolve, reject);
    } catch {
      reject(boundaryError());
    }
  });
}

function prepareContractQualityLoop(options) {
  let delegatedPromise = null;
  let captureFailure = null;

  try {
    const captured = capturePrepareOptions(options);
    const delegatedOptions = makeOrdinaryRecord([
      ["experiment", captured.experiment],
      ["sourceAttackId", captured.sourceAttackId],
      ["proposal", captured.proposal]
    ]);
    delegatedPromise = draftContractProtection(delegatedOptions);
  } catch {
    captureFailure = boundaryError();
  }

  return createPublicPromise((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    observeDelegatedPromise(
      delegatedPromise,
      (draft) => {
        try {
          resolve(makeCheckpoint(draft));
        } catch {
          reject(boundaryError());
        }
      },
      (reason) => {
        reject(reason);
      }
    );
  });
}

function completeContractQualityLoop(options) {
  let delegatedConfirmation = null;
  let capturedEvaluator = null;
  let capturedImprovedEvaluator = null;
  let captureFailure = null;

  try {
    const captured = captureCompleteOptions(options);
    const checkpoint = captureCheckpoint(captured.checkpoint);

    if (
      !acceptedEvaluator(captured.evaluator) ||
      !acceptedEvaluator(captured.improvedEvaluator)
    ) {
      throw boundaryError();
    }

    capturedEvaluator = captured.evaluator;
    capturedImprovedEvaluator = captured.improvedEvaluator;

    delegatedConfirmation = confirmContractProtection(
      makeOrdinaryRecord([
        ["draft", checkpoint.draft],
        ["decision", captured.decision]
      ])
    );
  } catch {
    captureFailure = boundaryError();
  }

  return createPublicPromise((resolve, reject) => {
    if (captureFailure !== null) {
      reject(captureFailure);
      return;
    }

    observeDelegatedPromise(
      delegatedConfirmation,
      (protection) => {
        try {
          if (protection.status === "rejected") {
            resolve(makeRejectedResult(protection));
            return;
          }

          if (protection.status !== "confirmed") {
            reject(boundaryError());
            return;
          }

          let verificationPromise;
          try {
            verificationPromise = verifyContractProtection(
              makeOrdinaryRecord([
                ["protection", protection],
                ["evaluator", capturedEvaluator],
                ["improvedEvaluator", capturedImprovedEvaluator]
              ])
            );
          } catch {
            reject(boundaryError());
            return;
          }

          try {
            observeDelegatedPromise(
              verificationPromise,
              (verification) => {
                try {
                  resolve(makeVerifiedResult(protection, verification));
                } catch {
                  reject(boundaryError());
                }
              },
              (reason) => {
                reject(reason);
              }
            );
          } catch {
            reject(boundaryError());
          }
        } catch {
          reject(boundaryError());
        }
      },
      (reason) => {
        reject(reason);
      }
    );
  });
}

module.exports = {
  prepareContractQualityLoop,
  completeContractQualityLoop
};
