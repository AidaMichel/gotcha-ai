#!/usr/bin/env python3
from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
test_path = Path("test/m13-review-remediation.test.js")

runtime = runtime_path.read_text()

old_load = '''function loadModuleUtilTypesAuthority() {
  try {
    return require("node:util/types");
  } catch {}
  try {
    return require("util/types");
  } catch {
    return null;
  }
}

let utilTypesAuthority = loadModuleUtilTypesAuthority();
'''
new_load = '''function loadModuleUtilTypesAuthority() {
  try {
    return require("node:util/types");
  } catch {}
  try {
    return require("util/types");
  } catch {
    return null;
  }
}

function loadMutableBuiltinUtilModule() {
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
// Capture the loader-provided util module object once, before caller code can
// mutate it after package load. The module-local CommonJS loader is part of the
// documented bootstrap root; mutable properties on the returned module are not.
const mutableBuiltinUtilModule = loadMutableBuiltinUtilModule();
const capturedMutableBuiltinUtilTypes = bootstrapOwnDataValue(
  mutableBuiltinUtilModule,
  "types"
);
'''
if old_load not in runtime:
    raise SystemExit("loadModuleUtilTypesAuthority anchor not found")
runtime = runtime.replace(old_load, new_load, 1)

start = runtime.find('function inspectorHasNodeInternalFunctionOrigin(')
end = runtime.find('// Node 14 has no util/types module.', start)
if start < 0 or end < 0:
    raise SystemExit("Round10 builtin-loader block anchors not found")
replacement = '''function canLoadMutableBuiltinGraph() {
  // Lazy M8/M11 graphs are allowed only while node:util.types is still the
  // exact data export captured during runtime-authority initialization. This
  // avoids recapturing process.getBuiltinModule, process version metadata, or
  // inherited Inspector/EventEmitter methods after caller code regains control.
  if (
    mutableBuiltinUtilModule === null ||
    typeof mutableBuiltinUtilModule !== "object" ||
    capturedMutableBuiltinUtilTypes === null ||
    typeof capturedMutableBuiltinUtilTypes !== "object"
  ) return false;

  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [mutableBuiltinUtilModule, "types"]
    );
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      descriptor.value === capturedMutableBuiltinUtilTypes &&
      isProxy(capturedMutableBuiltinUtilTypes) !== true
    );
  } catch {
    return false;
  }
}

'''
runtime = runtime[:start] + replacement + runtime[end:]

old_legacy = '''// Node 14 has no util/types module. Only after trap-free proxy authority exists
// may we consult its legacy util binding for optional native brand probes.
if (utilTypesAuthority === null) {
  try {
    const binding = bootstrapOwnDataValue(process, "binding");
    if (typeof binding === "function" && isProxy(binding) !== true) {
      const legacyTypes = pristineReflectApply(binding, process, ["util"]);
      if (
        legacyTypes !== null &&
        typeof legacyTypes === "object" &&
        isProxy(legacyTypes) !== true
      ) {
        utilTypesAuthority = legacyTypes;
      }
    }
  } catch {
    utilTypesAuthority = null;
  }
}
'''
new_legacy = '''// Node 14 has no util/types module. Fall back only to the descriptor-captured
// node:util.types object from the loader-provided util module. Inspector Proxy
// classification is available by this point, so a Proxy-backed replacement is
// rejected before any of its property traps can become retained authority.
if (
  utilTypesAuthority === null &&
  capturedMutableBuiltinUtilTypes !== null &&
  typeof capturedMutableBuiltinUtilTypes === "object" &&
  isProxy(capturedMutableBuiltinUtilTypes) !== true
) {
  utilTypesAuthority = capturedMutableBuiltinUtilTypes;
}
'''
if old_legacy not in runtime:
    raise SystemExit("legacy process.binding fallback anchor not found")
runtime = runtime.replace(old_legacy, new_legacy, 1)

for forbidden in (
    "inspectorHasNodeInternalFunctionOrigin",
    "nodeMajorVersion",
    "getAuthenticatedBuiltinModule",
    "authenticatedGetBuiltinModule",
    "builtinLoaderSource",
    'bootstrapOwnDataValue(process,',
    'pristineReflectApply(binding, process,',
):
    if forbidden in runtime:
        raise SystemExit(f"forbidden Round10 authority path remains: {forbidden}")

runtime_path.write_text(runtime)

tests = test_path.read_text()
marker = "// ROUND11_CODEX_AUTHORITY_REGRESSIONS"
if marker not in tests:
    tests += r'''

// ROUND11_CODEX_AUTHORITY_REGRESSIONS

test("round11 lazy builtin preflight never invokes a post-load EventEmitter.on replacement", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const events = require("node:events");
    const authority = require(${JSON.stringify(modulePath)});
    const descriptor = Object.getOwnPropertyDescriptor(events.EventEmitter.prototype, "on");
    let calls = 0;
    function poisonOn(type, listener) {
      calls += 1;
      return Reflect.apply(descriptor.value, this, [type, listener]);
    }
    Object.defineProperty(events.EventEmitter.prototype, "on", {
      ...descriptor,
      value: poisonOn
    });
    let allowed = false;
    try { allowed = authority.canLoadMutableBuiltinGraph(); }
    finally { Object.defineProperty(events.EventEmitter.prototype, "on", descriptor); }
    if (calls !== 0) process.exitCode = 141;
    if (allowed !== true) process.exitCode = 142;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round11 runtime bootstrap never reads accessor-backed global process or Proxy-backed process versions", () => {
  const packageAuthorityPath = path.join(repoRoot, "src", "package-authority.js");
  const runtimeAuthorityPath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const nativeProcess = process;
    require(${JSON.stringify(packageAuthorityPath)});
    const globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "process");
    const versionsDescriptor = Object.getOwnPropertyDescriptor(nativeProcess, "versions");
    let processGetterCalls = 0;
    let versionsDescriptorTraps = 0;
    if (versionsDescriptor && versionsDescriptor.configurable === true) {
      Object.defineProperty(nativeProcess, "versions", {
        ...versionsDescriptor,
        value: new Proxy(versionsDescriptor.value, {
          getOwnPropertyDescriptor(target, key) {
            versionsDescriptorTraps += 1;
            return Reflect.getOwnPropertyDescriptor(target, key);
          }
        })
      });
    }
    Object.defineProperty(globalThis, "process", {
      configurable: true,
      enumerable: globalDescriptor.enumerable,
      get() {
        processGetterCalls += 1;
        return nativeProcess;
      }
    });
    try { require(${JSON.stringify(runtimeAuthorityPath)}); }
    catch (error) { console.error(error); process.exitCode = 143; }
    Object.defineProperty(globalThis, "process", globalDescriptor);
    if (versionsDescriptor && versionsDescriptor.configurable === true) {
      Object.defineProperty(nativeProcess, "versions", versionsDescriptor);
    }
    if (processGetterCalls !== 0) process.exitCode = 144;
    if (versionsDescriptorTraps !== 0) process.exitCode = 145;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("round11 lazy builtin preflight works when process.getBuiltinModule is absent", () => {
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

test_path.write_text(tests)
