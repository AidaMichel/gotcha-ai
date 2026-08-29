from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing patch marker: {label}")
    return text.replace(old, new, 1)


# contract-attacks-core: keep internal native Promise authority independent
# from the ambient global while exporting one guarded ambient snapshot for M13.
path = Path("src/contract-attacks-core.js")
text = path.read_text()
marker = '''const {
  runInNewContext
} = require("node:vm");
'''
insert = marker + '''
const promiseCaptureGetOwnPropertyDescriptor =
  Object.getOwnPropertyDescriptor;
const promiseCaptureGetPrototypeOf =
  Object.getPrototypeOf;
const promiseCaptureIsProxy =
  utilTypes.isProxy;

const intrinsicPromiseProbe =
  (async function gotchaIntrinsicPromiseProbe() {})();
const intrinsicPromisePrototype =
  promiseCaptureGetPrototypeOf(intrinsicPromiseProbe);
const intrinsicPromiseConstructorDescriptor =
  promiseCaptureGetOwnPropertyDescriptor(
    intrinsicPromisePrototype,
    "constructor"
  );
const intrinsicPromiseThenDescriptor =
  promiseCaptureGetOwnPropertyDescriptor(
    intrinsicPromisePrototype,
    "then"
  );
const intrinsicPromiseConstructor =
  intrinsicPromiseConstructorDescriptor !== undefined &&
  !("get" in intrinsicPromiseConstructorDescriptor) &&
  !("set" in intrinsicPromiseConstructorDescriptor) &&
  typeof intrinsicPromiseConstructorDescriptor.value === "function" &&
  promiseCaptureIsProxy(intrinsicPromiseConstructorDescriptor.value) !== true
    ? intrinsicPromiseConstructorDescriptor.value
    : null;
const intrinsicPromiseThen =
  intrinsicPromiseThenDescriptor !== undefined &&
  !("get" in intrinsicPromiseThenDescriptor) &&
  !("set" in intrinsicPromiseThenDescriptor) &&
  typeof intrinsicPromiseThenDescriptor.value === "function" &&
  promiseCaptureIsProxy(intrinsicPromiseThenDescriptor.value) !== true
    ? intrinsicPromiseThenDescriptor.value
    : null;

let capturedAmbientPromiseConstructor = null;
let capturedAmbientPromisePrototype = null;
let capturedAmbientPromiseThen = null;
try {
  const ambientPromiseCandidate = globalThis.Promise;
  if (
    typeof ambientPromiseCandidate === "function" &&
    promiseCaptureIsProxy(ambientPromiseCandidate) !== true
  ) {
    const prototypeDescriptor =
      promiseCaptureGetOwnPropertyDescriptor(
        ambientPromiseCandidate,
        "prototype"
      );
    if (
      prototypeDescriptor !== undefined &&
      !("get" in prototypeDescriptor) &&
      !("set" in prototypeDescriptor) &&
      prototypeDescriptor.value !== null &&
      typeof prototypeDescriptor.value === "object" &&
      promiseCaptureIsProxy(prototypeDescriptor.value) !== true
    ) {
      const thenDescriptor =
        promiseCaptureGetOwnPropertyDescriptor(
          prototypeDescriptor.value,
          "then"
        );
      if (
        thenDescriptor !== undefined &&
        !("get" in thenDescriptor) &&
        !("set" in thenDescriptor) &&
        typeof thenDescriptor.value === "function" &&
        promiseCaptureIsProxy(thenDescriptor.value) !== true
      ) {
        capturedAmbientPromiseConstructor = ambientPromiseCandidate;
        capturedAmbientPromisePrototype = prototypeDescriptor.value;
        capturedAmbientPromiseThen = thenDescriptor.value;
      }
    }
  }
} catch {
  capturedAmbientPromiseConstructor = null;
  capturedAmbientPromisePrototype = null;
  capturedAmbientPromiseThen = null;
}
'''
text = replace_once(text, marker, insert, "core vm import")
text = replace_once(
    text,
    '''    PromiseConstructor:\n      Promise,\n''',
    '''    PromiseConstructor:\n      capturedAmbientPromiseConstructor,\n    PromisePrototype:\n      capturedAmbientPromisePrototype,\n''',
    "core exported Promise constructor",
)
text = replace_once(
    text,
    '''    PromiseThen:\n      Promise.prototype.then,\n''',
    '''    PromiseThen:\n      capturedAmbientPromiseThen,\n''',
    "core exported Promise then",
)
text = replace_once(
    text,
    '''const promisePrototype =\n  Promise.prototype;\n\nconst promiseConstructor =\n  Promise;\n\nconst promiseThen =\n  Promise.prototype.then;\n''',
    '''const promisePrototype =\n  intrinsicPromisePrototype;\n\nconst promiseConstructor =\n  intrinsicPromiseConstructor;\n\nconst promiseThen =\n  intrinsicPromiseThen;\n''',
    "core internal Promise block",
)
path.write_text(text)


