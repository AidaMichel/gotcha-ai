from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing target: {label}")
    p.write_text(text.replace(old, new, 1))

# contract-attacks-core: use the shared hardened authority instead of mutable util.types probes.
path = Path("src/contract-attacks-core.js")
text = path.read_text()
text = text.replace(
    'const {\n  runInNewContext\n} = require("node:vm");\n',
    'const {\n  runInNewContext\n} = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");\n',
    1,
)
text = text.replace(
    'const promiseCaptureIsProxy =\n  utilTypes.isProxy;\n',
    'const promiseCaptureIsProxy =\n  runtimeAuthority.isProxy;\n',
    1,
)
start = text.index('function unavailablePromiseBrandProbe()')
end = text.index('const experimentIntrinsics =', start)
replacement = '''const experimentPromiseBrandProbe =\n  runtimeAuthority.isPromise;\nconst experimentForbiddenProbes =\n  runtimeAuthority.forbiddenProbes;\n\n'''
text = text[:start] + replacement + text[end:]
text = text.replace('    isProxy: utilTypes.isProxy,', '    isProxy: runtimeAuthority.isProxy,', 1)
text = text.replace(
    '    ObjectPrototypeParent:\n      Object.getPrototypeOf(Object.prototype),\n',
    '    ObjectPrototypeParent:\n      Object.getPrototypeOf(Object.prototype),\n    FunctionPrototype:\n      runtimeAuthority.localFunctionPrototype,\n',
    1,
)
path.write_text(text)

# contract-protection-proposal: compare against syntax-derived local Function prototype and
# consume safe inherited trusted-Promise species.
replace_once(
    "src/contract-protection-proposal.js",
    '  ObjectPrototypeParent: objectPrototypeParent,\n',
    '  ObjectPrototypeParent: objectPrototypeParent,\n  FunctionPrototype: localFunctionPrototype,\n',
    "proposal local Function authority import",
)
replace_once(
    "src/contract-protection-proposal.js",
    '    pristineReflectApply(pristineGetPrototypeOf, undefined, [promiseThen]) === Function.prototype &&\n',
    '    pristineReflectApply(pristineGetPrototypeOf, undefined, [promiseThen]) === localFunctionPrototype &&\n',
    "proposal Promise.then local function prototype",
)
replace_once(
    "src/contract-protection-proposal.js",
    '''      if (constructor === undefined) return true;\n      const objectConstructorDescriptor = getOwnPropertyDescriptor(objectPrototype, "constructor");''',
    '''      if (constructor === undefined) return true;\n      if (constructor === trustedPromiseConstructor) {\n        return require("./runtime-authority").hasTrustedLocalPromiseSpecies(\n          constructor,\n          promiseSpecies\n        );\n      }\n      const objectConstructorDescriptor = getOwnPropertyDescriptor(objectPrototype, "constructor");''',
    "proposal inherited trusted Promise species",
)

# contract-quality-loop: remove retained mutable util.types probes and use shared authority.
path = Path("src/contract-quality-loop.js")
text = path.read_text()
text = text.replace(
    'const utilTypes = require("node:util").types;\nconst { Buffer } = require("node:buffer");\n',
    'const runtimeAuthority = require("./runtime-authority");\n',
    1,
)
text = text.replace('const isProxy = utilTypes.isProxy;\nconst isPromise = utilTypes.isPromise;\nconst bufferIsBuffer = Buffer.isBuffer;\n',
                    'const isProxy = runtimeAuthority.isProxy;\nconst isPromise = runtimeAuthority.isPromise;\nconst bufferIsBuffer = runtimeAuthority.isTypedArray;\n', 1)
text = text.replace('    getPrototypeOf(thenCandidate) === Function.prototype &&\n',
                    '    getPrototypeOf(thenCandidate) === runtimeAuthority.localFunctionPrototype &&\n', 1)
text = re.sub(
    r'const forbiddenProbes = \[.*?\];\n\nlet authorityAvailable = true;',
    'const forbiddenProbes = runtimeAuthority.forbiddenProbes;\n\nlet authorityAvailable = true;',
    text,
    count=1,
    flags=re.S,
)
path.write_text(text)

