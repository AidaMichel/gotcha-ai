from pathlib import Path


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{label}: anchor not found")
    path.write_text(text.replace(old, new, 1))


index = Path("src/index.js")
replace_once(
    index,
    '''let runtimeAuthority = null;\nif (packageAuthority !== null) {\n  try {\n    runtimeAuthority = require("./runtime-authority");\n  } catch {\n    runtimeAuthority = null;\n  }\n}\n''',
    '''let runtimeAuthority = null;\nif (packageAuthority !== null) {\n  try {\n    runtimeAuthority = require("./runtime-authority");\n  } catch {\n    runtimeAuthority = null;\n  }\n}\n\n// Bind every public implementation to the same authenticated package-load\n// generation. Caller mutations after require("gotcha-ai") must never become\n// first-use module-initialization authority.\nlet boundImplementations = null;\n''',
    "index authority generation",
)

replace_once(
    index,
    '''function runGotcha({ evaluator, expectedOutput, mutationPack }) {\n  if (\n    runtimeAuthority === null ||\n    runtimeAuthority.consumerPrimordialsAvailable !== true\n  ) throw makeBoundaryError();\n  const { compileMutationPack } = require("./mutation-pack");\n  const { runImprovementLoop } = require("./engine");\n  const mutations = compileMutationPack({\n''',
    '''function runGotcha({ evaluator, expectedOutput, mutationPack }) {\n  if (\n    runtimeAuthority === null ||\n    runtimeAuthority.consumerPrimordialsAvailable !== true ||\n    boundImplementations === null\n  ) throw makeBoundaryError();\n  const compileMutationPack = boundImplementations.compileMutationPack;\n  const runImprovementLoop = boundImplementations.runImprovementLoop;\n  const mutations = compileMutationPack({\n''',
    "index runGotcha lazy require",
)

anchor = '''function promiseAuthorityAvailable() {\n  return (\n    runtimeAuthority !== null &&\n    runtimeAuthority.consumerPrimordialsAvailable === true &&\n    runtimeAuthority.promiseAuthorityAvailable === true &&\n    typeof runtimeAuthority.promiseConstructor === "function" &&\n    runtimeAuthority.promisePrototype !== null &&\n    typeof runtimeAuthority.promiseThen === "function" &&\n    typeof runtimeAuthority.promiseSpecies === "symbol"\n  );\n}\n'''
insert = anchor + '''\nfunction bindImplementationGeneration() {\n  if (!promiseAuthorityAvailable()) return null;\n\n  try {\n    const quality = require("./quality-contract");\n    const attacks = require("./contract-attacks");\n    const remediation = require("./contract-remediation");\n    const proposal = require("./contract-protection-proposal");\n    const provider = require("./provider-adapter-m13");\n    const qualityLoop = require("./contract-quality-loop");\n    const mutationPack = require("./mutation-pack");\n    const engine = require("./engine");\n\n    const bound = {\n      draftQualityContract: quality.draftQualityContract,\n      confirmQualityContract: quality.confirmQualityContract,\n      runContractAttacks: attacks.runContractAttacks,\n      draftContractProtection: remediation.draftContractProtection,\n      confirmContractProtection: remediation.confirmContractProtection,\n      verifyContractProtection: remediation.verifyContractProtection,\n      generateContractProtectionProposal:\n        proposal.generateContractProtectionProposal,\n      createStructuredProviderAdapter:\n        provider.createStructuredProviderAdapter,\n      prepareContractQualityLoop: qualityLoop.prepareContractQualityLoop,\n      completeContractQualityLoop: qualityLoop.completeContractQualityLoop,\n      compileMutationPack: mutationPack.compileMutationPack,\n      runImprovementLoop: engine.runImprovementLoop\n    };\n\n    if (\n      typeof bound.draftQualityContract !== "function" ||\n      typeof bound.confirmQualityContract !== "function" ||\n      typeof bound.runContractAttacks !== "function" ||\n      typeof bound.draftContractProtection !== "function" ||\n      typeof bound.confirmContractProtection !== "function" ||\n      typeof bound.verifyContractProtection !== "function" ||\n      typeof bound.generateContractProtectionProposal !== "function" ||\n      typeof bound.createStructuredProviderAdapter !== "function" ||\n      typeof bound.prepareContractQualityLoop !== "function" ||\n      typeof bound.completeContractQualityLoop !== "function" ||\n      typeof bound.compileMutationPack !== "function" ||\n      typeof bound.runImprovementLoop !== "function"\n    ) return null;\n\n    return bound;\n  } catch {\n    return null;\n  }\n}\n'''
replace_once(index, anchor, insert, "index bind implementation generation")