# contract-protection-proposal: consume guarded prototype capture, never read
# PromiseConstructor.prototype when the ambient constructor is absent.
path = Path("src/contract-protection-proposal.js")
text = path.read_text()
text = replace_once(
    text,
    '''  PromiseConstructor,\n  TypeErrorConstructor,\n''',
    '''  PromiseConstructor,\n  PromisePrototype: promisePrototype,\n  TypeErrorConstructor,\n''',
    "M13 Promise prototype destructure",
)
text = replace_once(
    text,
    '''const promisePrototype =\n  typeof PromiseConstructor === "function"\n    ? PromiseConstructor.prototype\n    : null;\n''',
    "",
    "M13 computed Promise prototype",
)
path.write_text(text)


# mutation-pack is imported before M13 from the package root. It must not make
# package loading depend on the mutable global Promise binding.
path = Path("src/mutation-pack.js")
text = path.read_text()
text = replace_once(
    text,
    '''const functionToString = Function.prototype.toString;\nconst promiseThen = Promise.prototype.then;\nconst getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\n''',
    '''const functionToString = Function.prototype.toString;\nconst getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\n''',
    "mutation-pack top Promise then",
)
text = replace_once(
    text,
    '''const ownKeys = Reflect.ownKeys;\n\nconst safePromiseSpecies = Object.freeze({\n  [Symbol.species]: Promise\n});\n''',
    '''const ownKeys = Reflect.ownKeys;\n\nconst mutationPromiseProbe =\n  (async function mutationPackPromiseProbe() {})();\nconst mutationPromisePrototype =\n  getPrototypeOf(mutationPromiseProbe);\nconst mutationPromiseConstructorDescriptor =\n  getOwnPropertyDescriptor(mutationPromisePrototype, "constructor");\nconst mutationPromiseThenDescriptor =\n  getOwnPropertyDescriptor(mutationPromisePrototype, "then");\nconst mutationPromiseConstructor =\n  mutationPromiseConstructorDescriptor !== undefined &&\n  !("get" in mutationPromiseConstructorDescriptor) &&\n  !("set" in mutationPromiseConstructorDescriptor) &&\n  typeof mutationPromiseConstructorDescriptor.value === "function"\n    ? mutationPromiseConstructorDescriptor.value\n    : null;\nconst promiseThen =\n  mutationPromiseThenDescriptor !== undefined &&\n  !("get" in mutationPromiseThenDescriptor) &&\n  !("set" in mutationPromiseThenDescriptor) &&\n  typeof mutationPromiseThenDescriptor.value === "function"\n    ? mutationPromiseThenDescriptor.value\n    : null;\n\nconst safePromiseSpecies = Object.freeze({\n  [Symbol.species]: mutationPromiseConstructor\n});\n''',
    "mutation-pack safe Promise species",
)
path.write_text(text)