# provider-adapter-m13: use centralized proxy/brand authority, avoid ai-data-core mutable probes,
# anchor Function identity locally, and harden legacy TypeError constructor authentication.
path = Path("src/provider-adapter-m13.js")
text = path.read_text()
text = text.replace(
    'const { types: utilTypes } = require("node:util");\nconst { runInNewContext } = require("node:vm");\nconst {\n  isUnsupportedRuntimeObject\n} = require("./ai-data-core");\n',
    'const { runInNewContext } = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");\n',
    1,
)
text = text.replace('const isProxy = utilTypes.isProxy;\nconst isPromise = utilTypes.isPromise;\n',
                    'const isProxy = runtimeAuthority.isProxy;\nconst isPromise = runtimeAuthority.isPromise;\n', 1)
start = text.index('let providerBrandAuthorityAvailable = false;')
end = text.index('const CONTRACT_PROTECTION_INSTRUCTIONS_V1', start)
text = text[:start] + 'const providerBrandAuthorityAvailable = true;\n\n' + text[end:]
text = text.replace('    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenDescriptor.value]) === Function.prototype &&\n',
                    '    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenDescriptor.value]) === runtimeAuthority.localFunctionPrototype &&\n', 1)
text = text.replace('isUnsupportedRuntimeObject(value)', 'runtimeAuthority.hasForbiddenRuntimeBrand(value)')
# Add independent TypeError source/function-prototype authentication.
text = text.replace(
    '  const ambientTypeErrorPrototypeDescriptor =\n',
    '  const pristineTypeErrorSource = runInNewContext(\n    "Function.prototype.toString.call(TypeError)"\n  );\n  const pristineFunctionToString = runInNewContext(\n    "Function.prototype.toString"\n  );\n  const ambientTypeErrorSource =\n    typeof ambientTypeErrorCandidate === "function"\n      ? reflectApply(pristineFunctionToString, ambientTypeErrorCandidate, [])\n      : null;\n  const ambientTypeErrorPrototypeDescriptor =\n',
    1,
)
text = text.replace(
    '    ambientTypeErrorCandidate === localTypeErrorConstructor &&\n    !isProxy(ambientTypeErrorCandidate) &&\n',
    '    ambientTypeErrorCandidate === localTypeErrorConstructor &&\n    !isProxy(ambientTypeErrorCandidate) &&\n    getPrototypeOf(ambientTypeErrorCandidate) === runtimeAuthority.localFunctionPrototype &&\n    ambientTypeErrorSource === pristineTypeErrorSource &&\n',
    1,
)
text = text.replace(
    '''      if (constructor === undefined) return true;\n      const objectConstructorDescriptor = getOwnPropertyDescriptor(objectPrototype, "constructor");''',
    '''      if (constructor === undefined) return true;\n      if (constructor === trustedPromiseConstructor) {\n        return runtimeAuthority.hasTrustedLocalPromiseSpecies(\n          constructor,\n          promiseSpecies\n        );\n      }\n      const objectConstructorDescriptor = getOwnPropertyDescriptor(objectPrototype, "constructor");''',
    1,
)
path.write_text(text)

# Mutation Pack: shared proxy authority and syntax-derived local Function prototype.
path = Path("src/mutation-pack.js")
text = path.read_text()
text = text.replace(
    'const { types: utilTypes } = require("node:util");\nconst { runInNewContext } = require("node:vm");\n',
    'const { runInNewContext } = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");\n',
    1,
)
text = text.replace('utilTypes.isProxy(', 'runtimeAuthority.isProxy(')
text = text.replace('getPrototypeOf(constructorCandidate) === Function.prototype',
                    'getPrototypeOf(constructorCandidate) === runtimeAuthority.localFunctionPrototype')
text = text.replace('getPrototypeOf(thenCandidate) === Function.prototype',
                    'getPrototypeOf(thenCandidate) === runtimeAuthority.localFunctionPrototype')
path.write_text(text)

print("round5 authority redesign patch prepared")