replace_once(
    index,
    '''function defineLazyExport(name, modulePath, unavailable) {\n  if (typeof bootstrapDefineProperty !== "function") return;\n  try {\n    bootstrapDefineProperty(exported, name, {\n      enumerable: true,\n      configurable: false,\n      get() {\n        if (!promiseAuthorityAvailable()) return unavailable;\n        return require(modulePath)[name];\n      }\n    });\n  } catch {\n    // The predeclared own data property remains the fail-closed boundary.\n  }\n}\n''',
    '''function defineLazyExport(name, modulePath, unavailable) {\n  if (typeof bootstrapDefineProperty !== "function") return;\n  try {\n    bootstrapDefineProperty(exported, name, {\n      enumerable: true,\n      configurable: false,\n      get() {\n        if (\n          !promiseAuthorityAvailable() ||\n          boundImplementations === null\n        ) return unavailable;\n        const implementation = boundImplementations[name];\n        return typeof implementation === "function"\n          ? implementation\n          : unavailable;\n      }\n    });\n  } catch {\n    // The predeclared own data property remains the fail-closed boundary.\n  }\n}\n\nboundImplementations = bindImplementationGeneration();\n''',
    "index lazy getter binding",
)

core = Path("src/contract-attacks-core.js")
replace_once(
    core,
    '''function loadM8ExecutionDependencies() {\n  if (m8DependenciesLoadAttempted) return;\n  m8DependenciesLoadAttempted = true;\n\n  if (!m8DependencyAuthorityAvailable) return;\n\n  try {\n    ({ attack } = require("./engine"));\n    ({ cloneAiData, snapshotAiData } = require("./legacy-ai-data-safe"));\n  } catch {\n    attack = null;\n    cloneAiData = null;\n    snapshotAiData = null;\n  }\n}\n''',
    '''function loadM8ExecutionDependencies() {\n  if (m8DependenciesLoadAttempted) return;\n  m8DependenciesLoadAttempted = true;\n\n  if (!m8DependencyAuthorityAvailable) return;\n\n  try {\n    ({ attack } = require("./engine"));\n    ({ cloneAiData, snapshotAiData } = require("./legacy-ai-data-safe"));\n  } catch {\n    attack = null;\n    cloneAiData = null;\n    snapshotAiData = null;\n  }\n}\n\n// Capture the execution dependency generation while package authority is still\n// trusted; first invocation must never load a fresh mutable module graph.\nloadM8ExecutionDependencies();\n''',
    "M8 dependency generation",
)

