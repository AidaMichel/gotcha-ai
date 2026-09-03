"use strict";

const packageAuthorityModules = [
  "./package-authority",
  "./runtime-authority",
  "./ai-data-core",
  "./provider-adapter"
];
for (const modulePath of packageAuthorityModules) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {}
}

const packageAuthority = require("./package-authority");
const bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const bootstrapDefineProperty = Object.defineProperty;

let runtimeAuthority = null;
let bootstrapInspectModule = null;
let bootstrapInspectDescriptor = null;
let bootstrapInspectNeutralized = false;
let bootstrapRuntimeLoadAllowed = true;

try {
  bootstrapInspectModule = require("node:util");
  const descriptor = bootstrapGetOwnPropertyDescriptor(
    bootstrapInspectModule,
    "inspect"
  );
  if (
    descriptor !== undefined &&
    ("get" in descriptor || "set" in descriptor)
  ) {
    if (descriptor.configurable !== true) {
      bootstrapRuntimeLoadAllowed = false;
    } else {
      bootstrapInspectDescriptor = descriptor;
      bootstrapDefineProperty(bootstrapInspectModule, "inspect", {
        value: function gotchaBootstrapInspect() { return ""; },
        writable: true,
        enumerable: descriptor.enumerable,
        configurable: true
      });
      bootstrapInspectNeutralized = true;
    }
  }
} catch {
  bootstrapRuntimeLoadAllowed = false;
}

if (bootstrapRuntimeLoadAllowed) {
  try {
    runtimeAuthority = require("./runtime-authority");
  } catch {
    runtimeAuthority = null;
  }
}

if (bootstrapInspectNeutralized) {
  try {
    bootstrapDefineProperty(
      bootstrapInspectModule,
      "inspect",
      bootstrapInspectDescriptor
    );
  } catch {
    runtimeAuthority = null;
  }
}

function makeBoundaryError() {
  try {
    null.gotchaBoundary;
  } catch (error) {
    return error;
  }
  return new Error("Gotcha runtime authority is unavailable.");
}

function unavailableSyncBoundary() {
  throw makeBoundaryError();
}

async function unavailableAsyncBoundary() {
  throw makeBoundaryError();
}

function unavailableAdapterBoundary() {
  return async function unavailableProviderGenerator() {
    throw makeBoundaryError();
  };
}

function promiseAuthorityAvailable() {
  return (
    runtimeAuthority !== null &&
    runtimeAuthority.promiseAuthorityAvailable === true &&
    typeof runtimeAuthority.promiseConstructor === "function" &&
    runtimeAuthority.promisePrototype !== null &&
    typeof runtimeAuthority.promiseThen === "function" &&
    typeof runtimeAuthority.promiseSpecies === "symbol"
  );
}

function runGotcha({ evaluator, expectedOutput, mutationPack }) {
  const { compileMutationPack } = require("./mutation-pack");
  const { runImprovementLoop } = require("./engine");
  const mutations = compileMutationPack({
    output: expectedOutput,
    pack: mutationPack
  });
  return runImprovementLoop({
    evaluator,
    mutations,
    knownGoodOutput: expectedOutput
  });
}

const exported = { runGotcha };

function defineLazyExport(name, modulePath, unavailable) {
  Object.defineProperty(exported, name, {
    enumerable: true,
    configurable: false,
    get() {
      if (!promiseAuthorityAvailable()) return unavailable;
      return require(modulePath)[name];
    }
  });
}

// These public surfaces all participate in modules that can transitively load
// host runtime code. Under hostile Promise authority, returning a tiny local
// fail-closed boundary prevents Node internals from touching attacker hooks.
defineLazyExport(
  "draftQualityContract",
  "./quality-contract",
  unavailableSyncBoundary
);
defineLazyExport(
  "confirmQualityContract",
  "./quality-contract",
  unavailableSyncBoundary
);
defineLazyExport(
  "runContractAttacks",
  "./contract-attacks",
  unavailableAsyncBoundary
);
defineLazyExport(
  "draftContractProtection",
  "./contract-remediation",
  unavailableAsyncBoundary
);
defineLazyExport(
  "confirmContractProtection",
  "./contract-remediation",
  unavailableAsyncBoundary
);
defineLazyExport(
  "verifyContractProtection",
  "./contract-remediation",
  unavailableAsyncBoundary
);
defineLazyExport(
  "generateContractProtectionProposal",
  "./contract-protection-proposal",
  unavailableAsyncBoundary
);
defineLazyExport(
  "createStructuredProviderAdapter",
  "./provider-adapter-m13",
  unavailableAdapterBoundary
);
defineLazyExport(
  "prepareContractQualityLoop",
  "./contract-quality-loop",
  unavailableAsyncBoundary
);
defineLazyExport(
  "completeContractQualityLoop",
  "./contract-quality-loop",
  unavailableAsyncBoundary
);

module.exports = exported;
