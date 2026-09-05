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

function detectModernMutableBuiltinGraph() {
  // RegExp Unicode-set (`v`) syntax is an engine capability present from the
  // first supported Node 20 release and absent from Node 14/16/18. Authenticate
  // the current-realm native RegExp constructor before invoking it so caller
  // replacement cannot turn this host-semantic probe into executable authority.
  const candidate = bootstrapOwnDataValue(globalThis, "RegExp");
  if (
    typeof candidate !== "function" ||
    bootstrapFunctionSource(candidate) !==
      "function RegExp() { [native code] }"
  ) return null;
  try {
    if (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    pristineReflectApply(candidate, undefined, ["", "v"]);
    return true;
  } catch {
    return false;
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
if old_load not in runtime:
    raise SystemExit("loadModuleUtilTypesAuthority anchor not found")
runtime = runtime.replace(old_load, new_load, 1)

start = runtime.find('function inspectorHasNodeInternalFunctionOrigin(')
end = runtime.find('// Node 14 has no util/types module.', start)
if start < 0 or end < 0:
    raise SystemExit("Round10 builtin-loader block anchors not found")
replacement = '''function canLoadMutableBuiltinGraph() {
  // Node 14/16/18 do not use the Node 20+ mutable builtin synchronization path
  // and must not require node:util merely to prove that absence. If the native
  // RegExp era probe itself was unavailable, fail closed rather than guessing.
  if (modernMutableBuiltinGraph === false) return true;
  if (modernMutableBuiltinGraph !== true) return false;

  // On Node 20+, lazy M8/M11 graphs are allowed only while node:util.types is
  // still the exact data export captured during runtime-authority initialization.
  // No process metadata, getBuiltinModule, or inherited Inspector/EventEmitter
  // method is consulted after caller code regains control.
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
new_legacy = '''// Node 14 has no standalone util/types builtin. Do not recover it through
// process.binding: process capabilities are explicitly outside the bootstrap
// trust root. Runtime-brand authority therefore remains unavailable/fail-closed
// on that legacy host instead of invoking mutable process state.
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

test("round11 RegExp era probe rejects pre-load replacement without execution", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "RegExp");
    let calls = 0;
    const wrapped = new Proxy(descriptor.value, {
      apply(target, receiver, args) {
        calls += 1;
        return Reflect.apply(target, receiver, args);
      },
      construct(target, args, newTarget) {
        calls += 1;
        return Reflect.construct(target, args, newTarget);
      }
    });
    Object.defineProperty(globalThis, "RegExp", { ...descriptor, value: wrapped });
    const authority = require(${JSON.stringify(modulePath)});
    Object.defineProperty(globalThis, "RegExp", descriptor);
    if (calls !== 0) process.exitCode = 147;
    if (authority.canLoadMutableBuiltinGraph() !== false) process.exitCode = 148;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''

test_path.write_text(tests)