provider = Path("src/provider-adapter-m13.js")
replace_once(
    provider,
    '''function getLegacyStructuredProviderAdapter() {\n  if (legacyAdapterLoadAttempted) return createLegacyStructuredProviderAdapter;\n  legacyAdapterLoadAttempted = true;\n\n  if (\n    !promiseAuthorityAvailable ||\n    !legacyTypeErrorAuthorityAvailable\n  ) {\n    return null;\n  }\n\n  try {\n    const legacyAdapterPath = require.resolve("./provider-adapter");\n    delete require.cache[legacyAdapterPath];\n    const legacyAdapter = require(legacyAdapterPath);\n    if (\n      legacyAdapter !== null &&\n      typeof legacyAdapter === "object" &&\n      typeof legacyAdapter.createStructuredProviderAdapter === "function"\n    ) {\n      createLegacyStructuredProviderAdapter =\n        legacyAdapter.createStructuredProviderAdapter;\n    }\n  } catch {\n    createLegacyStructuredProviderAdapter = null;\n  }\n\n  return createLegacyStructuredProviderAdapter;\n}\n''',
    '''function getLegacyStructuredProviderAdapter() {\n  if (legacyAdapterLoadAttempted) return createLegacyStructuredProviderAdapter;\n  legacyAdapterLoadAttempted = true;\n\n  if (\n    !promiseAuthorityAvailable ||\n    !legacyTypeErrorAuthorityAvailable\n  ) {\n    return null;\n  }\n\n  try {\n    const legacyAdapterPath = require.resolve("./provider-adapter");\n    delete require.cache[legacyAdapterPath];\n    const legacyAdapter = require(legacyAdapterPath);\n    if (\n      legacyAdapter !== null &&\n      typeof legacyAdapter === "object" &&\n      typeof legacyAdapter.createStructuredProviderAdapter === "function"\n    ) {\n      createLegacyStructuredProviderAdapter =\n        legacyAdapter.createStructuredProviderAdapter;\n    }\n  } catch {\n    createLegacyStructuredProviderAdapter = null;\n  }\n\n  return createLegacyStructuredProviderAdapter;\n}\n\n// Bind legacy delegation under the same authenticated package-load generation.\n// The root evicts stale consumers before this module loads, so later caller\n// mutations cannot be captured by a first legacy-mode request.\ngetLegacyStructuredProviderAdapter();\n''',
    "legacy adapter generation",
)

# Permanent regression: package-load generation must own every lazy public seam.
test_path = Path("test/m13-review-remediation.test.js")
test_text = test_path.read_text()
marker = "\n// ROUND12_TRUSTED_GENERATION_REGRESSION\n"
if marker not in test_text:
    test_text += r'''

// ROUND12_TRUSTED_GENERATION_REGRESSION

test("round12 post-load primordial mutation never becomes lazy public authority", () => {
  const rootPath = path.join(repoRoot, "src");
  const code = `
    "use strict";
    const api = require(${JSON.stringify(rootPath)});
    const originals = {
      gopd: Object.getOwnPropertyDescriptor,
      gopds: Object.getOwnPropertyDescriptors,
      getProto: Object.getPrototypeOf,
      apply: Reflect.apply
    };
    let calls = 0;
    Object.getOwnPropertyDescriptor = function (...args) {
      calls += 1;
      return originals.gopd(...args);
    };
    Object.getOwnPropertyDescriptors = function (...args) {
      calls += 1;
      return originals.gopds(...args);
    };
    Object.getPrototypeOf = function (...args) {
      calls += 1;
      return originals.getProto(...args);
    };
    Reflect.apply = function (...args) {
      calls += 1;
      return originals.apply(...args);
    };

    const attacks = api.runContractAttacks;
    const adapterFactory = api.createStructuredProviderAdapter;
    let attackRejected = false;
    Promise.resolve(attacks({})).then(
      () => { process.exitCode = 91; },
      () => { attackRejected = true; }
    ).then(() => {
      let adapterError = null;
      try {
        adapterFactory({});
      } catch (error) {
        adapterError = error;
      }
      const observed = calls;
      Object.getOwnPropertyDescriptor = originals.gopd;
      Object.getOwnPropertyDescriptors = originals.gopds;
      Object.getPrototypeOf = originals.getProto;
      Reflect.apply = originals.apply;
      if (!attackRejected) process.exitCode = 92;
      if (adapterError === null) process.exitCode = 93;
      if (observed !== 0) {
        console.error("post-load primordial calls", observed);
        process.exitCode = 94;
      }
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
    test_path.write_text(test_text)
