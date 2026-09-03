from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing followup3 anchor: {label}")
    path.write_text(text.replace(old, new, 1))


runtime_path = ROOT / "src" / "runtime-authority.js"

# Buffer is a Uint8Array/typed-array view and is already rejected by isTypedArray
# before the redundant buffer-specific probe. Do not make the lazy global/builtin
# Buffer constructor part of bootstrap authority at all.
replace_once(
    runtime_path,
    '''const BufferConstructor = packageAuthority.BufferConstructor;
const vmModule = bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");

if (typeof BufferConstructor !== "function") {
  null.gotchaRuntimeBootstrapAuthority;
}
''',
    '''const vmModule = bootstrapBuiltinModule("node:vm", true);
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
''',
    "remove Buffer bootstrap dependency",
)

old_buffer_probe = '''let bufferIsBuffer = unavailableBrandProbe;
try {
  if (isProxy(BufferConstructor)) throw new Error("untrusted Buffer constructor");
  const descriptor = pristineReflectApply(
    pristineGetOwnPropertyDescriptor,
    undefined,
    [BufferConstructor, "isBuffer"]
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
    typeof candidate === "function" &&
    !isProxy(candidate) &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [candidate]
    ) === localFunctionPrototype &&
    typeof source === "string" &&
    pristineReflectApply(
      pristineStringStartsWith,
      source,
      ["function isBuffer("]
    ) === true
  ) {
    bufferIsBuffer = candidate;
  }
} catch {
  bufferIsBuffer = unavailableBrandProbe;
}
'''
new_buffer_probe = '''function bufferIsBuffer(value) {
  // Buffer is a typed-array view and is rejected by isTypedArray above.
  // Keeping this redundant slot inert avoids any dependency on Node's lazy
  // Buffer constructor/export while preserving the forbidden-value boundary.
  return false;
}
'''
replace_once(runtime_path, old_buffer_probe, new_buffer_probe, "remove redundant Buffer brand authority")

print("round7 followup3 applied")
