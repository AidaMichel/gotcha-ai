from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing target: {label}")
    p.write_text(s.replace(old, new, 1))

# Node 20 renders util.types native helpers with their exported name, while
# current Node 22/24 render the same native binding anonymously. Keep the
# existing Proxy rejection and accept only those two engine-native encodings.
replace_once(
    "src/contract-attacks-core.js",
    '''    promiseCaptureIsProxy(candidate) !== true &&\n    pristineReflectApply(pristineFunctionToString, candidate, []) ===\n      "function isPromise() { [native code] }"\n  ) {''',
    '''    promiseCaptureIsProxy(candidate) !== true &&\n    (\n      pristineReflectApply(pristineFunctionToString, candidate, []) ===\n        "function isPromise() { [native code] }" ||\n      pristineReflectApply(pristineFunctionToString, candidate, []) ===\n        "function () { [native code] }"\n    )\n  ) {''',
    "core current-Node isPromise native source"
)

replace_once(
    "src/contract-protection-proposal.js",
    '''  if (promiseBrandProbeSource !== "function isPromise() { [native code] }") {\n    boundaryAuthorityAvailable = false;\n  }''',
    '''  if (\n    promiseBrandProbeSource !== "function isPromise() { [native code] }" &&\n    promiseBrandProbeSource !== "function () { [native code] }"\n  ) {\n    boundaryAuthorityAvailable = false;\n  }''',
    "proposal current-Node isPromise native source"
)

replace_once(
    "src/provider-adapter-m13.js",
    '''  providerBrandAuthorityAvailable = (\n    pristineReflectApply(pristineFunctionToString, isPromise, []) ===\n      "function isPromise() { [native code] }" &&\n    pristineReflectApply(pristineFunctionToString, isProxy, []) ===\n      "function isProxy() { [native code] }"\n  );''',
    '''  const promiseProbeSource =\n    pristineReflectApply(pristineFunctionToString, isPromise, []);\n  const proxyProbeSource =\n    pristineReflectApply(pristineFunctionToString, isProxy, []);\n  providerBrandAuthorityAvailable = (\n    (\n      promiseProbeSource === "function isPromise() { [native code] }" ||\n      promiseProbeSource === "function () { [native code] }"\n    ) &&\n    (\n      proxyProbeSource === "function isProxy() { [native code] }" ||\n      proxyProbeSource === "function () { [native code] }"\n    )\n  );''',
    "provider current-Node util native sources"
)

print("Node 22/24 native Promise brand authority compatibility prepared")
