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

// Bind every public implementation to the same authenticated package-load
// generation. Caller mutations after require("gotcha-ai") must never become
// first-use module-initialization authority.
let boundImplementations = null;

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

function bindImplementationGeneration() {
  if (
    packageAuthority === null ||
    packageAuthority.available !== true ||
    !promiseAuthorityAvailable()
  ) return null;

  try {
    const quality = require("./quality-contract");
    const attacks = require("./contract-attacks");
    const remediation = require("./contract-remediation");
    const proposal = require("./contract-protection-proposal");
    const provider = require("./provider-adapter-m13");
    const qualityLoop = require("./contract-quality-loop");
    const mutationPack = require("./mutation-pack");
    const engine = require("./engine");

    const bound = {
      draftQualityContract: quality.draftQualityContract,
      confirmQualityContract: quality.confirmQualityContract,
      runContractAttacks: attacks.runContractAttacks,
      draftContractProtection: remediation.draftContractProtection,
      confirmContractProtection: remediation.confirmContractProtection,
      verifyContractProtection: remediation.verifyContractProtection,
      generateContractProtectionProposal:
        proposal.generateContractProtectionProposal,
      createStructuredProviderAdapter:
        provider.createStructuredProviderAdapter,
      prepareContractQualityLoop: qualityLoop.prepareContractQualityLoop,
      completeContractQualityLoop: qualityLoop.completeContractQualityLoop,
      compileMutationPack: mutationPack.compileMutationPack,
      runImprovementLoop: engine.runImprovementLoop
    };

    if (
      typeof bound.draftQualityContract !== "function" ||
      typeof bound.confirmQualityContract !== "function" ||
      typeof bound.runContractAttacks !== "function" ||
      typeof bound.draftContractProtection !== "function" ||
      typeof bound.confirmContractProtection !== "function" ||
      typeof bound.verifyContractProtection !== "function" ||
      typeof bound.generateContractProtectionProposal !== "function" ||
      typeof bound.createStructuredProviderAdapter !== "function" ||
      typeof bound.prepareContractQualityLoop !== "function" ||
      typeof bound.completeContractQualityLoop !== "function" ||
      typeof bound.compileMutationPack !== "function" ||
      typeof bound.runImprovementLoop !== "function"
    ) return null;

    return bound;
  } catch {
    return null;
  }
}

function runGotcha({ evaluator, expectedOutput, mutationPack }) {
  if (
    runtimeAuthority === null ||
    runtimeAuthority.consumerPrimordialsAvailable !== true ||
    boundImplementations === null
  ) throw makeBoundaryError();
  const compileMutationPack = boundImplementations.compileMutationPack;
  const runImprovementLoop = boundImplementations.runImprovementLoop;
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

function defineLazyExport(name, unavailable) {
  if (typeof bootstrapDefineProperty !== "function") return;
  try {
    bootstrapDefineProperty(exported, name, {
      enumerable: true,
      configurable: false,
      get() {
        if (
          !promiseAuthorityAvailable() ||
          boundImplementations === null
        ) return unavailable;
        const implementation = boundImplementations[name];
        return typeof implementation === "function"
          ? implementation
          : unavailable;
      }
    });
  } catch {
    // The predeclared own data property remains the fail-closed boundary.
  }
}

boundImplementations = bindImplementationGeneration();

// These public surfaces all participate in modules that can transitively load
// host runtime code. Under unavailable authority, the predeclared local
// boundaries prevent Node internals from touching rejected caller hooks.
defineLazyExport(
  "draftQualityContract",
  unavailableSyncBoundary
);
defineLazyExport(
  "confirmQualityContract",
  unavailableSyncBoundary
);
defineLazyExport(
  "runContractAttacks",
  unavailableAsyncBoundary
);
defineLazyExport(
  "draftContractProtection",
  unavailableAsyncBoundary
);
defineLazyExport(
  "confirmContractProtection",
  unavailableAsyncBoundary
);
defineLazyExport(
  "verifyContractProtection",
  unavailableAsyncBoundary
);
defineLazyExport(
  "generateContractProtectionProposal",
  unavailableAsyncBoundary
);
defineLazyExport(
  "createStructuredProviderAdapter",
  unavailableAdapterBoundary
);
defineLazyExport(
  "prepareContractQualityLoop",
  unavailableAsyncBoundary
);
defineLazyExport(
  "completeContractQualityLoop",
  unavailableAsyncBoundary
);

module.exports = exported;
