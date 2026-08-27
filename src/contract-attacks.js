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
const reflectApply =
  Reflect.apply;
const isProxy =
  utilTypes.isProxy;
const isPromise =
  utilTypes.isPromise;
const promiseThen =
  Promise.prototype.then;

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
              return reflectApply(
                promiseThen,
                rawOutput,
                [captureAndReturn]
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
