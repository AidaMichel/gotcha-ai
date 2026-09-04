from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

old = '''const pristineDefineProperty = hasFreshVmAuthority
  ? runInNewContext("Object.defineProperty")
  : null;
const pristineReflectDeleteProperty = hasFreshVmAuthority
  ? runInNewContext("Reflect.deleteProperty")
  : null;
'''
new = '''function captureBootstrapNamedNativeDataFunction(object, key, expectedSource) {
  const candidate = bootstrapOwnDataValue(object, key);
  if (
    typeof candidate !== "function" ||
    typeof pristineFunctionToString !== "function" ||
    typeof pristineReflectApply !== "function"
  ) return null;
  try {
    const source = pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    );
    return source === expectedSource ? candidate : null;
  } catch {
    return null;
  }
}

function captureBootstrapDefineProperty() {
  let objectPrototype;
  try {
    objectPrototype = pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [{}]
    );
  } catch {
    return null;
  }
  const objectConstructor = bootstrapOwnDataValue(
    objectPrototype,
    "constructor"
  );
  return captureBootstrapNamedNativeDataFunction(
    objectConstructor,
    "defineProperty",
    "function defineProperty() { [native code] }"
  );
}

function captureBootstrapReflectDeleteProperty() {
  const reflectObject = bootstrapOwnDataValue(globalThis, "Reflect");
  return captureBootstrapNamedNativeDataFunction(
    reflectObject,
    "deleteProperty",
    "function deleteProperty() { [native code] }"
  );
}

// A benign caller may have loaded node:vm before Gotcha. In that case we still
// need mutation primitives solely to expose the anonymous util/types candidate
// to a fresh inspector session for trap-free Proxy classification. Never trust
// ambient replacements: accept only exact named native primordials. Callable
// Proxy wrappers stringify anonymously and therefore fail this capture closed.
const pristineDefineProperty = hasFreshVmAuthority
  ? runInNewContext("Object.defineProperty")
  : captureBootstrapDefineProperty();
const pristineReflectDeleteProperty = hasFreshVmAuthority
  ? runInNewContext("Reflect.deleteProperty")
  : captureBootstrapReflectDeleteProperty();
'''
if old not in runtime:
    raise SystemExit("missing inspector mutation primitive block")
runtime = runtime.replace(old, new, 1)
runtime_path.write_text(runtime)

runtime_test_path = Path("test/runtime-authority.test.js")
runtime_test = runtime_test_path.read_text()
marker = 'test("round8 benign util and vm preload preserves runtime authority", () => {'
if marker not in runtime_test:
    runtime_test += r'''

test("round8 benign util and vm preload preserves runtime authority", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    require("node:util");
    require("node:vm");
    const authority = require(${JSON.stringify(modulePath)});
    let trapCalls = 0;
    const proxy = new Proxy({}, {
      get() { trapCalls += 1; return undefined; },
      getPrototypeOf() { trapCalls += 1; return null; },
      ownKeys() { trapCalls += 1; return []; }
    });
    if (authority.isProxy({}) !== false) process.exit(41);
    if (authority.isProxy(proxy) !== true) process.exit(42);
    if (trapCalls !== 0) process.exit(43);
    if (authority.promiseAuthorityAvailable !== true) process.exit(44);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
'''
runtime_test_path.write_text(runtime_test)

print("Recovered benign preloaded-vm Proxy authority through authenticated bootstrap primordials.")
