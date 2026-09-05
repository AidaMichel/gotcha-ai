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

let packageAuthority = null;
try {
  packageAuthority = require("./package-authority");
} catch {
  packageAuthority = null;
}
const bootstrapDefineProperty = (
  packageAuthority !== null &&
  typeof packageAuthority === "object" &&
  typeof packageAuthority.ObjectDefineProperty === "function"
) ? packageAuthority.ObjectDefineProperty : null;

let runtimeAuthority = null;
if (packageAuthority !== null) {
  try {
    runtimeAuthority = require("./runtime-authority");
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

// Start from a complete fail-closed data surface. Object-literal property
// creation does not consult inherited setters. Only authenticated
// Object.defineProperty authority may replace these slots with lazy getters.
const exported = {
  runGotcha,
  draftQualityContract: unavailableSyncBoundary,
  confirmQualityContract: unavailableSyncBoundary,
  runContractAttacks: unavailableAsyncBoundary,
  draftContractProtection: unavailableAsyncBoundary,
  confirmContractProtection: unavailableAsyncBoundary,
  verifyContractProtection: unavailableAsyncBoundary,
  generateContractProtectionProposal: unavailableAsyncBoundary,
  createStructuredProviderAdapter: unavailableAdapterBoundary,
  prepareContractQualityLoop: unavailableAsyncBoundary,
  completeContractQualityLoop: unavailableAsyncBoundary
};

function defineLazyExport(name, modulePath, unavailable) {
  if (typeof bootstrapDefineProperty !== "function") return;
  try {
    bootstrapDefineProperty(exported, name, {
      enumerable: true,
      configurable: false,
      get() {
        if (!promiseAuthorityAvailable()) return unavailable;
        return require(modulePath)[name];
      }
    });
  } catch {
    // The predeclared own data property remains the fail-closed boundary.
  }
}

// These public surfaces all participate in modules that can transitively load
// host runtime code. Under unavailable authority, the predeclared local
// boundaries prevent Node internals from touching rejected caller hooks.
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
