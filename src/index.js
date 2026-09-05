"use strict";

// Authority-bearing modules must share one capture generation. A caller may
// preload one of these modules before requiring the package root; invalidate a
// fixed, explicit list before root capture so lazy public exports cannot mix
// stale and fresh authority objects. Avoid ambient Set/Object.keys/Array
// helpers and graph traversal at this pre-authority boundary.
const authorityConsumerModulePaths = [
  "./ai-data-core",
  "./ai-data",
  "./contract-attacks-core",
  "./contract-attacks",
  "./contract-experiment-hook",
  "./contract-experiment-safe",
  "./contract-experiment",
  "./contract-protection-proposal",
  "./contract-quality-loop",
  "./contract-remediation",
  "./engine",
  "./mutation-pack",
  "./provider-adapter-m13",
  "./provider-adapter",
  "./quality-contract"
];
for (let index = 0; index < authorityConsumerModulePaths.length; index += 1) {
  try {
    delete require.cache[require.resolve(authorityConsumerModulePaths[index])];
  } catch {}
}

let runtimeAuthority = null;
try {
  runtimeAuthority = require("./runtime-authority");
} catch {
  runtimeAuthority = null;
}

function makeBoundaryError() {
  try {
    null.gotchaBoundary;
  } catch (error) {
    return error;
  }
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
    runtimeAuthority.consumerPrimordialsAvailable === true &&
    runtimeAuthority.promiseAuthorityAvailable === true &&
    typeof runtimeAuthority.promiseConstructor === "function" &&
    runtimeAuthority.promisePrototype !== null &&
    typeof runtimeAuthority.promiseThen === "function" &&
    typeof runtimeAuthority.promiseSpecies === "symbol"
  );
}

function runGotcha({ evaluator, expectedOutput, mutationPack }) {
  if (
    runtimeAuthority === null ||
    runtimeAuthority.consumerPrimordialsAvailable !== true
  ) throw makeBoundaryError();
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
