#!/usr/bin/env python3
from pathlib import Path

legacy_path = Path("src/legacy-ai-data-safe.js")
test_path = Path("test/m13-review-remediation.test.js")

legacy = legacy_path.read_text()

old_classifier = '''function isUnsupportedRuntimeObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (!authorityAvailable) return true;
  try {
    if (isProxy(value) || hasForbiddenRuntimeBrand(value)) return true;
    const prototype = reflectApply(getPrototypeOf, undefined, [value]);
    if (prototype !== null && isProxy(prototype)) return true;
    if (arrayIsArray(value)) return prototype !== arrayPrototype;
    return prototype !== objectPrototype && prototype !== null;
  } catch {
    return true;
  }
}
'''
new_classifier = '''function isUnsupportedRuntimeObject(value) {
  if (value === null || typeof value !== "object") return false;
  if (!authorityAvailable) return true;
  try {
    if (isProxy(value) || hasForbiddenRuntimeBrand(value)) return true;
    const prototype = reflectApply(getPrototypeOf, undefined, [value]);
    return prototype !== null && isProxy(prototype);
  } catch {
    return true;
  }
}

function requirePlainDataPrototype(value, label) {
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
if old_classifier not in legacy:
    raise SystemExit("legacy classifier anchor not found")
legacy = legacy.replace(old_classifier, new_classifier, 1)

old_primitive = '''  if (typeof value !== "object") {
    throw boundaryError(`${label} contains unsupported data.`);
  }
'''
new_primitive = '''  if (typeof value === "function") {
    throw boundaryError(`${label} must not contain functions.`);
  }
  if (typeof value !== "object") {
    throw boundaryError(`${label} contains unsupported data.`);
  }
'''
if old_primitive not in legacy:
    raise SystemExit("legacy primitive anchor not found")
legacy = legacy.replace(old_primitive, new_primitive, 1)

old_array_descriptor = '''      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        "get" in descriptor ||
        "set" in descriptor ||
        descriptor.enumerable !== true
      ) throw boundaryError(`${label}[${numeric}] must use an enumerable data property.`);
'''
new_array_descriptor = '''      if (descriptor === undefined) {
        throw boundaryError(`${label}[${numeric}] is missing.`);
      }
      if ("get" in descriptor || "set" in descriptor) {
        throw boundaryError(`${label}[${numeric}] must not contain accessor properties.`);
      }
      if (!("value" in descriptor) || descriptor.enumerable !== true) {
        throw boundaryError(`${label}[${numeric}] must use an enumerable data property.`);
      }
'''
if old_array_descriptor not in legacy:
    raise SystemExit("legacy array descriptor anchor not found")
legacy = legacy.replace(old_array_descriptor, new_array_descriptor, 1)

old_record_descriptor = '''    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      "get" in descriptor ||
      "set" in descriptor ||
      descriptor.enumerable !== true
    ) throw boundaryError(`${label}.${key} must use an enumerable data property.`);
'''
new_record_descriptor = '''    if (descriptor === undefined) {
      throw boundaryError(`${label}.${key} is missing.`);
    }
    if ("get" in descriptor || "set" in descriptor) {
      throw boundaryError(`${label}.${key} must not contain accessor properties.`);
    }
    if (!("value" in descriptor) || descriptor.enumerable !== true) {
      throw boundaryError(`${label}.${key} must use an enumerable data property.`);
    }
'''
if old_record_descriptor not in legacy:
    raise SystemExit("legacy record descriptor anchor not found")
legacy = legacy.replace(old_record_descriptor, new_record_descriptor, 1)

old_prepare = '''  if (isUnsupportedRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  if (activeContains(active, value)) {
'''
new_prepare = '''  if (isUnsupportedRuntimeObject(value)) {
    throw boundaryError(`${label} contains unsupported runtime data.`);
  }
  requirePlainDataPrototype(value, label);
  if (activeContains(active, value)) {
'''
if old_prepare not in legacy:
    raise SystemExit("legacy prepare prototype anchor not found")
legacy = legacy.replace(old_prepare, new_prepare, 1)

old_freeze = '''    if (isUnsupportedRuntimeObject(current)) {
      throw boundaryError(`${frame.label} contains unsupported runtime data.`);
    }
    reflectApply(mapSet, seen, [current, true]);
'''
new_freeze = '''    if (isUnsupportedRuntimeObject(current)) {
      throw boundaryError(`${frame.label} contains unsupported runtime data.`);
    }
    requirePlainDataPrototype(current, frame.label);
    reflectApply(mapSet, seen, [current, true]);
'''
if old_freeze not in legacy:
    raise SystemExit("legacy freeze prototype anchor not found")
legacy = legacy.replace(old_freeze, new_freeze, 1)

legacy_path.write_text(legacy)

tests = test_path.read_text()

old_contract = 'contract: { version: 1, status: "confirmed", task: "t", rules: [] },'
new_contract = '''contract: {
        version: 1,
        status: "confirmed",
        task: "t",
        rules: [{
          id: "r1",
          statement: "ok must be true.",
          kind: "required",
          severity: "major"
        }]
      },'''
count = tests.count(old_contract)
if count != 2:
    raise SystemExit(f"expected 2 invalid Round11 contract fixtures, found {count}")
tests = tests.replace(old_contract, new_contract, 2)

test_path.write_text(tests)
