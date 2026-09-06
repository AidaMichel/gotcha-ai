"use strict";

const runtimeAuthority = require("./runtime-authority");
const packageAuthority = require("./package-authority");

const p = runtimeAuthority.consumerPrimordials;
const authorityAvailable =
  runtimeAuthority.consumerPrimordialsAvailable === true &&
  p !== null &&
  typeof runtimeAuthority.isProxy === "function" &&
  typeof runtimeAuthority.hasForbiddenRuntimeBrand === "function";

const reflectApply = authorityAvailable ? p.reflectApply : null;
const getPrototypeOf = authorityAvailable ? p.getPrototypeOf : null;
const getOwnPropertyDescriptor = authorityAvailable ? p.getOwnPropertyDescriptor : null;
const getOwnPropertyDescriptors = authorityAvailable ? p.getOwnPropertyDescriptors : null;
const defineProperty = authorityAvailable ? p.defineProperty : null;
const ownKeys = authorityAvailable ? p.ownKeys : null;
const arrayIsArray = authorityAvailable ? p.arrayIsArray : null;
const numberIsFinite = authorityAvailable ? p.numberIsFinite : null;
const objectIs = authorityAvailable ? p.objectIs : null;
const objectFreeze = authorityAvailable ? p.objectFreeze : null;
const MapConstructor = authorityAvailable ? p.MapConstructor : null;
const mapGet = authorityAvailable ? p.mapGet : null;
const mapSet = authorityAvailable ? p.mapSet : null;
const arrayPush = authorityAvailable ? p.arrayPush : null;
const arrayPop = authorityAvailable ? p.arrayPop : null;
const functionToString = authorityAvailable ? p.functionToString : null;
const isProxy = runtimeAuthority.isProxy;
const hasForbiddenRuntimeBrand = runtimeAuthority.hasForbiddenRuntimeBrand;
const TypeErrorConstructor = packageAuthority.TypeErrorConstructor;

const objectPrototype = authorityAvailable
  ? reflectApply(getPrototypeOf, undefined, [{}])
  : null;
const arrayPrototype = authorityAvailable
  ? reflectApply(getPrototypeOf, undefined, [[]])
  : null;

function captureTrustedBrandMethod(Constructor, key, expectedSource) {
  if (
    !authorityAvailable ||
    typeof Constructor !== "function" ||
    isProxy(Constructor)
  ) return null;
  try {
    const prototypeDescriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [Constructor, "prototype"]
    );
    const prototype =
      prototypeDescriptor !== undefined &&
      !("get" in prototypeDescriptor) &&
      !("set" in prototypeDescriptor)
        ? prototypeDescriptor.value
        : null;
    if (prototype === null || typeof prototype !== "object" || isProxy(prototype)) {
      return null;
    }
    const descriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [prototype, key]
    );
    const candidate =
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
        ? descriptor.value
        : null;
    if (
      descriptor === undefined ||
      descriptor.writable !== true ||
      descriptor.enumerable !== false ||
      descriptor.configurable !== true ||
      typeof candidate !== "function" ||
      isProxy(candidate) ||
      reflectApply(getPrototypeOf, undefined, [candidate]) !==
        runtimeAuthority.localFunctionPrototype ||
      reflectApply(functionToString, candidate, []) !== expectedSource
    ) return null;
    return candidate;
  } catch {
    return null;
  }
}

const weakRefDeref = captureTrustedBrandMethod(
  runtimeAuthority.weakRefConstructor,
  "deref",
  "function deref() { [native code] }"
);
const finalizationRegistryUnregister = captureTrustedBrandMethod(
  runtimeAuthority.finalizationRegistryConstructor,
  "unregister",
  "function unregister() { [native code] }"
);
const finalizationRegistryProbeToken = {};

