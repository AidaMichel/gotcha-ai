from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

start = runtime.find("function captureFreshV8FlagSetter() {")
end_marker = "// Node 14 has no util/types module."
end = runtime.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("missing fresh V8 proxy fallback block")

replacement = r'''function inspectorClassifiesProxy(candidate) {
  // Current Node 22/24 expose the pristine util/types isProxy function as an
  // anonymous native function, which is textually indistinguishable from a
  // callable Proxy wrapper. A fresh local inspector session reports callable
  // Proxies as subtype "proxy" without executing their JS traps. If inspector
  // was preloaded, fail closed instead of trusting mutable exports.
  if (bootstrapBuiltinWasLoaded("node:inspector")) return null;

  let inspectorModule;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    return null;
  }

  const SessionConstructor = bootstrapOwnDataValue(inspectorModule, "Session");
  if (typeof SessionConstructor !== "function") return null;

  const sessionPrototype = bootstrapOwnDataValue(SessionConstructor, "prototype");
  const connect = bootstrapOwnDataValue(sessionPrototype, "connect");
  const disconnect = bootstrapOwnDataValue(sessionPrototype, "disconnect");
  const post = bootstrapOwnDataValue(sessionPrototype, "post");
  if (
    typeof connect !== "function" ||
    typeof disconnect !== "function" ||
    typeof post !== "function"
  ) return null;

  let session;
  try {
    session = new SessionConstructor();
  } catch {
    return null;
  }

  const key = "__gotchaRuntimeProxyAuthorityCandidate__";
  let existingDescriptor;
  try {
    existingDescriptor = bootstrapGetOwnPropertyDescriptor(globalThis, key);
  } catch {
    return null;
  }
  if (existingDescriptor !== undefined) return null;

  let connected = false;
  let installed = false;
  let classified = null;
  try {
    bootstrapDefineProperty(globalThis, key, {
      value: candidate,
      writable: false,
      enumerable: false,
      configurable: true
    });
    installed = true;

    pristineReflectApply(connect, session, []);
    connected = true;

    let callbackCalled = false;
    let callbackError = null;
    let callbackResult = null;
    pristineReflectApply(post, session, [
      "Runtime.evaluate",
      {
        expression: "globalThis.__gotchaRuntimeProxyAuthorityCandidate__",
        generatePreview: false,
        returnByValue: false
      },
      function gotchaInspectorCallback(error, result) {
        callbackCalled = true;
        callbackError = error;
        callbackResult = result;
      }
    ]);

    if (
      callbackCalled !== true ||
      callbackError !== null ||
      callbackResult === null ||
      typeof callbackResult !== "object" ||
      callbackResult.result === null ||
      typeof callbackResult.result !== "object"
    ) return null;

    const remote = callbackResult.result;
    if (remote.subtype === "proxy") classified = true;
    else if (remote.type === "function" && remote.subtype === undefined) classified = false;
    else classified = null;
  } catch {
    classified = null;
  } finally {
    if (connected) {
      try { pristineReflectApply(disconnect, session, []); } catch {}
    }
    if (installed) {
      try { delete globalThis[key]; } catch {}
    }
  }
  return classified;
}

let isProxy = unavailableProxyProbe;
const namedNativeIsProxy = captureNamedNativeIsProxy();
if (typeof namedNativeIsProxy === "function") {
  isProxy = function isProxy(value) {
    try {
      return pristineReflectApply(namedNativeIsProxy, undefined, [value]) === true;
    } catch {
      return true;
    }
  };
} else {
  const candidate = bootstrapOwnDataValue(utilTypesAuthority, "isProxy");
  let candidateSource = null;
  if (
    typeof candidate === "function" &&
    typeof pristineFunctionToString === "function" &&
    typeof pristineReflectApply === "function"
  ) {
    try {
      candidateSource = pristineReflectApply(pristineFunctionToString, candidate, []);
    } catch {
      candidateSource = null;
    }
  }
  if (
    candidateSource === "function () { [native code] }" &&
    inspectorClassifiesProxy(candidate) === false
  ) {
    isProxy = function isProxy(value) {
      try {
        return pristineReflectApply(candidate, undefined, [value]) === true;
      } catch {
        return true;
      }
    };
  }
}

'''
runtime = runtime[:start] + replacement + runtime[end:]
if "node:v8" in runtime or "setFlagsFromString" in runtime or "%IsJSProxy" in runtime:
    raise SystemExit("V8 proxy bootstrap path still present after inspector replacement")
runtime_path.write_text(runtime)

runtime_test_path = Path("test/runtime-authority.test.js")
runtime_test = runtime_test_path.read_text()
old = '''    // With the only local proxy probe poisoned, Round-8 deliberately marks
    // proxy identity unavailable and fails closed: unknown objects are treated
    // as Proxy-risk rather than invoking attacker-controlled probe authority.
    if (authority.isProxy({}) !== true) process.exit(22);\n'''
old_alt = '''    // The poisoned public probe is never invoked. When the fresh V8 fallback
    // is available, runtime authority safely recovers exact Proxy detection.
    if (authority.isProxy({}) !== false) process.exit(22);\n'''
new = '''    // Inspector rejects the callable Proxy without executing its traps, so the
    // poisoned public probe is never retained or invoked.
    if (authority.isProxy({}) !== true) process.exit(22);\n'''
if old in runtime_test:
    runtime_test = runtime_test.replace(old, new, 1)
elif old_alt in runtime_test:
    runtime_test = runtime_test.replace(old_alt, new, 1)
else:
    raise SystemExit("missing poisoned isProxy expectation")

if 'test("round8 preloaded inspector replacement is never executed", () => {' not in runtime_test:
    runtime_test += r'''

test("round8 preloaded inspector replacement is never executed", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const inspector = require("node:inspector");
    const original = Object.getOwnPropertyDescriptor(inspector, "Session");
    let calls = 0;
    Object.defineProperty(inspector, "Session", {
      value: function Session() { calls += 1; throw new Error("poison inspector"); },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let authority;
    try { authority = require(${JSON.stringify(modulePath)}); }
    finally { Object.defineProperty(inspector, "Session", original); }
    if (calls !== 0) process.exit(31);
    if (!authority || typeof authority.isProxy !== "function") process.exit(32);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
'''
runtime_test_path.write_text(runtime_test)

print("Replaced V8 proxy bootstrap with fresh inspector trap-free Proxy classification.")
