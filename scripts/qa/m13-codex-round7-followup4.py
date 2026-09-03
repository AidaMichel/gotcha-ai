from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

runtime_path = ROOT / "src" / "runtime-authority.js"
text = runtime_path.read_text()

start_marker = "let isProxy = unavailableProxyProbe;\n"
end_marker = "const utilTypesAuthority = loadUtilTypesAuthority();\n"
start = text.find(start_marker)
if start < 0:
    raise SystemExit("missing followup4 start anchor: isProxy bootstrap")
end_start = text.find(end_marker, start)
if end_start < 0:
    raise SystemExit("missing followup4 end anchor: util types authority")
end = end_start + len(end_marker)

replacement = r'''function loadModuleUtilTypesAuthority() {
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

function captureNamedNativeIsProxy() {
  if (
    utilTypesAuthority === null ||
    typeof utilTypesAuthority !== "object"
  ) return null;
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilTypesAuthority, "isProxy"]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    const source = typeof candidate === "function"
      ? pristineReflectApply(pristineFunctionToString, candidate, [])
      : null;
    if (
      descriptor !== undefined &&
      descriptor.writable === true &&
      descriptor.enumerable === true &&
      descriptor.configurable === true &&
      typeof candidate === "function" &&
      source === "function isProxy() { [native code] }"
    ) {
      return candidate;
    }
  } catch {}
  return null;
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
  try {
    const setFlagsFromString = captureSetFlagsFromString();
    if (typeof setFlagsFromString === "function") {
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
      } finally {
        try {
          pristineReflectApply(
            setFlagsFromString,
            undefined,
            ["--no-allow-natives-syntax"]
          );
        } catch {}
      }
      if (typeof compiled === "function") {
        isProxy = function isProxy(value) {
          try {
            return pristineReflectApply(compiled, undefined, [value]) === true;
          } catch {
            return true;
          }
        };
      }
    }
  } catch {
    isProxy = unavailableProxyProbe;
  }
}

// Node 14 has no util/types module. Only after trap-free proxy authority exists
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

text = text[:start] + replacement + text[end:]

if text.count("function loadUtilTypesAuthority()") != 0:
    raise SystemExit("stale legacy util types loader remains")
if text.count("function captureNamedNativeIsProxy()") != 1:
    raise SystemExit("named native isProxy bootstrap was not installed exactly once")
if text.count("let isProxy = unavailableProxyProbe;") != 1:
    raise SystemExit("unexpected isProxy bootstrap count")

runtime_path.write_text(text)
print("round7 followup4 applied")