function hasSlotBackedRuntimeBrand(value) {
  if (weakRefDeref !== null) {
    try {
      reflectApply(weakRefDeref, value, []);
      return true;
    } catch {}
  }
  if (finalizationRegistryUnregister !== null) {
    try {
      reflectApply(
        finalizationRegistryUnregister,
        value,
        [finalizationRegistryProbeToken]
      );
      return true;
    } catch {}
  }
  return false;
}

let objectCreate = null;
if (authorityAvailable && objectPrototype !== null) {
  try {
    const constructorDescriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [objectPrototype, "constructor"]
    );
    const objectConstructor =
      constructorDescriptor !== undefined &&
      !("get" in constructorDescriptor) &&
      !("set" in constructorDescriptor)
        ? constructorDescriptor.value
        : null;
    const createDescriptor = objectConstructor !== null
      ? reflectApply(getOwnPropertyDescriptor, undefined, [objectConstructor, "create"])
      : undefined;
    const candidate =
      createDescriptor !== undefined &&
      !("get" in createDescriptor) &&
      !("set" in createDescriptor)
        ? createDescriptor.value
        : null;
    if (
      typeof candidate === "function" &&
      !isProxy(candidate) &&
      reflectApply(functionToString, candidate, []) ===
        "function create() { [native code] }"
    ) objectCreate = candidate;
  } catch {
    objectCreate = null;
  }
}

function boundaryError(message) {
  if (typeof TypeErrorConstructor === "function") {
    return new TypeErrorConstructor(message);
  }
  try { null.legacyAiDataBoundary; } catch (error) { return error; }
  return null;
}

function requireAuthority() {
  if (!authorityAvailable || typeof objectCreate !== "function") {
    throw boundaryError("Legacy AI-data authority is unavailable.");
  }
}

function activeContains(active, value) {
  for (let index = 0; index < active.length; index += 1) {
    if (active[index] === value) return true;
  }
  return false;
}

function isUnsupportedRuntimeObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (!authorityAvailable) return true;
  try {
    if (
      isProxy(value) ||
      hasForbiddenRuntimeBrand(value) ||
      hasSlotBackedRuntimeBrand(value)
    ) return true;
    const prototype = reflectApply(getPrototypeOf, undefined, [value]);
    return prototype !== null && isProxy(prototype);
  } catch {
    return true;
  }
}

function captureLocalConstructorSource(prototype, expectedName) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    isProxy(prototype)
  ) return null;
  try {
    const descriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [prototype, "constructor"]
    );
    const constructor =
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
        ? descriptor.value
        : null;
    if (
      typeof constructor !== "function" ||
      isProxy(constructor)
    ) return null;
    const source = reflectApply(functionToString, constructor, []);
    return source === `function ${expectedName}() { [native code] }`
      ? source
      : null;
  } catch {
    return null;
  }
}

const objectConstructorSource = captureLocalConstructorSource(
  objectPrototype,
  "Object"
);
const arrayConstructorSource = captureLocalConstructorSource(
  arrayPrototype,
  "Array"
);

function isNativeConstructorDescriptor(
  descriptor,
  expectedSource,
  expectedPrototype
) {
  if (
    expectedSource === null ||
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    typeof descriptor.value !== "function" ||
    isProxy(descriptor.value)
  ) return false;
  try {
    const source = reflectApply(
      functionToString,
      descriptor.value,
      []
    );
    const prototypeDescriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [descriptor.value, "prototype"]
    );
    return (
      source === expectedSource &&
      prototypeDescriptor !== undefined &&
      !("get" in prototypeDescriptor) &&
      !("set" in prototypeDescriptor) &&
      prototypeDescriptor.value === expectedPrototype
    );
  } catch {
    return false;
  }
}

function isOrdinaryObjectPrototype(prototype) {
  if (prototype === null) return true;
  if (typeof prototype !== "object" || isProxy(prototype)) return false;
  try {
    const parent = reflectApply(getPrototypeOf, undefined, [prototype]);
    if (parent !== null) return false;
    const constructorDescriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [prototype, "constructor"]
    );
    return isNativeConstructorDescriptor(
      constructorDescriptor,
      objectConstructorSource,
      prototype
    );
  } catch {
    return false;
  }
}

