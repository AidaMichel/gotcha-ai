from pathlib import Path


# ---------------------------------------------------------------------------
# 1. Runtime Proxy authority: use Node's public node:v8 API instead of the
# deprecated process.binding("v8") path. Authenticate the function by its
# ordinary local-function shape/source before using it to toggle V8 native
# syntax for the tiny bootstrap window.
# ---------------------------------------------------------------------------
path = Path("src/runtime-authority.js")
text = path.read_text()
start = text.find("function captureSetFlagsFromString() {")
end = text.find("\nlet isProxy = unavailableProxyProbe;", start)
if start == -1 or end == -1:
    raise SystemExit("runtime setFlagsFromString block missing")
replacement = r'''function captureSetFlagsFromString() {
  try {
    const v8Module = require("node:v8");
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [v8Module, "setFlagsFromString"]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      typeof candidate === "function" &&
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      typeof source === "string" &&
      pristineReflectApply(
        pristineStringStartsWith,
        source,
        ["function setFlagsFromString("]
      ) === true
    ) {
      return candidate;
    }
  } catch {}
  return null;
}
'''
text = text[:start] + replacement + text[end:]
path.write_text(text)


# ---------------------------------------------------------------------------
# 2. Public package: preserve the narrow/bootstrap-safe package require while
# exposing the exact implementation function identities. Accessing/destructuring
# a public export loads that implementation once; merely require("gotcha") does
# not load host-heavy modules. This restores old identity and module-init timing
# contracts without reopening the util.inspect bootstrap issue.
# ---------------------------------------------------------------------------
index = r'''"use strict";

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
require("./package-authority");

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

function defineLazyExport(name, modulePath) {
  Object.defineProperty(exported, name, {
    enumerable: true,
    configurable: false,
    get() {
      return require(modulePath)[name];
    }
  });
}

defineLazyExport("draftQualityContract", "./quality-contract");
defineLazyExport("confirmQualityContract", "./quality-contract");
defineLazyExport("runContractAttacks", "./contract-attacks");
defineLazyExport("draftContractProtection", "./contract-remediation");
defineLazyExport("confirmContractProtection", "./contract-remediation");
defineLazyExport("verifyContractProtection", "./contract-remediation");
defineLazyExport(
  "generateContractProtectionProposal",
  "./contract-protection-proposal"
);
defineLazyExport(
  "createStructuredProviderAdapter",
  "./provider-adapter-m13"
);
defineLazyExport(
  "prepareContractQualityLoop",
  "./contract-quality-loop"
);
defineLazyExport(
  "completeContractQualityLoop",
  "./contract-quality-loop"
);

module.exports = exported;
'''
Path("src/index.js").write_text(index)


# ---------------------------------------------------------------------------
# 3. Preserve the established M8 public error contract. Round-6 changed the
# authority source, not the semantic boundary: callers still receive the same
# deterministic integrity failure when the authenticated Promise seam is absent
# or becomes hostile. Existing callback-time rejection observation remains in
# place before this error is surfaced.
# ---------------------------------------------------------------------------
path = Path("src/contract-attacks-core.js")
text = path.read_text()
old = '"Promise intrinsic authority is unavailable."'
if old not in text:
    raise SystemExit("M8 authority error marker missing")
text = text.replace(
    old,
    '"Promise intrinsic integrity check failed."'
)
path.write_text(text)

print("round6 full-suite compatibility closure applied")
