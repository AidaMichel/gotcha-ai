from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

marker = '''let isProxy = unavailableProxyProbe;
const namedNativeIsProxy = captureNamedNativeIsProxy();
if (typeof namedNativeIsProxy === "function") {
  isProxy = function isProxy(value) {
    try {
      return pristineReflectApply(namedNativeIsProxy, undefined, [value]) === true;
    } catch {
      return true;
    }
  };
}
'''
replacement = '''function captureFreshV8FlagSetter() {
  // Source text is forgeable. The V8 flag setter is authoritative only when
  // Gotcha is the first loader of node:v8, so userland has had no opportunity
  // to replace its export. A preloaded V8 module always fails closed.
  if (bootstrapBuiltinWasLoaded("node:v8")) return null;

  // Node 22 loads node:buffer while evaluating node:v8. Requiring an already
  // loaded builtin returns the exports object without reading Buffer; inspect
  // the descriptor before V8 evaluation so an accessor-backed Buffer can never
  // execute as a bootstrap side effect.
  let bufferModule;
  try {
    bufferModule = require("node:buffer");
  } catch {
    return null;
  }
  const bufferDescriptor = bootstrapOwnDataValue === null
    ? null
    : (() => {
        try {
          return bootstrapGetOwnPropertyDescriptor(bufferModule, "Buffer");
        } catch {
          return null;
        }
      })();
  if (
    bufferDescriptor === null ||
    bufferDescriptor === undefined ||
    "get" in bufferDescriptor ||
    "set" in bufferDescriptor ||
    typeof bufferDescriptor.value !== "function"
  ) return null;

  let v8Module;
  try {
    v8Module = require("node:v8");
  } catch {
    return null;
  }
  try {
    const descriptor = bootstrapGetOwnPropertyDescriptor(
      v8Module,
      "setFlagsFromString"
    );
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      typeof descriptor.value === "function"
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

function compileFreshProxyProbe() {
  const setFlagsFromString = captureFreshV8FlagSetter();
  if (
    typeof setFlagsFromString !== "function" ||
    typeof pristineFunctionConstructor !== "function" ||
    typeof pristineReflectApply !== "function"
  ) return null;

  let compiled = null;
  try {
    pristineReflectApply(
      setFlagsFromString,
      undefined,
      ["--allow_natives_syntax"]
    );
    compiled = pristineReflectApply(
      pristineFunctionConstructor,
      undefined,
      ["value", "return %IsJSProxy(value);"]
    );
  } catch {
    compiled = null;
  } finally {
    try {
      pristineReflectApply(
        setFlagsFromString,
        undefined,
        ["--no-allow-natives-syntax"]
      );
    } catch {}
  }
  return typeof compiled === "function" ? compiled : null;
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
  const freshProxyProbe = compileFreshProxyProbe();
  if (typeof freshProxyProbe === "function") {
    isProxy = function isProxy(value) {
      try {
        return pristineReflectApply(freshProxyProbe, undefined, [value]) === true;
      } catch {
        return true;
      }
    };
  }
}
'''
if marker not in runtime:
    raise SystemExit("missing Round-8 isProxy authority block")
runtime = runtime.replace(marker, replacement, 1)

runtime_path.write_text(runtime)
print("Added fresh-only V8 Proxy authority fallback with descriptor-safe Buffer bootstrap.")
