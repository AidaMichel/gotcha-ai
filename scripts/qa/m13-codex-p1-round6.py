from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing marker for {label} in {path}")
    p.write_text(text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# Shared runtime authority: trap-free descriptor reads + authenticated local
# Array/Promise/probe authority.
# ---------------------------------------------------------------------------
path = Path("src/runtime-authority.js")
text = path.read_text()

marker = '''const pristineDataViewByteLengthGetter = runInNewContext(\n  "Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get"\n);\n\n'''
insert = marker + '''const pristineArrayConstructorSource = runInNewContext(\n  "Function.prototype.toString.call(Array)"\n);\nconst pristineArrayIsArraySource = runInNewContext(\n  "Function.prototype.toString.call(Array.isArray)"\n);\nconst pristinePromiseConstructorSource = runInNewContext(\n  "Function.prototype.toString.call(Promise)"\n);\nconst pristinePromiseThenSource = runInNewContext(\n  "Function.prototype.toString.call(Promise.prototype.then)"\n);\nconst pristinePromiseSpecies = runInNewContext("Symbol.species");\nconst pristinePromiseSpeciesGetterSource = runInNewContext(\n  "Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)"\n);\n\n'''
if marker not in text:
    raise SystemExit("runtime authority pristine marker missing")
text = text.replace(marker, insert, 1)

old = '''const inspectCandidate = nodeUtil.inspect;\nlet inspectAuthorityAvailable = false;\n'''
new = '''let inspectCandidate = null;\ntry {\n  const inspectDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [nodeUtil, "inspect"]\n  );\n  inspectCandidate = (\n    inspectDescriptor !== undefined &&\n    !("get" in inspectDescriptor) &&\n    !("set" in inspectDescriptor) &&\n    typeof inspectDescriptor.value === "function"\n  ) ? inspectDescriptor.value : null;\n} catch {\n  inspectCandidate = null;\n}\nlet inspectAuthorityAvailable = false;\n'''
if old not in text:
    raise SystemExit("inspect direct-read marker missing")
text = text.replace(old, new, 1)

old = '''} catch {\n  inspectAuthorityAvailable = false;\n}\n\nfunction bootstrapIsProxy(value) {\n'''
new = '''} catch {\n  inspectAuthorityAvailable = false;\n}\n\nlet inspectCustom = null;\nif (inspectAuthorityAvailable) {\n  try {\n    const customDescriptor = pristineReflectApply(\n      pristineGetOwnPropertyDescriptor,\n      undefined,\n      [inspectCandidate, "custom"]\n    );\n    if (\n      customDescriptor !== undefined &&\n      !("get" in customDescriptor) &&\n      !("set" in customDescriptor) &&\n      typeof customDescriptor.value === "symbol"\n    ) {\n      inspectCustom = customDescriptor.value;\n    } else {\n      inspectAuthorityAvailable = false;\n    }\n  } catch {\n    inspectAuthorityAvailable = false;\n    inspectCustom = null;\n  }\n}\nconst inspect = inspectAuthorityAvailable ? inspectCandidate : null;\n\nfunction bootstrapIsProxy(value) {\n'''
if old not in text:
    raise SystemExit("inspect authority tail marker missing")
text = text.replace(old, new, 1)

anchor = '''} catch {\n  isProxy = unavailableProxyProbe;\n}\n\nfunction nativeProbe(name) {\n'''
addition = '''} catch {\n  isProxy = unavailableProxyProbe;\n}\n\nlet arrayIsArray = null;\ntry {\n  const arrayDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [globalThis, "Array"]\n  );\n  const arrayConstructor = (\n    arrayDescriptor !== undefined &&\n    !("get" in arrayDescriptor) &&\n    !("set" in arrayDescriptor)\n  ) ? arrayDescriptor.value : null;\n  const isArrayDescriptor = (\n    typeof arrayConstructor === "function" &&\n    !isProxy(arrayConstructor)\n  ) ? pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [arrayConstructor, "isArray"]\n  ) : undefined;\n  const candidate = (\n    isArrayDescriptor !== undefined &&\n    !("get" in isArrayDescriptor) &&\n    !("set" in isArrayDescriptor)\n  ) ? isArrayDescriptor.value : null;\n  const constructorSource = typeof arrayConstructor === "function"\n    ? pristineReflectApply(pristineFunctionToString, arrayConstructor, [])\n    : null;\n  const candidateSource = typeof candidate === "function"\n    ? pristineReflectApply(pristineFunctionToString, candidate, [])\n    : null;\n  if (\n    typeof arrayConstructor === "function" &&\n    !isProxy(arrayConstructor) &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [arrayConstructor]) === localFunctionPrototype &&\n    constructorSource === pristineArrayConstructorSource &&\n    typeof candidate === "function" &&\n    !isProxy(candidate) &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [candidate]) === localFunctionPrototype &&\n    candidateSource === pristineArrayIsArraySource\n  ) {\n    arrayIsArray = candidate;\n  }\n} catch {\n  arrayIsArray = null;\n}\n\nlet promiseAuthorityAvailable = false;\nlet promiseConstructor = null;\nlet promisePrototype = null;\nlet promiseThen = null;\ntry {\n  const localPromiseProbe = (async function gotchaRuntimePromiseProbe() {})();\n  const localPromisePrototype = pristineReflectApply(\n    pristineGetPrototypeOf,\n    undefined,\n    [localPromiseProbe]\n  );\n  const constructorDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [localPromisePrototype, "constructor"]\n  );\n  const thenDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [localPromisePrototype, "then"]\n  );\n  const ambientDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [globalThis, "Promise"]\n  );\n  const ambientConstructor = (\n    ambientDescriptor !== undefined &&\n    !("get" in ambientDescriptor) &&\n    !("set" in ambientDescriptor)\n  ) ? ambientDescriptor.value : null;\n  const constructorCandidate = (\n    constructorDescriptor !== undefined &&\n    !("get" in constructorDescriptor) &&\n    !("set" in constructorDescriptor)\n  ) ? constructorDescriptor.value : null;\n  const thenCandidate = (\n    thenDescriptor !== undefined &&\n    !("get" in thenDescriptor) &&\n    !("set" in thenDescriptor)\n  ) ? thenDescriptor.value : null;\n  const prototypeDescriptor = (\n    typeof ambientConstructor === "function" &&\n    !isProxy(ambientConstructor)\n  ) ? pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [ambientConstructor, "prototype"]\n  ) : undefined;\n  const speciesDescriptor = (\n    typeof constructorCandidate === "function" &&\n    !isProxy(constructorCandidate)\n  ) ? pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [constructorCandidate, pristinePromiseSpecies]\n  ) : undefined;\n  const constructorSource = typeof constructorCandidate === "function"\n    ? pristineReflectApply(pristineFunctionToString, constructorCandidate, [])\n    : null;\n  const thenSource = typeof thenCandidate === "function"\n    ? pristineReflectApply(pristineFunctionToString, thenCandidate, [])\n    : null;\n  const speciesGetterSource = (\n    speciesDescriptor !== undefined &&\n    typeof speciesDescriptor.get === "function"\n  ) ? pristineReflectApply(pristineFunctionToString, speciesDescriptor.get, []) : null;\n\n  if (\n    constructorDescriptor !== undefined &&\n    constructorDescriptor.writable === true &&\n    constructorDescriptor.enumerable === false &&\n    constructorDescriptor.configurable === true &&\n    typeof constructorCandidate === "function" &&\n    !isProxy(constructorCandidate) &&\n    constructorCandidate === ambientConstructor &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [constructorCandidate]) === localFunctionPrototype &&\n    constructorSource === pristinePromiseConstructorSource &&\n    prototypeDescriptor !== undefined &&\n    !("get" in prototypeDescriptor) &&\n    !("set" in prototypeDescriptor) &&\n    prototypeDescriptor.value === localPromisePrototype &&\n    thenDescriptor !== undefined &&\n    thenDescriptor.writable === true &&\n    thenDescriptor.enumerable === false &&\n    thenDescriptor.configurable === true &&\n    typeof thenCandidate === "function" &&\n    !isProxy(thenCandidate) &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [thenCandidate]) === localFunctionPrototype &&\n    thenSource === pristinePromiseThenSource &&\n    speciesDescriptor !== undefined &&\n    typeof speciesDescriptor.get === "function" &&\n    speciesDescriptor.set === undefined &&\n    speciesDescriptor.enumerable === false &&\n    speciesDescriptor.configurable === true &&\n    !isProxy(speciesDescriptor.get) &&\n    pristineReflectApply(pristineGetPrototypeOf, undefined, [speciesDescriptor.get]) === localFunctionPrototype &&\n    speciesGetterSource === pristinePromiseSpeciesGetterSource\n  ) {\n    promiseAuthorityAvailable = true;\n    promiseConstructor = constructorCandidate;\n    promisePrototype = localPromisePrototype;\n    promiseThen = thenCandidate;\n  }\n} catch {\n  promiseAuthorityAvailable = false;\n  promiseConstructor = null;\n  promisePrototype = null;\n  promiseThen = null;\n}\n\nfunction nativeProbe(name) {\n'''
if anchor not in text:
    raise SystemExit("runtime authority insertion anchor missing")
text = text.replace(anchor, addition, 1)

old = '''const isDate = retainedProbe("isDate");\n'''
new = '''const isAsyncFunction = nativeProbe("isAsyncFunction");\nconst isGeneratorFunction = nativeProbe("isGeneratorFunction");\nconst isCryptoKey = nativeProbe("isCryptoKey");\nconst isKeyObject = nativeProbe("isKeyObject");\nconst isDate = retainedProbe("isDate");\n'''
if old not in text:
    raise SystemExit("retained probe marker missing")
text = text.replace(old, new, 1)

old = '''function isTypedArray(value) {\n  try {\n    return (\n      pristineReflectApply(pristineArrayBufferIsView, undefined, [value]) === true &&\n      isDataView(value) !== true\n    );\n  } catch {\n    return true;\n  }\n}\n'''
new = old + '''function isArrayBufferView(value) {\n  try {\n    return pristineReflectApply(\n      pristineArrayBufferIsView,\n      undefined,\n      [value]\n    ) === true;\n  } catch {\n    return true;\n  }\n}\n'''
if old not in text:
    raise SystemExit("typed array marker missing")
text = text.replace(old, new, 1)

old = '''let bufferIsBuffer = unavailableBrandProbe;\ntry {\n  const candidate = BufferConstructor.isBuffer;\n  const source = pristineReflectApply(\n'''
new = '''let bufferIsBuffer = unavailableBrandProbe;\ntry {\n  const bufferDescriptor = pristineReflectApply(\n    pristineGetOwnPropertyDescriptor,\n    undefined,\n    [BufferConstructor, "isBuffer"]\n  );\n  const candidate = (\n    bufferDescriptor !== undefined &&\n    !("get" in bufferDescriptor) &&\n    !("set" in bufferDescriptor)\n  ) ? bufferDescriptor.value : null;\n  const source = pristineReflectApply(\n'''
if old not in text:
    raise SystemExit("Buffer.isBuffer direct-read marker missing")
text = text.replace(old, new, 1)

# Remove the now-duplicated species getter source declaration near the bottom.
dupe = '''const pristinePromiseSpeciesGetterSource = runInNewContext(\n  "Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)"\n);\n\n'''
if text.count(dupe) != 1:
    raise SystemExit(f"unexpected duplicate species source count: {text.count(dupe)}")
# The top declaration is textually identical; remove the later occurrence by finding it after forbiddenProbes.
idx = text.find('const forbiddenProbes = Object.freeze([')
didx = text.find(dupe, idx)
if didx == -1:
    raise SystemExit("later species source declaration missing")
text = text[:didx] + text[didx + len(dupe):]

old = '''    const descriptor = Object.getOwnPropertyDescriptor(constructor, speciesSymbol);\n'''
new = '''    const descriptor = pristineReflectApply(\n      pristineGetOwnPropertyDescriptor,\n      undefined,\n      [constructor, speciesSymbol]\n    );\n'''
if old not in text:
    raise SystemExit("species descriptor direct-read marker missing")
text = text.replace(old, new, 1)

old = '''function hasForbiddenRuntimeBrand(value) {\n  for (let index = 0; index < forbiddenProbes.length; index += 1) {\n'''
new = '''function hasForbiddenRuntimeBrand(value) {\n  if (isCryptoKey !== null && isCryptoKey(value) === true) return true;\n  if (isKeyObject !== null && isKeyObject(value) === true) return true;\n  for (let index = 0; index < forbiddenProbes.length; index += 1) {\n'''
if old not in text:
    raise SystemExit("hasForbiddenRuntimeBrand marker missing")
text = text.replace(old, new, 1)

old = '''module.exports = Object.freeze({\n  isProxy,\n  isPromise,\n  isTypedArray,\n  bufferIsBuffer,\n  forbiddenProbes,\n  hasForbiddenRuntimeBrand,\n  localFunctionPrototype,\n  hasTrustedLocalPromiseSpecies\n});\n'''
new = '''module.exports = Object.freeze({\n  isProxy,\n  isPromise,\n  isAsyncFunction,\n  isGeneratorFunction,\n  isCryptoKey,\n  isKeyObject,\n  isDate,\n  isRegExp,\n  isMap,\n  isSet,\n  isWeakMap,\n  isWeakSet,\n  isNativeError,\n  isAnyArrayBuffer,\n  isDataView,\n  isTypedArray,\n  isArrayBufferView,\n  isBoxedPrimitive,\n  isArgumentsObject,\n  isGeneratorObject,\n  isModuleNamespaceObject,\n  isMapIterator,\n  isSetIterator,\n  isExternal,\n  bufferIsBuffer,\n  forbiddenProbes,\n  hasForbiddenRuntimeBrand,\n  localFunctionPrototype,\n  inspect,\n  inspectCustom,\n  inspectAuthorityAvailable,\n  arrayIsArray,\n  promiseAuthorityAvailable,\n  promiseConstructor,\n  promisePrototype,\n  promiseThen,\n  promiseSpecies: pristinePromiseSpecies,\n  hasTrustedLocalPromiseSpecies\n});\n'''
if old not in text:
    raise SystemExit("runtime exports marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# AI-data: never retain mutable util.types probes; consume shared authority.
# Also avoid direct util.inspect reads when bootstrap authority is poisoned.
# ---------------------------------------------------------------------------
path = Path("src/ai-data-core.js")
text = path.read_text()
old = '''const {\n  types: utilTypes,\n  inspect\n} = nodeUtil;\n\nconst utilTypePredicates =\n  Object.freeze(\n    Object.create(\n      null,\n      Object.getOwnPropertyDescriptors(\n        utilTypes\n      )\n    )\n  );\n'''
new = '''const inspect =\n  runtimeAuthority.inspect;\nconst inspectCustom =\n  runtimeAuthority.inspectCustom;\n'''
if old not in text:
    raise SystemExit("ai-data util predicate capture marker missing")
text = text.replace(old, new, 1)
text = text.replace('const arrayIsArray =\n  Array.isArray;', 'const arrayIsArray =\n  typeof runtimeAuthority.arrayIsArray === "function"\n    ? runtimeAuthority.arrayIsArray\n    : function unavailableArrayBrand() { return true; };', 1)
text = text.replace('utilTypePredicates.', 'runtimeAuthority.')
text = text.replace('      inspect.custom\n', '      inspectCustom\n')
old = '''function capturePerformanceObserverBrandProbe() {\n  if (\n    typeof PerformanceObserver !==\n'''
new = '''function capturePerformanceObserverBrandProbe() {\n  if (\n    !runtimeAuthority.inspectAuthorityAvailable ||\n    typeof inspect !== "function" ||\n    typeof inspectCustom !== "symbol"\n  ) {\n    return null;\n  }\n\n  if (\n    typeof PerformanceObserver !==\n'''
if old not in text:
    raise SystemExit("performance observer capture marker missing")
text = text.replace(old, new, 1)
old = '''function hasUnsupportedPerformanceObserverBrand(\n  value\n) {\n  if (\n    performanceObserverBrandProbe === null\n  ) {\n    return false;\n  }\n'''
new = '''function hasUnsupportedPerformanceObserverBrand(\n  value\n) {\n  if (!runtimeAuthority.inspectAuthorityAvailable) {\n    return true;\n  }\n  if (\n    performanceObserverBrandProbe === null\n  ) {\n    return false;\n  }\n'''
if old not in text:
    raise SystemExit("performance observer runtime marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# M8: consume shared authenticated Promise/Array authority and fail before
# evaluator/generator execution if it is unavailable or species is no longer
# trusted.
# ---------------------------------------------------------------------------
path = Path("src/contract-attacks-core.js")
text = path.read_text()
start = text.index('const promiseCaptureGetOwnPropertyDescriptor =')
end_marker = '// The M8 core owns the experiment authority.'
end = text.index(end_marker)
replacement = '''const promiseCaptureGetOwnPropertyDescriptor =\n  Object.getOwnPropertyDescriptor;\nconst promiseCaptureGetPrototypeOf =\n  Object.getPrototypeOf;\n\nconst intrinsicPromiseProbe =\n  (async function gotchaIntrinsicPromiseProbe() {})();\nconst intrinsicPromisePrototype =\n  promiseCaptureGetPrototypeOf(intrinsicPromiseProbe);\nconst promiseAuthorityAvailable =\n  runtimeAuthority.promiseAuthorityAvailable === true;\nconst intrinsicPromiseConstructor =\n  promiseAuthorityAvailable\n    ? runtimeAuthority.promiseConstructor\n    : null;\nconst intrinsicPromiseThen =\n  promiseAuthorityAvailable\n    ? runtimeAuthority.promiseThen\n    : null;\nconst capturedAmbientPromiseConstructor =\n  intrinsicPromiseConstructor;\nconst capturedAmbientPromisePrototype =\n  promiseAuthorityAvailable\n    ? runtimeAuthority.promisePrototype\n    : intrinsicPromisePrototype;\nconst capturedAmbientPromiseThen =\n  intrinsicPromiseThen;\n\n'''
text = text[:start] + replacement + text[end:]
text = text.replace('    arrayIsArray:\n      Array.isArray,', '    arrayIsArray:\n      runtimeAuthority.arrayIsArray,', 1)
text = text.replace('    PromiseSpecies:\n      Symbol.species', '    PromiseSpecies:\n      runtimeAuthority.promiseSpecies', 1)
text = text.replace('const arrayIsArray =\n  Array.isArray;', 'const arrayIsArray =\n  runtimeAuthority.arrayIsArray;', 1)
text = text.replace('const promiseSpecies =\n  Symbol.species;', 'const promiseSpecies =\n  runtimeAuthority.promiseSpecies;', 1)
old = '''function requirePromiseIntrinsicIntegrity() {\n  const currentPrototypeConstructor =\n'''
new = '''function requirePromiseIntrinsicIntegrity() {\n  if (\n    !promiseAuthorityAvailable ||\n    typeof promiseConstructor !== "function" ||\n    typeof promiseThen !== "function" ||\n    promisePrototype === null ||\n    !runtimeAuthority.hasTrustedLocalPromiseSpecies(\n      promiseConstructor,\n      promiseSpecies\n    )\n  ) {\n    throw new Error(\n      "Promise intrinsic authority is unavailable."\n    );\n  }\n\n  const currentPrototypeConstructor =\n'''
if old not in text:
    raise SystemExit("M8 promise integrity marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# M13 proposal: safe own-constructor undefined handling and species checks.
# ---------------------------------------------------------------------------
path = Path("src/contract-protection-proposal.js")
text = path.read_text()
old = '''function trustedPromiseConstructorDescriptor(descriptor) {\n  return (\n    descriptor !== undefined &&\n    !("get" in descriptor) &&\n    !("set" in descriptor) &&\n    descriptor.value === trustedPromiseConstructor\n  );\n}\n'''
new = '''function trustedPromiseConstructorDescriptor(descriptor) {\n  return (\n    descriptor !== undefined &&\n    !("get" in descriptor) &&\n    !("set" in descriptor) &&\n    descriptor.value === trustedPromiseConstructor &&\n    runtimeAuthority.hasTrustedLocalPromiseSpecies(\n      trustedPromiseConstructor,\n      promiseSpecies\n    )\n  );\n}\n\nfunction constructorDescriptorUsesSafeDefaultSpecies(descriptor) {\n  if (\n    descriptor === undefined ||\n    "get" in descriptor ||\n    "set" in descriptor\n  ) return false;\n  if (descriptor.value === undefined) return true;\n  return trustedPromiseConstructorDescriptor(descriptor);\n}\n'''
if old not in text:
    raise SystemExit("M13 trusted descriptor marker missing")
text = text.replace(old, new, 1)
old = '''    if (!trustedPromiseConstructorDescriptor(previousConstructor)) return false;\n    reflectApply(promiseThen, promise, [undefined, () => {}]);\n'''
new = '''    if (!constructorDescriptorUsesSafeDefaultSpecies(previousConstructor)) return false;\n    reflectApply(promiseThen, promise, [undefined, () => {}]);\n'''
if old not in text:
    raise SystemExit("M13 consume nonconfig marker missing")
text = text.replace(old, new, 1)
old = '''    if (!trustedPromiseConstructorDescriptor(previousConstructor)) throw boundaryError();\n    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);\n    return;\n'''
new = '''    if (trustedPromiseConstructorDescriptor(previousConstructor)) {\n      reflectApply(promiseThen, promise, [onFulfilled, onRejected]);\n      return;\n    }\n    consumeRejectedRecognizedPromise(promise);\n    throw boundaryError();\n'''
if old not in text:
    raise SystemExit("M13 observe nonconfig marker missing")
text = text.replace(old, new, 1)
old = '''    if (!trustedPromiseConstructorDescriptor(\n      getOwnPropertyDescriptor(promisePrototype, "constructor")\n    )) throw boundaryError();\n    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);\n'''
new = '''    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) throw boundaryError();\n    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);\n'''
if old not in text:
    raise SystemExit("M13 observe nonextensible marker missing")
text = text.replace(old, new, 1)
# Require shared Promise species authority as part of M13 boundary availability.
old = '''if (!promiseAuthorityVerified || typeof promiseSpecies !== "symbol") {\n  boundaryAuthorityAvailable = false;\n}\n'''
new = '''if (\n  !promiseAuthorityVerified ||\n  typeof promiseSpecies !== "symbol" ||\n  runtimeAuthority.promiseAuthorityAvailable !== true ||\n  trustedPromiseConstructor !== runtimeAuthority.promiseConstructor ||\n  !runtimeAuthority.hasTrustedLocalPromiseSpecies(\n    trustedPromiseConstructor,\n    promiseSpecies\n  )\n) {\n  boundaryAuthorityAvailable = false;\n}\n'''
if old not in text:
    raise SystemExit("M13 boundary promise marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# Provider adapter: same Promise default/species rules; shared Array authority.
# ---------------------------------------------------------------------------
path = Path("src/provider-adapter-m13.js")
text = path.read_text()
text = text.replace('const promiseSpecies = Symbol.species;', 'const promiseSpecies = runtimeAuthority.promiseSpecies;', 1)
text = text.replace('const arrayIsArray = Array.isArray;', 'const arrayIsArray = runtimeAuthority.arrayIsArray;', 1)
old = '''const providerBrandAuthorityAvailable = (\n  isProxy === runtimeAuthority.isProxy &&\n  isPromise === runtimeAuthority.isPromise\n);\n'''
new = '''const providerBrandAuthorityAvailable = (\n  isProxy === runtimeAuthority.isProxy &&\n  isPromise === runtimeAuthority.isPromise &&\n  typeof arrayIsArray === "function"\n);\n'''
if old not in text:
    raise SystemExit("provider brand authority marker missing")
text = text.replace(old, new, 1)
old = '''  promiseAuthorityAvailable =\n    providerBrandAuthorityAvailable &&\n    intrinsicAuthorityValid &&\n    ambientPrototypeMatches;\n'''
new = '''  promiseAuthorityAvailable =\n    providerBrandAuthorityAvailable &&\n    intrinsicAuthorityValid &&\n    ambientPrototypeMatches &&\n    runtimeAuthority.promiseAuthorityAvailable === true &&\n    trustedPromiseConstructor === runtimeAuthority.promiseConstructor &&\n    trustedPromisePrototype === runtimeAuthority.promisePrototype &&\n    trustedPromiseThen === runtimeAuthority.promiseThen &&\n    runtimeAuthority.hasTrustedLocalPromiseSpecies(\n      trustedPromiseConstructor,\n      promiseSpecies\n    );\n'''
if old not in text:
    raise SystemExit("provider promise availability marker missing")
text = text.replace(old, new, 1)
old = '''function constructorDescriptorIsTrusted(descriptor) {\n  return (\n    descriptor !== undefined &&\n    !("get" in descriptor) &&\n    !("set" in descriptor) &&\n    descriptor.value === trustedPromiseConstructor\n  );\n}\n'''
new = '''function constructorDescriptorIsTrusted(descriptor) {\n  return (\n    descriptor !== undefined &&\n    !("get" in descriptor) &&\n    !("set" in descriptor) &&\n    descriptor.value === trustedPromiseConstructor &&\n    runtimeAuthority.hasTrustedLocalPromiseSpecies(\n      trustedPromiseConstructor,\n      promiseSpecies\n    )\n  );\n}\n\nfunction constructorDescriptorUsesSafeDefaultSpecies(descriptor) {\n  if (\n    descriptor === undefined ||\n    "get" in descriptor ||\n    "set" in descriptor\n  ) return false;\n  if (descriptor.value === undefined) return true;\n  return constructorDescriptorIsTrusted(descriptor);\n}\n'''
if old not in text:
    raise SystemExit("provider trusted descriptor marker missing")
text = text.replace(old, new, 1)
old = '''    if (!constructorDescriptorIsTrusted(constructorDescriptor)) return false;\n    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);\n'''
new = '''    if (!constructorDescriptorUsesSafeDefaultSpecies(constructorDescriptor)) return false;\n    reflectApply(trustedPromiseThen, promise, [undefined, () => {}]);\n'''
if old not in text:
    raise SystemExit("provider consume nonconfig marker missing")
text = text.replace(old, new, 1)
old = '''    if (!constructorDescriptorIsTrusted(constructorDescriptor)) throw boundaryError();\n    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);\n    return;\n'''
new = '''    if (constructorDescriptorIsTrusted(constructorDescriptor)) {\n      reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);\n      return;\n    }\n    consumeRejectedRecognizedPromise(promise);\n    throw boundaryError();\n'''
if old not in text:
    raise SystemExit("provider observe nonconfig marker missing")
text = text.replace(old, new, 1)
old = '''    if (!prototypeConstructorIsTrusted(promise)) throw boundaryError();\n    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);\n'''
new = '''    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) throw boundaryError();\n    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);\n'''
if old not in text:
    raise SystemExit("provider observe nonextensible marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# Mutation Pack: all callback/Promise probes from shared authority; never call
# Promise.then on an unshadowable Promise until effective constructor/species
# is proven safe.
# ---------------------------------------------------------------------------
path = Path("src/mutation-pack.js")
text = path.read_text()
text = text.replace('const { types: utilTypes } = require("node:util");\n', '', 1)
text = text.replace('const functionToString = Function.prototype.toString;', 'const functionToString = runInNewContext("Function.prototype.toString");', 1)
start = text.index('const mutationPromiseProbe =')
end = text.index('const safePromiseSpecies = Object.freeze({')
replacement = '''const promiseThen =\n  runtimeAuthority.promiseAuthorityAvailable\n    ? runtimeAuthority.promiseThen\n    : null;\nconst promiseConstructor =\n  runtimeAuthority.promiseAuthorityAvailable\n    ? runtimeAuthority.promiseConstructor\n    : null;\nconst promiseSpecies = runtimeAuthority.promiseSpecies;\nconst asyncFunctionProbe = runtimeAuthority.isAsyncFunction;\nconst generatorFunctionProbe = runtimeAuthority.isGeneratorFunction;\nconst objectPrototype = Object.prototype;\n\n'''
text = text[:start] + replacement + text[end:]
text = text.replace('[Symbol.species]: null', '[promiseSpecies]: null', 1)
text = text.replace('utilTypes.isAsyncFunction(fn)', 'asyncFunctionProbe(fn)')
text = text.replace('utilTypes.isGeneratorFunction(fn)', 'generatorFunctionProbe(fn)')
text = text.replace('utilTypes.isPromise(value)', 'runtimeAuthority.isPromise(value)')
text = text.replace('!Array.isArray(prototype)', '!runtimeAuthority.arrayIsArray(prototype)')
text = text.replace('const isArray =\n    Array.isArray(value);', 'const isArray =\n    runtimeAuthority.arrayIsArray(value);', 1)

start = text.index('function consumeNativePromiseRejection(')
end = text.index('function rejectNativePromiseResult(', start)
replacement = r'''function constructorUsesSafeDefaultSpecies(constructor) {
  if (constructor === undefined) return true;
  if (constructor === promiseConstructor) {
    return runtimeAuthority.hasTrustedLocalPromiseSpecies(
      constructor,
      promiseSpecies
    );
  }
  const objectConstructorDescriptor = Reflect.apply(
    getOwnPropertyDescriptor,
    Object,
    [objectPrototype, "constructor"]
  );
  const objectConstructor = (
    objectConstructorDescriptor !== undefined &&
    !("get" in objectConstructorDescriptor) &&
    !("set" in objectConstructorDescriptor)
  ) ? objectConstructorDescriptor.value : null;
  if (
    constructor !== objectConstructor ||
    typeof constructor !== "function" ||
    runtimeAuthority.isProxy(constructor)
  ) return false;
  const speciesDescriptor = Reflect.apply(
    getOwnPropertyDescriptor,
    Object,
    [constructor, promiseSpecies]
  );
  return speciesDescriptor === undefined;
}

function unshadowablePromiseUsesSafeDefaultSpecies(value, ownConstructor) {
  if (ownConstructor !== undefined) {
    if ("get" in ownConstructor || "set" in ownConstructor) return false;
    return constructorUsesSafeDefaultSpecies(ownConstructor.value);
  }
  let prototype = getPrototypeOf(value);
  while (prototype !== null) {
    if (runtimeAuthority.isProxy(prototype)) return false;
    const descriptor = Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [prototype, "constructor"]
    );
    if (descriptor !== undefined) {
      if ("get" in descriptor || "set" in descriptor) return false;
      return constructorUsesSafeDefaultSpecies(descriptor.value);
    }
    prototype = getPrototypeOf(prototype);
  }
  return true;
}

function consumeNativePromiseRejection(
  value
) {
  if (typeof promiseThen !== "function") return false;

  const originalConstructor =
    Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [
        value,
        "constructor"
      ]
    );

  let constructorShadowed =
    false;

  try {
    const canShadowConstructor =
      originalConstructor ===
        undefined
        ? Reflect.apply(
            isExtensible,
            Object,
            [
              value
            ]
          )
        : originalConstructor
            .configurable;

    if (
      canShadowConstructor
    ) {
      Reflect.apply(
        defineProperty,
        Object,
        [
          value,
          "constructor",
          {
            value:
              safePromiseSpecies,
            configurable: true,
            enumerable: false,
            writable: false
          }
        ]
      );

      constructorShadowed =
        true;
    } else if (!unshadowablePromiseUsesSafeDefaultSpecies(
      value,
      originalConstructor
    )) {
      return false;
    }

    Reflect.apply(
      promiseThen,
      value,
      [
        undefined,
        () => {}
      ]
    );
    return true;
  } finally {
    if (
      constructorShadowed
    ) {
      if (
        originalConstructor ===
          undefined
      ) {
        Reflect.apply(
          deleteProperty,
          Reflect,
          [
            value,
            "constructor"
          ]
        );
      } else {
        Reflect.apply(
          defineProperty,
          Object,
          [
            value,
            "constructor",
            originalConstructor
          ]
        );
      }
    }
  }
}

'''
text = text[:start] + replacement + text[end:]
old = '''function compileMutationPack(\n  options = {}\n) {\n  const optionDescriptors =\n'''
new = '''function compileMutationPack(\n  options = {}\n) {\n  if (\n    runtimeAuthority.promiseAuthorityAvailable !== true ||\n    typeof promiseThen !== "function" ||\n    typeof promiseConstructor !== "function" ||\n    typeof asyncFunctionProbe !== "function" ||\n    typeof generatorFunctionProbe !== "function" ||\n    typeof runtimeAuthority.arrayIsArray !== "function" ||\n    !runtimeAuthority.hasTrustedLocalPromiseSpecies(\n      promiseConstructor,\n      promiseSpecies\n    )\n  ) {\n    throw new Error(\n      "Mutation Pack runtime authority is unavailable."\n    );\n  }\n\n  const optionDescriptors =\n'''
if old not in text:
    raise SystemExit("mutation compile marker missing")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# Round-6 permanent regressions.
# ---------------------------------------------------------------------------
path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
marker = '// ROUND6_CODEX_AUTHORITY_REGRESSIONS\n'
if marker not in text:
    addition = r'''

// ROUND6_CODEX_AUTHORITY_REGRESSIONS

test("round6 AI-data never invokes retained Proxy forbidden-brand probes", () => {
  const modulePath = path.join(repoRoot, "src", "ai-data-core.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isDate;
    let trapCalls = 0;
    util.types.isDate = new Proxy(original, {
      apply() { trapCalls += 1; throw new Error("isDate trap executed"); }
    });
    const api = require(${JSON.stringify(modulePath)});
    util.types.isDate = original;
    try { api.cloneAiData({}); } catch {}
    if (trapCalls !== 0) process.exitCode = 90;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 util.inspect accessor is never invoked during package bootstrap", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const descriptor = Object.getOwnPropertyDescriptor(util, "inspect");
    let getterCalls = 0;
    Object.defineProperty(util, "inspect", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() { getterCalls += 1; throw new Error("inspect getter executed"); }
    });
    try { require(${JSON.stringify(modulePath)}); }
    catch (error) { console.error(error); process.exitCode = 91; }
    Object.defineProperty(util, "inspect", descriptor);
    if (getterCalls !== 0) process.exitCode = 92;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 Buffer.isBuffer accessor is never invoked during package bootstrap", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const { Buffer } = require("node:buffer");
  const code = `
    "use strict";
    const { Buffer } = require("node:buffer");
    const descriptor = Object.getOwnPropertyDescriptor(Buffer, "isBuffer");
    let getterCalls = 0;
    Object.defineProperty(Buffer, "isBuffer", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() { getterCalls += 1; throw new Error("Buffer.isBuffer getter executed"); }
    });
    try { require(${JSON.stringify(modulePath)}); }
    catch (error) { console.error(error); process.exitCode = 93; }
    Object.defineProperty(Buffer, "isBuffer", descriptor);
    if (getterCalls !== 0) process.exitCode = 94;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 pre-load Proxy Array.isArray fails closed without trap execution", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const descriptor = Object.getOwnPropertyDescriptor(Array, "isArray");
    let trapCalls = 0;
    Object.defineProperty(Array, "isArray", {
      ...descriptor,
      value: new Proxy(descriptor.value, {
        apply() { trapCalls += 1; throw new Error("Array.isArray trap executed"); }
      })
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(Array, "isArray", descriptor);
    const returned = api.generateContractProtectionProposal({});
    returned.then(
      () => { process.exitCode = 95; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 96;
        if (trapCalls !== 0) process.exitCode = 97;
      }
    );
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 M8 rejects poisoned Promise constructor and then before callbacks", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const constructorDescriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    const thenDescriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "then");
    let poisonCalls = 0;
    function PoisonPromise(executor) { poisonCalls += 1; return new NativePromise(executor); }
    function poisonThen(onFulfilled, onRejected) {
      poisonCalls += 1;
      return Reflect.apply(thenDescriptor.value, this, [onFulfilled, onRejected]);
    }
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: PoisonPromise, writable: true, enumerable: false, configurable: true
    });
    Object.defineProperty(NativePromise.prototype, "then", {
      value: poisonThen, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    let callbackCalls = 0;
    let returned;
    try {
      returned = api.runContractAttacks({
        contract: {
          version: 1,
          status: "confirmed",
          task: "Return approved time.",
          rules: [{ id: "time-rule", statement: "Time is 3 PM.", kind: "required", severity: "major" }]
        },
        input: {},
        expectedOutput: {},
        evaluator() { callbackCalls += 1; return true; },
        generator() { callbackCalls += 1; return { version: 1, task: "Return approved time.", attacks: [] }; }
      });
    } catch {}
    Object.defineProperty(NativePromise.prototype, "constructor", constructorDescriptor);
    Object.defineProperty(NativePromise.prototype, "then", thenDescriptor);
    if (returned && typeof returned.then === "function") returned.then(() => {}, () => {});
    setImmediate(() => {
      if (callbackCalls !== 0 || poisonCalls !== 0) process.exitCode = 98;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round6 consumes non-configurable undefined-constructor rejected generator and transport Promises", async () => {
  const experiment = await makeExperiment();
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.on("unhandledRejection", listener);

  const generatorPromise = Promise.reject({ code: "round6-generator-undefined-constructor" });
  Object.defineProperty(generatorPromise, "constructor", {
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() { return generatorPromise; }
  }), TypeError);

  const { createStructuredProviderAdapter } = require("../src");
  const transportPromise = Promise.reject({ code: "round6-transport-undefined-constructor" });
  Object.defineProperty(transportPromise, "constructor", {
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false
  });
  const adapter = createStructuredProviderAdapter({
    mode: "contract-protection",
    model: "x",
    transport() { return transportPromise; }
  });
  await assert.rejects(adapter({
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: { id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" },
    attack: {
      id: "wrong-time", ruleId: "time-rule", type: "wrong-time",
      description: "Changes the approved time.", rationale: "Violates the confirmed rule.", output: {}
    },
    instructions:
      "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
      "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
      "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
      "The protection statement must describe what the quality system should enforce.\n" +
      "The rationale must explain why this protection addresses the selected survivor."
  }), TypeError);

  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, null);
});

test("round6 Mutation Pack never executes inherited Proxy species traps", async () => {
  const { compileMutationPack } = require("../src/mutation-pack");
  let trapCalls = 0;
  let unhandled = null;
  const listener = (value) => { unhandled = value; };
  process.on("unhandledRejection", listener);

  const rejected = Promise.reject({ code: "round6-mutation-hostile-species" });
  const hostileConstructor = new Proxy(function HostilePromiseConstructor() {}, {
    get(target, property, receiver) {
      if (property === Symbol.species) {
        trapCalls += 1;
        throw new Error("species trap executed");
      }
      return Reflect.get(target, property, receiver);
    }
  });
  const prototype = {};
  Object.defineProperty(prototype, "constructor", {
    value: hostileConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.setPrototypeOf(rejected, prototype);
  Object.preventExtensions(rejected);

  const pack = [{
    id: "wrong-value",
    type: "value-substitution",
    description: "Changes the expected value.",
    mutate() { return rejected; },
    scores: { severity: 1, realism: 0.9, subtlety: 0.8, novelty: 0.7, fixability: 0.6 },
    protection: { description: "Keep value correct.", check() { return true; } }
  }];
  assert.throws(
    () => compileMutationPack({ output: { value: "good" }, pack }),
    /Async mutations are not supported|runtime authority is unavailable/i
  );
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener("unhandledRejection", listener);
  assert.equal(trapCalls, 0);
  // This hostile unshadowable Promise cannot be safely observed; the important
  // boundary is that Gotcha does not execute its constructor/species trap.
  void unhandled;
});

test("round6 poisoned Promise species fails closed before M13 generator or transport", async () => {
  const experiment = await makeExperiment();
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const speciesDescriptor = Object.getOwnPropertyDescriptor(NativePromise, Symbol.species);
    let speciesCalls = 0;
    Object.defineProperty(NativePromise, Symbol.species, {
      configurable: true,
      enumerable: false,
      get() { speciesCalls += 1; throw new Error("species getter executed"); }
    });
    const api = require(${JSON.stringify(modulePath)});
    let generatorCalls = 0;
    let transportCalls = 0;
    const p1 = api.generateContractProtectionProposal({
      experiment: JSON.parse(process.env.EXPERIMENT),
      sourceAttackId: "wrong-time",
      generator() { generatorCalls += 1; return NativePromise.reject(new Error("generator")); }
    });
    let p2;
    try {
      const adapter = api.createStructuredProviderAdapter({
        mode: "contract-protection",
        model: "x",
        transport() { transportCalls += 1; return NativePromise.reject(new Error("transport")); }
      });
      p2 = adapter({});
    } catch (error) { p2 = NativePromise.reject(error); }
    Object.defineProperty(NativePromise, Symbol.species, speciesDescriptor);
    NativePromise.allSettled([p1, p2]).then(() => {
      if (speciesCalls !== 0 || generatorCalls !== 0 || transportCalls !== 0) process.exitCode = 99;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, EXPERIMENT: JSON.stringify(experiment) }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
    text += addition
path.write_text(text)

print("round6 remediation and regressions applied")
