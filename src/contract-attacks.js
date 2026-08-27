"use strict";

const {
  types: utilTypes
} = require("node:util");

const {
  buildExperiment,
  createExperimentCapture,
  createGeneratorEvidenceRecorder
} = require("./contract-experiment-safe");

const {
  runContractAttacks:
    runContractAttacksCore
} = require("./contract-attacks-core");

const defineProperty =
  Object.defineProperty;
const getOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const getOwnPropertyDescriptors =
  Object.getOwnPropertyDescriptors;
const getPrototypeOf =
  Object.getPrototypeOf;
const objectCreate =
  Object.create;
const objectFreeze =
  Object.freeze;
const isExtensible =
  Object.isExtensible;
const deleteProperty =
  Reflect.deleteProperty;
const reflectApply =
  Reflect.apply;
const functionToString =
  Function.prototype.toString;
const isProxy =
  utilTypes.isProxy;
const isPromise =
  utilTypes.isPromise;

const promiseConstructor = Promise;
const promisePrototype = Promise.prototype;
const promiseThen = Promise.prototype.then;
const promiseSpecies = Symbol.species;
const promisePrototypeConstructorDescriptor =
  getOwnPropertyDescriptor(
    promisePrototype,
    "constructor"
  );
const promiseSpeciesDescriptor =
  getOwnPropertyDescriptor(
    promiseConstructor,
    promiseSpecies
  );
const promiseConstructorSource =
  reflectApply(
    functionToString,
    promiseConstructor,
    []
  );
const promiseSpeciesGetterSource =
  promiseSpeciesDescriptor !== undefined &&
  typeof promiseSpeciesDescriptor.get ===
    "function"
    ? reflectApply(
        functionToString,
        promiseSpeciesDescriptor.get,
        []
      )
    : null;

const safePromiseSpeciesContainer = {};
defineProperty(
  safePromiseSpeciesContainer,
  promiseSpecies,
  {
    value: promiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  }
);
objectFreeze(
  safePromiseSpeciesContainer
);

function canInstallSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    return isExtensible(holder);
  }

  if (descriptor.configurable) {
    return true;
  }

  return (
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.writable
  );
}

function installSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable: false,
        configurable: true
      }
    );
    return;
  }

  if (descriptor.configurable) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable:
          descriptor.enumerable,
        configurable: true
      }
    );
    return;
  }

  defineProperty(
    holder,
    "constructor",
    {
      value:
        safePromiseSpeciesContainer
    }
  );
}

function restorePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(
      holder,
      "constructor"
    );
    return;
  }

  defineProperty(
    holder,
    "constructor",
    descriptor
  );
}

function withTemporarySafePromiseConstructor(
  holder,
  descriptor,
  callback
) {
  installSafePromiseConstructor(
    holder,
    descriptor
  );

  try {
    return callback();
  } finally {
    restorePromiseConstructor(
      holder,
      descriptor
    );
  }
}

function isAuthenticatedStandardPromisePrototype(
  prototype,
  constructorDescriptor
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    isProxy(prototype) ||
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    typeof constructorDescriptor.value !==
      "function" ||
    isProxy(
      constructorDescriptor.value
    ) ||
    promiseSpeciesGetterSource === null
  ) {
    return false;
  }

  const constructor =
    constructorDescriptor.value;

  let constructorSource;
  let prototypeDescriptor;
  let speciesDescriptor;
  let speciesGetterSource;

  try {
    constructorSource =
      reflectApply(
        functionToString,
        constructor,
        []
      );
    prototypeDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );
    speciesDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        promiseSpecies
      );
    speciesGetterSource =
      speciesDescriptor !== undefined &&
      typeof speciesDescriptor.get ===
        "function" &&
      !isProxy(
        speciesDescriptor.get
      )
        ? reflectApply(
            functionToString,
            speciesDescriptor.get,
            []
          )
        : null;
  } catch {
    return false;
  }

  return (
    constructorSource ===
      promiseConstructorSource &&
    prototypeDescriptor !==
      undefined &&
    !("get" in prototypeDescriptor) &&
    !("set" in prototypeDescriptor) &&
    prototypeDescriptor.value ===
      prototype &&
    speciesDescriptor !== undefined &&
    !("value" in speciesDescriptor) &&
    speciesDescriptor.set === undefined &&
    speciesGetterSource ===
      promiseSpeciesGetterSource
  );
}

