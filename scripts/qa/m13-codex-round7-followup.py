from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing followup anchor: {label}")
    path.write_text(text.replace(old, new, 1))


package_path = ROOT / "src" / "package-authority.js"
replace_once(
    package_path,
    'const TypeErrorConstructor = dataValue(globalThis, "TypeError");\n',
    'const TypeErrorConstructor = dataValue(globalThis, "TypeError");\nconst BufferConstructor = dataValue(globalThis, "Buffer");\n',
    "global Buffer capture",
)
replace_once(
    package_path,
    '  TypeErrorConstructor\n});\n',
    '  TypeErrorConstructor,\n  BufferConstructor\n});\n',
    "global Buffer export",
)

runtime_path = ROOT / "src" / "runtime-authority.js"
old_bootstrap = '''const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;

function bootstrapDataValue(modulePath, key) {
  if (typeof bootstrapGetOwnPropertyDescriptor !== "function") return null;
  try {
    const moduleObject = require(modulePath);
    const descriptor = bootstrapGetOwnPropertyDescriptor(moduleObject, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

const BufferConstructor = bootstrapDataValue("node:buffer", "Buffer");
const runInNewContext = bootstrapDataValue("node:vm", "runInNewContext");

if (
  typeof BufferConstructor !== "function" ||
  typeof runInNewContext !== "function"
) {
  null.gotchaRuntimeBootstrapAuthority;
}
'''
new_bootstrap = '''const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;

function bootstrapOwnDataValue(object, key) {
  if (
    typeof bootstrapGetOwnPropertyDescriptor !== "function" ||
    object === null ||
    (typeof object !== "object" && typeof object !== "function")
  ) return null;
  try {
    const descriptor = bootstrapGetOwnPropertyDescriptor(object, key);
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
  } catch {
    return null;
  }
}

function bootstrapBuiltinWasLoaded(modulePath) {
  const list = bootstrapOwnDataValue(process, "moduleLoadList");
  if (list === null || typeof list !== "object") return true;
  const bareName = modulePath.slice(0, 5) === "node:"
    ? modulePath.slice(5)
    : modulePath;
  try {
    for (let index = 0; index < list.length; index += 1) {
      if (list[index] === "NativeModule " + bareName) return true;
    }
  } catch {
    return true;
  }
  return false;
}

function bootstrapBuiltinModule(modulePath) {
  const getBuiltinModule = bootstrapOwnDataValue(process, "getBuiltinModule");
  if (typeof getBuiltinModule === "function") {
    try {
      return getBuiltinModule(modulePath);
    } catch {
      return null;
    }
  }

  // Node 14/16/18 have no process.getBuiltinModule(). If a security-sensitive
  // builtin was already loaded, re-require can synchronize mutated exports and
  // execute accessor traps before descriptor inspection. Fail closed instead.
  if (bootstrapBuiltinWasLoaded(modulePath)) return null;
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

const BufferConstructor = packageAuthority.BufferConstructor;
const vmModule = bootstrapBuiltinModule("node:vm");
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");

if (
  typeof BufferConstructor !== "function" ||
  typeof runInNewContext !== "function"
) {
  null.gotchaRuntimeBootstrapAuthority;
}
'''
replace_once(runtime_path, old_bootstrap, new_bootstrap, "safe builtin bootstrap loader")
replace_once(
    runtime_path,
    '    const v8Module = require("node:v8");\n',
    '    const v8Module = bootstrapBuiltinModule("node:v8");\n    if (v8Module === null) return null;\n',
    "safe v8 builtin loader",
)

print("round7 followup applied")