function isOrdinaryArrayPrototype(prototype) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    isProxy(prototype)
  ) return false;
  try {
    const parent = reflectApply(getPrototypeOf, undefined, [prototype]);
    if (!isOrdinaryObjectPrototype(parent)) return false;
    const constructorDescriptor = reflectApply(
      getOwnPropertyDescriptor,
      undefined,
      [prototype, "constructor"]
    );
    return isNativeConstructorDescriptor(
      constructorDescriptor,
      arrayConstructorSource,
      prototype
    );
  } catch {
    return false;
  }
}

function requirePlainDataPrototype(value, label) {
  const prototype = reflectApply(getPrototypeOf, undefined, [value]);
  if (prototype !== null && isProxy(prototype)) {
    throw boundaryError(`${label} must not use a Proxy prototype.`);
  }
  if (arrayIsArray(value)) {
    if (!isOrdinaryArrayPrototype(prototype)) {
      throw boundaryError(`${label} must be a plain array.`);
    }
  } else if (!isOrdinaryObjectPrototype(prototype)) {
    throw boundaryError(`${label} must be a plain object.`);
  }
  return prototype;
}

function primitive(value, label) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return { matched: true, value };
  }
  if (typeof value === "number") {
    if (!numberIsFinite(value)) {
      throw boundaryError(`${label} must contain finite numbers only.`);
    }
    return { matched: true, value: objectIs(value, -0) ? 0 : value };
  }
  if (typeof value === "function") {
    throw boundaryError(`${label} must not contain functions.`);
  }
  if (typeof value !== "object") {
    throw boundaryError(`${label} contains unsupported data.`);
  }
  return { matched: false, value: null };
}

function captureEntries(value, label, isArray) {
  const descriptors = reflectApply(getOwnPropertyDescriptors, undefined, [value]);
  const keys = reflectApply(ownKeys, undefined, [descriptors]);
  const entries = [];

  if (isArray) {
    const lengthDescriptor = descriptors.length;
    if (
      lengthDescriptor === undefined ||
      !("value" in lengthDescriptor) ||
      "get" in lengthDescriptor ||
      "set" in lengthDescriptor ||
      typeof lengthDescriptor.value !== "number" ||
      !numberIsFinite(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.value % 1 !== 0
    ) throw boundaryError(`${label} has an invalid array length.`);

    const length = lengthDescriptor.value;
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      if (key === "length") continue;
      if (typeof key !== "string") {
        throw boundaryError(`${label} must not contain symbol keys.`);
      }
      const numeric = Number(key);
      if (
        !numberIsFinite(numeric) ||
        numeric < 0 ||
        numeric % 1 !== 0 ||
        numeric >= length ||
        `${numeric}` !== key
      ) throw boundaryError(`${label} has an invalid array property.`);
      const descriptor = descriptors[key];
      if (descriptor === undefined) {
        throw boundaryError(`${label}[${numeric}] is missing.`);
      }
      if ("get" in descriptor || "set" in descriptor) {
        throw boundaryError(`${label}[${numeric}] must not contain accessor properties.`);
      }
      if (!("value" in descriptor) || descriptor.enumerable !== true) {
        throw boundaryError(`${label}[${numeric}] must use an enumerable data property.`);
      }
    }
    for (let index = 0; index < length; index += 1) {
      const key = `${index}`;
      const descriptor = descriptors[key];
      if (descriptor === undefined) throw boundaryError(`${label} must not be sparse.`);
      reflectApply(arrayPush, entries, [{ key, value: descriptor.value, label: `${label}[${index}]` }]);
    }
    return { entries, length };
  }

  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    if (typeof key !== "string") {
      throw boundaryError(`${label} must not contain symbol keys.`);
    }
    const descriptor = descriptors[key];
    if (descriptor === undefined) {
      throw boundaryError(`${label}.${key} is missing.`);
    }
    if ("get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label}.${key} must not contain accessor properties.`);
    }
    if (!("value" in descriptor) || descriptor.enumerable !== true) {
      throw boundaryError(`${label}.${key} must use an enumerable data property.`);
    }
    reflectApply(arrayPush, entries, [{ key, value: descriptor.value, label: `${label}.${key}` }]);
  }
  return { entries, length: null };
}