function withSafePromiseConstructor(
  value,
  callback
) {
  if (
    typeof isPromise !== "function" ||
    !isPromise(value) ||
    isProxy(value)
  ) {
    throw new Error(
      "Generator native Promise must be a genuine Promise object."
    );
  }

  const ownConstructor =
    getOwnPropertyDescriptor(
      value,
      "constructor"
    );
  const prototype =
    getPrototypeOf(value);

  if (
    canInstallSafePromiseConstructor(
      value,
      ownConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      value,
      ownConstructor,
      callback
    );
  }

  if (ownConstructor !== undefined) {
    if (
      !("get" in ownConstructor) &&
      !("set" in ownConstructor) &&
      (
        ownConstructor.value ===
          promiseConstructor ||
        ownConstructor.value ===
          undefined ||
        isAuthenticatedStandardPromisePrototype(
          prototype,
          ownConstructor
        )
      )
    ) {
      return callback();
    }

    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  if (
    prototype === null ||
    typeof prototype !== "object" ||
    isProxy(prototype)
  ) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototypeConstructor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    canInstallSafePromiseConstructor(
      prototype,
      prototypeConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      prototype,
      prototypeConstructor,
      callback
    );
  }

  if (
    isAuthenticatedStandardPromisePrototype(
      prototype,
      prototypeConstructor
    )
  ) {
    return callback();
  }

  throw new Error(
    "Native Promise cannot be observed safely."
  );
}

function makeCoreOptions(
  options,
  recordGeneratorEvidence
) {
  if (
    options === null ||
    typeof options !== "object" ||
    isProxy(options)
  ) {
    return options;
  }

  const generatorDescriptor =
    getOwnPropertyDescriptor(
      options,
      "generator"
    );

  if (
    generatorDescriptor === undefined ||
    !(
      "value" in generatorDescriptor
    ) ||
    typeof generatorDescriptor.value !==
      "function"
  ) {
    return options;
  }

  const originalGenerator =
    generatorDescriptor.value;
  const descriptors =
    getOwnPropertyDescriptors(options);

  function captureAndReturn(value) {
    try {
      recordGeneratorEvidence(value);
    } catch {
      // Experiment evidence is observational only and must never change M8 behavior.
    }

    return value;
  }

  function bridgeAndCapturePromise(
    rawPromise
  ) {
    return new promiseConstructor(
      (resolve, reject) => {
        withSafePromiseConstructor(
          rawPromise,
          () =>
            reflectApply(
              promiseThen,
              rawPromise,
              [
                (value) => {
                  resolve(
                    captureAndReturn(value)
                  );
                },
                reject
              ]
            )
        );
      }
    );
  }

  defineProperty(
    descriptors,
    "generator",
    {
      value: {
        value:
          function experimentCapturingGenerator(
            ...args
          ) {
            const rawOutput =
              reflectApply(
                originalGenerator,
                this,
                args
              );

            if (
              typeof isPromise === "function" &&
              isPromise(rawOutput)
            ) {
              return bridgeAndCapturePromise(
                rawOutput
              );
            }

            return captureAndReturn(
              rawOutput
            );
          },
        writable:
          generatorDescriptor.writable,
        enumerable:
          generatorDescriptor.enumerable,
        configurable:
          generatorDescriptor.configurable
      },
      writable: true,
      enumerable: true,
      configurable: true
    }
  );

  return objectCreate(
    getPrototypeOf(options),
    descriptors
  );
}

async function runContractAttacks(
  options = {}
) {
  const experimentCapture =
    createExperimentCapture(options);
  const recordGeneratorEvidence =
    createGeneratorEvidenceRecorder(
      experimentCapture
    );
  const coreOptions =
    makeCoreOptions(
      options,
      recordGeneratorEvidence
    );

  const result =
    await runContractAttacksCore(
      coreOptions
    );

  const experiment =
    buildExperiment(
      experimentCapture,
      result
    );

  defineProperty(
    result,
    "experiment",
    {
      value: experiment,
      writable: true,
      enumerable: true,
      configurable: true
    }
  );

  return result;
}

module.exports = {
  runContractAttacks
};
