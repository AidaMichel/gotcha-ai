#!/usr/bin/env python3
from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
provider_path = Path("src/provider-adapter.js")
m13_provider_path = Path("src/provider-adapter-m13.js")
attacks_path = Path("src/contract-attacks-core.js")
legacy_path = Path("src/legacy-ai-data-safe.js")
test_path = Path("test/m13-review-remediation.test.js")

runtime = runtime_path.read_text()
old_runtime_load = '''function loadMutableBuiltinUtilModule() {
  try {
    return require("node:util");
  } catch {}
  try {
    return require("util");
  } catch {
    return null;
  }
}

let utilTypesAuthority = loadModuleUtilTypesAuthority();
const modernMutableBuiltinGraph = detectModernMutableBuiltinGraph();
// Node 20+ may synchronize mutable node:util exports while loading later
// builtin graphs. Capture its loader-provided module object only on that host
// generation. Older Node releases deliberately avoid this require because Node
// 18 can consult poisoned util.inspect/util.types while resolving node:util.
const mutableBuiltinUtilModule = modernMutableBuiltinGraph === true
  ? loadMutableBuiltinUtilModule()
  : null;
const capturedMutableBuiltinUtilTypes = modernMutableBuiltinGraph === true
  ? bootstrapOwnDataValue(mutableBuiltinUtilModule, "types")
  : null;
'''
new_runtime_load = '''let utilTypesAuthority = loadModuleUtilTypesAuthority();
const modernMutableBuiltinGraph = detectModernMutableBuiltinGraph();
'''
if old_runtime_load not in runtime:
    raise SystemExit("Round11 mutable util preload anchor not found")
runtime = runtime.replace(old_runtime_load, new_runtime_load, 1)

start = runtime.find("function canLoadMutableBuiltinGraph() {")
end = runtime.find("\n\n// Node 14 has no util/types module.", start)
if start < 0 or end < 0:
    raise SystemExit("Round11 canLoadMutableBuiltinGraph anchors not found")
runtime = runtime[:start] + '''function canLoadMutableBuiltinGraph() {
  // The Node 20+ CJS builtin synchronization path can execute caller-mutated
  // node:util accessors before a consumer can descriptor-check them. Never
  // authorize that graph directly. M8/M11 consumers use the trap-free safe
  // legacy data path instead. Node 14/16/18 keep the historical graph because
  // that synchronization hazard is absent there.
  if (modernMutableBuiltinGraph === false) return true;
  return false;
}''' + runtime[end:]

for forbidden in (
    "loadMutableBuiltinUtilModule",
    "mutableBuiltinUtilModule",
    "capturedMutableBuiltinUtilTypes",
    'require("node:util")',
    'require("util")',
):
    if forbidden in runtime:
        raise SystemExit(f"unsafe mutable util preload remains: {forbidden}")
runtime_path.write_text(runtime)

legacy_path.write_text(r'''"use strict";

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
    if (isProxy(value) || hasForbiddenRuntimeBrand(value)) return true;
    const prototype = reflectApply(getPrototypeOf, undefined, [value]);
    if (prototype !== null && isProxy(prototype)) return true;
    if (arrayIsArray(value)) return prototype !== arrayPrototype;
    return prototype !== objectPrototype && prototype !== null;
  } catch {
    return true;
  }
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
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        "get" in descriptor ||
        "set" in descriptor ||
        descriptor.enumerable !== true
      ) throw boundaryError(`${label}[${numeric}] must use an enumerable data property.`);
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
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      "get" in descriptor ||
      "set" in descriptor ||
      descriptor.enumerable !== true
    ) throw boundaryError(`${label}.${key} must use an enumerable data property.`);
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
''')

provider = provider_path.read_text()
old_provider = '''const isUnsupportedRuntimeObject =
  runtimeAuthority.consumerPrimordialsAvailable === true
    ? require("./ai-data-core").isUnsupportedRuntimeObject
    : function unavailableRuntimeObjectClassifier() { return true; };
'''
new_provider = '''const legacyAiData = require("./legacy-ai-data-safe");
const isUnsupportedRuntimeObject =
  legacyAiData.available === true
    ? legacyAiData.isUnsupportedRuntimeObject
    : function unavailableRuntimeObjectClassifier() { return true; };
'''
if old_provider not in provider:
    raise SystemExit("provider ai-data-core dependency anchor not found")
provider = provider.replace(old_provider, new_provider, 1)
provider_path.write_text(provider)

m13_provider = m13_provider_path.read_text()
old_m13_gate = '''  if (
    !promiseAuthorityAvailable ||
    !legacyTypeErrorAuthorityAvailable ||
    typeof runtimeAuthority.canLoadMutableBuiltinGraph !== "function" ||
    runtimeAuthority.canLoadMutableBuiltinGraph() !== true
  ) {
    return null;
  }
'''
new_m13_gate = '''  if (
    !promiseAuthorityAvailable ||
    !legacyTypeErrorAuthorityAvailable
  ) {
    return null;
  }
'''
if old_m13_gate not in m13_provider:
    raise SystemExit("M13 legacy adapter gate anchor not found")
m13_provider = m13_provider.replace(old_m13_gate, new_m13_gate, 1)
m13_provider_path.write_text(m13_provider)