function prepare(value, label, active, memo) {
  const scalar = primitive(value, label);
  if (scalar.matched) return { value: scalar.value, frame: null };
  if (isUnsupportedRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  requirePlainDataPrototype(value, label);
  if (activeContains(active, value)) {
    throw boundaryError(`${label} must not contain cyclic references.`);
  }
  const memoized = reflectApply(mapGet, memo, [value]);
  if (memoized !== undefined) return { value: memoized, frame: null };

  const isArray = arrayIsArray(value);
  const prototype = reflectApply(getPrototypeOf, undefined, [value]);
  const captured = captureEntries(value, label, isArray);
  let target;
  if (isArray) {
    target = [];
    reflectApply(defineProperty, undefined, [target, "length", {
      value: captured.length,
      writable: true,
      enumerable: false,
      configurable: false
    }]);
  } else {
    target = prototype === null
      ? reflectApply(objectCreate, undefined, [null])
      : {};
  }
  reflectApply(mapSet, memo, [value, target]);
  reflectApply(arrayPush, active, [value]);
  return {
    value: target,
    frame: { source: value, target, entries: captured.entries, index: 0 }
  };
}

function cloneAiData(value, label = "AI data") {
  requireAuthority();
  const active = [];
  const memo = new MapConstructor();
  const root = prepare(value, label, active, memo);
  if (root.frame === null) return root.value;
  const stack = [];
  reflectApply(arrayPush, stack, [root.frame]);
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    if (frame.index >= frame.entries.length) {
      reflectApply(arrayPop, active, []);
      reflectApply(arrayPop, stack, []);
      continue;
    }
    const entry = frame.entries[frame.index++];
    const child = prepare(entry.value, entry.label, active, memo);
    reflectApply(defineProperty, undefined, [frame.target, entry.key, {
      value: child.value,
      writable: true,
      enumerable: true,
      configurable: true
    }]);
    if (child.frame !== null) reflectApply(arrayPush, stack, [child.frame]);
  }
  return root.value;
}

function freezeAiData(value, label = "AI data") {
  requireAuthority();
  if (value === null || typeof value !== "object") return value;
  const seen = new MapConstructor();
  const stack = [{ value, label }];
  while (stack.length > 0) {
    const frame = reflectApply(arrayPop, stack, []);
    const current = frame.value;
    if (current === null || typeof current !== "object") continue;
    if (reflectApply(mapGet, seen, [current]) !== undefined) continue;
    if (isUnsupportedRuntimeObject(current)) {
      throw boundaryError(`${frame.label} contains unsupported runtime data.`);
    }
    requirePlainDataPrototype(current, frame.label);
    reflectApply(mapSet, seen, [current, true]);
    const captured = captureEntries(current, frame.label, arrayIsArray(current));
    for (let index = 0; index < captured.entries.length; index += 1) {
      const child = captured.entries[index].value;
      if (child !== null && typeof child === "object") {
        reflectApply(arrayPush, stack, [{ value: child, label: captured.entries[index].label }]);
      }
    }
    reflectApply(objectFreeze, undefined, [current]);
  }
  return value;
}

function snapshotAiData(value, label = "AI data") {
  return freezeAiData(cloneAiData(value, label), label);
}

module.exports = {
  available: authorityAvailable && typeof objectCreate === "function",
  isUnsupportedRuntimeObject,
  cloneAiData,
  freezeAiData,
  snapshotAiData
};
