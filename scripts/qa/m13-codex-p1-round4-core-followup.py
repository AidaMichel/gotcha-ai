from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"missing target: {label}")
    p.write_text(s.replace(old, new, 1))

replace_once(
    "src/contract-attacks-core.js",
    '''const experimentFreeze =\n  runInNewContext("Object.freeze");\n\nconst experimentForbiddenProbes =''',
    '''const experimentFreeze =\n  runInNewContext("Object.freeze");\n\nfunction unavailablePromiseBrandProbe() {\n  // Fail closed: every inspected value is treated as a forbidden Promise brand\n  // when genuine local util.types.isPromise authority cannot be established.\n  return true;\n}\n\nlet experimentPromiseBrandProbe = unavailablePromiseBrandProbe;\ntry {\n  const candidate = utilTypes.isPromise;\n  const pristineReflectApply = runInNewContext("Reflect.apply");\n  const pristineFunctionToString = runInNewContext("Function.prototype.toString");\n  if (\n    typeof candidate === "function" &&\n    promiseCaptureIsProxy(candidate) !== true &&\n    pristineReflectApply(pristineFunctionToString, candidate, []) ===\n      "function isPromise() { [native code] }"\n  ) {\n    experimentPromiseBrandProbe = candidate;\n  }\n} catch {\n  experimentPromiseBrandProbe = unavailablePromiseBrandProbe;\n}\n\nconst experimentForbiddenProbes =''',
    "shared promise brand authority"
)
replace_once(
    "src/contract-attacks-core.js",
    '''    utilTypes.isPromise,\n    utilTypes.isNativeError,''',
    '''    experimentPromiseBrandProbe,\n    utilTypes.isNativeError,''',
    "forbidden probe uses authenticated promise brand"
)
replace_once(
    "src/contract-attacks-core.js",
    '''const utilIsPromise =\n  utilTypes["isPromise"];''',
    '''const utilIsPromise =\n  experimentPromiseBrandProbe;''',
    "core promise probe uses authenticated authority"
)

print("round4 core followup prepared")
