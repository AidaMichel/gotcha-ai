#!/usr/bin/env python3
from pathlib import Path

legacy_path = Path("src/legacy-ai-data-safe.js")
legacy = legacy_path.read_text()

old = '''function requirePlainDataPrototype(value, label) {
  const prototype = reflectApply(getPrototypeOf, undefined, [value]);
  if (prototype !== null && isProxy(prototype)) {
    throw boundaryError(`${label} must not use a Proxy prototype.`);
  }
  if (arrayIsArray(value)) {
    if (prototype !== arrayPrototype) {
      throw boundaryError(`${label} must be a plain array.`);
    }
  } else if (prototype !== objectPrototype && prototype !== null) {
    throw boundaryError(`${label} must be a plain object.`);
  }
  return prototype;
}
'''
new = '''function captureLocalConstructorSource(prototype, expectedName) {
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
'''
if old not in legacy:
    raise SystemExit("legacy local-only plain prototype anchor not found")
legacy = legacy.replace(old, new, 1)
legacy_path.write_text(legacy)
