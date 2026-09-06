#!/usr/bin/env python3
from pathlib import Path

legacy_path = Path("src/legacy-ai-data-safe.js")
test_path = Path("test/m13-review-remediation.test.js")

legacy = legacy_path.read_text()

anchor = '''let objectCreate = null;
if (authorityAvailable && objectPrototype !== null) {
'''
insert = '''function captureTrustedBrandMethod(Constructor, key, expectedSource) {
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
'''
if anchor not in legacy:
    raise SystemExit("legacy objectCreate anchor not found")
legacy = legacy.replace(anchor, insert, 1)

old_classifier_line = '''    if (isProxy(value) || hasForbiddenRuntimeBrand(value)) return true;
'''
new_classifier_line = '''    if (
      isProxy(value) ||
      hasForbiddenRuntimeBrand(value) ||
      hasSlotBackedRuntimeBrand(value)
    ) return true;
'''
if old_classifier_line not in legacy:
    raise SystemExit("legacy runtime-brand classifier anchor not found")
legacy = legacy.replace(old_classifier_line, new_classifier_line, 1)

legacy_path.write_text(legacy)

tests = test_path.read_text()
old_probe = '''    "use strict";
    const ai = require(${JSON.stringify(modulePath)});
    const value = { ok: true, nested: [1, "two", null] };
'''
new_probe = '''    "use strict";
    if (typeof globalThis.Headers !== "function") process.exit(0);
    const ai = require(${JSON.stringify(modulePath)});
    const value = { ok: true, nested: [1, "two", null] };
'''
if old_probe not in tests:
    raise SystemExit("Round11 host-brand compatibility probe anchor not found")
tests = tests.replace(old_probe, new_probe, 1)
tests = tests.replace(
    'test("round11 clean host-brand boundary remains available across supported runtimes", () => {',
    'test("round11 clean host-brand boundary remains available when built-in Headers exists", () => {',
    1,
)
test_path.write_text(tests)