# provider-adapter-m13: lazy-load legacy M11 and independently authenticate the
# new mode's ambient Promise against a current-realm native intrinsic.
path = Path("src/provider-adapter-m13.js")
text = path.read_text()
text = replace_once(
    text,
    '''const { types: utilTypes } = require("node:util");\n''',
    '''const { types: utilTypes } = require("node:util");\nconst { runInNewContext } = require("node:vm");\n''',
    "provider vm import",
)
text = replace_once(
    text,
    '''const {\n  createStructuredProviderAdapter: createLegacyStructuredProviderAdapter\n} = require("./provider-adapter");\n\n''',
    "",
    "provider eager legacy import",
)
text = replace_once(
    text,
    '''const PromiseConstructor = Promise;\nconst PromisePrototype = Promise.prototype;\nconst TypeErrorConstructor = TypeError;\nconst ArrayConstructor = Array;\nconst WeakSetConstructor = WeakSet;\nconst promiseThen = Promise.prototype.then;\nconst promiseSpecies = Symbol.species;\n''',
    '''const TypeErrorConstructor = TypeError;\nconst ArrayConstructor = Array;\nconst WeakSetConstructor = WeakSet;\nconst promiseSpecies = Symbol.species;\n''',
    "provider ambient Promise constants",
)
old_safe = '''const safePromiseConstructor = objectCreate(null);\ndefineProperty(safePromiseConstructor, promiseSpecies, {\n  value: PromiseConstructor,\n  writable: false,\n  enumerable: false,\n  configurable: false\n});\nObject.freeze(safePromiseConstructor);\n'''
new_safe = '''let capturedAmbientPromiseConstructor = null;\ntry {\n  capturedAmbientPromiseConstructor = globalThis.Promise;\n} catch {\n  capturedAmbientPromiseConstructor = null;\n}\n\nlet trustedPromiseConstructor = null;\nlet trustedPromisePrototype = null;\nlet trustedPromiseThen = null;\nlet promiseAuthorityAvailable = false;\ntry {\n  const pristineReflectApply = runInNewContext("Reflect.apply");\n  const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");\n  const pristineGetOwnPropertyDescriptor = runInNewContext(\n    "Object.getOwnPropertyDescriptor"\n  );\n  const pristineFunctionToString = runInNewContext("Function.prototype.toString");\n  const pristinePromiseConstructorSource = runInNewContext(\n    "Function.prototype.toString.call(Promise)"\n  );\n  const pristinePromiseThenSource = runInNewContext(\n    "Function.prototype.toString.call(Promise.prototype.then)"\n  );\n  const localPromiseProbe =\n    (async function m13AdapterLocalPromiseProbe() {})();\n  const intrinsicPrototype = pristineReflectApply(\n    pristineGetPrototypeOf,\n    undefined,\n    [localPromiseProbe]\n  );\n  const constructorDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [intrinsicPrototype, "constructor"]\n  );\n  const thenDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [intrinsicPrototype, "then"]\n  );\n  const intrinsicConstructorSource =\n    constructorDescriptor !== undefined &&\n    typeof constructorDescriptor.value === "function"\n      ? pristineReflectApply(\n          pristineFunctionToString,\n          constructorDescriptor.value,\n          []\n        )\n      : null;\n  const intrinsicThenSource =\n    thenDescriptor !== undefined &&\n    typeof thenDescriptor.value === "function"\n      ? pristineReflectApply(\n          pristineFunctionToString,\n          thenDescriptor.value,\n          []\n        )\n      : null;\n  const intrinsicAuthorityValid = (\n    constructorDescriptor !== undefined &&\n    !("get" in constructorDescriptor) &&\n    !("set" in constructorDescriptor) &&\n    typeof constructorDescriptor.value === "function" &&\n    constructorDescriptor.writable === true &&\n    constructorDescriptor.enumerable === false &&\n    constructorDescriptor.configurable === true &&\n    !isProxy(constructorDescriptor.value) &&\n    intrinsicConstructorSource === pristinePromiseConstructorSource &&\n    thenDescriptor !== undefined &&\n    !("get" in thenDescriptor) &&\n    !("set" in thenDescriptor) &&\n    typeof thenDescriptor.value === "function" &&\n    thenDescriptor.writable === true &&\n    thenDescriptor.enumerable === false &&\n    thenDescriptor.configurable === true &&\n    !isProxy(thenDescriptor.value) &&\n    intrinsicThenSource === pristinePromiseThenSource\n  );\n\n  if (intrinsicAuthorityValid) {\n    trustedPromiseConstructor = constructorDescriptor.value;\n    trustedPromisePrototype = intrinsicPrototype;\n    trustedPromiseThen = thenDescriptor.value;\n  }\n\n  let ambientPrototypeMatches = false;\n  if (\n    intrinsicAuthorityValid &&\n    typeof capturedAmbientPromiseConstructor === "function" &&\n    !isProxy(capturedAmbientPromiseConstructor) &&\n    capturedAmbientPromiseConstructor === trustedPromiseConstructor\n  ) {\n    const ambientPrototypeDescriptor = pristineReflectApply(\n      pristineGetOwnPropertyDescriptor,\n      undefined,\n      [capturedAmbientPromiseConstructor, "prototype"]\n    );\n    ambientPrototypeMatches = (\n      ambientPrototypeDescriptor !== undefined &&\n      !("get" in ambientPrototypeDescriptor) &&\n      !("set" in ambientPrototypeDescriptor) &&\n      ambientPrototypeDescriptor.value === trustedPromisePrototype\n    );\n  }\n\n  promiseAuthorityAvailable =\n    intrinsicAuthorityValid && ambientPrototypeMatches;\n} catch {\n  trustedPromiseConstructor = null;\n  trustedPromisePrototype = null;\n  trustedPromiseThen = null;\n  promiseAuthorityAvailable = false;\n}\n\nlet safePromiseConstructor = null;\nif (promiseAuthorityAvailable) {\n  try {\n    safePromiseConstructor = objectCreate(null);\n    defineProperty(safePromiseConstructor, promiseSpecies, {\n      value: trustedPromiseConstructor,\n      writable: false,\n      enumerable: false,\n      configurable: false\n    });\n    Object.freeze(safePromiseConstructor);\n  } catch {\n    safePromiseConstructor = null;\n    promiseAuthorityAvailable = false;\n  }\n}\n'''
text = replace_once(text, old_safe, new_safe, "provider safe Promise container")
text = replace_once(
    text,
    "    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);",
    "    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);",
    "provider Promise observation",
)
text = replace_once(
    text,
    '''function boundaryError(message) {\n  return new TypeErrorConstructor(message);\n}\n''',
    '''function boundaryError(message) {\n  return new TypeErrorConstructor(message);\n}\n\nasync function rejectAdapterBoundaryPromise(error) {\n  throw error;\n}\n''',
    "provider boundary reject helper",
)
text = replace_once(
    text,
    '''  return function contractProtectionProviderGenerator(generatorRequest) {\n    return new PromiseConstructor((resolve, reject) => {\n''',
    '''  return function contractProtectionProviderGenerator(generatorRequest) {\n    if (\n      !promiseAuthorityAvailable ||\n      typeof trustedPromiseConstructor !== "function"\n    ) {\n      return rejectAdapterBoundaryPromise(\n        boundaryError("Promise authority is unavailable.")\n      );\n    }\n    return new trustedPromiseConstructor((resolve, reject) => {\n''',
    "provider generator Promise construction",
)
text = replace_once(
    text,
    '''          if (getPrototypeOf(transportResult) !== PromisePrototype) {\n''',
    '''          if (getPrototypeOf(transportResult) !== trustedPromisePrototype) {\n''',
    "provider Promise prototype classification",
)
text = replace_once(
    text,
    '''  if (descriptors.mode.value !== "contract-protection") {\n    return createLegacyStructuredProviderAdapter(options);\n  }\n''',
    '''  if (descriptors.mode.value !== "contract-protection") {\n    const {\n      createStructuredProviderAdapter: createLegacyStructuredProviderAdapter\n    } = require("./provider-adapter");\n    return createLegacyStructuredProviderAdapter(options);\n  }\n''',
    "provider lazy legacy dispatch",
)
path.write_text(text)