attacks = attacks_path.read_text()
old_attacks = '''  if (
    !m8DependencyAuthorityAvailable ||
    typeof runtimeAuthority.canLoadMutableBuiltinGraph !== "function" ||
    runtimeAuthority.canLoadMutableBuiltinGraph() !== true
  ) return;

  try {
    ({ attack } = require("./engine"));
    ({ cloneAiData, snapshotAiData } = require("./ai-data"));
'''
new_attacks = '''  if (!m8DependencyAuthorityAvailable) return;

  try {
    ({ attack } = require("./engine"));
    ({ cloneAiData, snapshotAiData } = require("./legacy-ai-data-safe"));
'''
if old_attacks not in attacks:
    raise SystemExit("M8 dependency gate anchor not found")
attacks = attacks.replace(old_attacks, new_attacks, 1)
attacks_path.write_text(attacks)

tests = test_path.read_text()
old_missing = '''test("round11 lazy builtin preflight works when process.getBuiltinModule is absent", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const descriptor = Object.getOwnPropertyDescriptor(process, "getBuiltinModule");
    if (descriptor && descriptor.configurable === true) {
      delete process.getBuiltinModule;
    } else if (descriptor && descriptor.writable === true) {
      process.getBuiltinModule = undefined;
    }
    const authority = require(${JSON.stringify(modulePath)});
    const allowed = authority.canLoadMutableBuiltinGraph();
    if (descriptor) Object.defineProperty(process, "getBuiltinModule", descriptor);
    if (allowed !== true) process.exitCode = 146;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
new_missing = '''test("round11 safe legacy path works when process.getBuiltinModule is absent", () => {
  const rootPath = path.join(repoRoot, "src");
  const code = `
    "use strict";
    const descriptor = Object.getOwnPropertyDescriptor(process, "getBuiltinModule");
    if (descriptor && descriptor.configurable === true) {
      delete process.getBuiltinModule;
    } else if (descriptor && descriptor.writable === true) {
      process.getBuiltinModule = undefined;
    }
    const api = require(${JSON.stringify(rootPath)});
    const transport = () => ({ output: { version: 1, task: "t", rules: [] } });
    const quality = api.createStructuredProviderAdapter({ transport, model: "m", mode: "quality-contract" });
    const attacks = api.createStructuredProviderAdapter({ transport, model: "m", mode: "contract-attacks" });
    if (typeof quality !== "function" || typeof attacks !== "function") process.exitCode = 146;
    Promise.resolve(api.runContractAttacks({
      contract: { version: 1, status: "confirmed", task: "t", rules: [] },
      input: { request: "x" },
      expectedOutput: { ok: true },
      evaluator(output) { return output.ok === true; },
      generator() { return { version: 1, task: "t", attacks: [] }; }
    })).then(
      (result) => { if (!result || result.baselinePassed !== true) process.exitCode = 150; },
      (error) => { console.error(error); process.exitCode = 151; }
    ).finally(() => {
      if (descriptor) Object.defineProperty(process, "getBuiltinModule", descriptor);
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''
if old_missing not in tests:
    raise SystemExit("Round11 missing-getBuiltin regression anchor not found")
tests = tests.replace(old_missing, new_missing, 1)

old_event_expect = '    if (allowed !== true) process.exitCode = 142;\n'
if old_event_expect in tests:
    tests = tests.replace(
      old_event_expect,
      '    if (typeof allowed !== "boolean") process.exitCode = 142;\n',
      1,
    )

marker = "// ROUND11_SAFE_LEGACY_PATH_REGRESSIONS"
if marker not in tests:
    tests += r'''

// ROUND11_SAFE_LEGACY_PATH_REGRESSIONS

test("round11 safe legacy path never loads dangerous builtin helpers under util poison", () => {
  const rootPath = path.join(repoRoot, "src");
  const code = `
    "use strict";
    const util = require("node:util");
    const typesDescriptor = Object.getOwnPropertyDescriptor(util, "types");
    const inspectDescriptor = Object.getOwnPropertyDescriptor(util, "inspect");
    let typesCalls = 0;
    let inspectCalls = 0;
    Object.defineProperty(util, "types", {
      configurable: true,
      enumerable: typesDescriptor.enumerable,
      get() { typesCalls += 1; throw new Error("poison util.types"); }
    });
    if (inspectDescriptor && inspectDescriptor.configurable) {
      Object.defineProperty(util, "inspect", {
        configurable: true,
        enumerable: inspectDescriptor.enumerable,
        get() { inspectCalls += 1; throw new Error("poison util.inspect"); }
      });
    }
    const api = require(${JSON.stringify(rootPath)});
    const transport = () => ({ output: { version: 1, task: "t", rules: [] } });
    const a = api.createStructuredProviderAdapter({ transport, model: "m", mode: "quality-contract" });
    const b = api.createStructuredProviderAdapter({ transport, model: "m", mode: "contract-attacks" });
    if (typeof a !== "function" || typeof b !== "function") process.exitCode = 152;
    Promise.resolve(api.runContractAttacks({
      contract: { version: 1, status: "confirmed", task: "t", rules: [] },
      input: { request: "x" },
      expectedOutput: { ok: true },
      evaluator(output) { return output.ok === true; },
      generator() { return { version: 1, task: "t", attacks: [] }; }
    })).then(
      (result) => { if (!result || result.baselinePassed !== true) process.exitCode = 153; },
      (error) => { console.error(error); process.exitCode = 154; }
    ).finally(() => {
      Object.defineProperty(util, "types", typesDescriptor);
      if (inspectDescriptor && inspectDescriptor.configurable) Object.defineProperty(util, "inspect", inspectDescriptor);
      if (typesCalls !== 0) process.exitCode = 155;
      if (inspectCalls !== 0) process.exitCode = 156;
    });
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''

test_path.write_text(tests)
