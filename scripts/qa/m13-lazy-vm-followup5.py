from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()

old = '''const consumerStringIncludes = captureLocalNativeDataFunction(\n  consumerStringPrototype,\n  "includes",\n  "function includes() { [native code] }"\n);'''
new = '''const consumerStringIncludes = hasFreshVmAuthority\n  ? runInNewContext("String.prototype.includes")\n  : captureLocalNativeDataFunction(\n      consumerStringPrototype,\n      "includes",\n      "function includes() { [native code] }"\n    );'''
if text.count(old) != 1:
    raise SystemExit(f"consumer String.includes authority: expected 1 match, got {text.count(old)}")
text = text.replace(old, new, 1)

path.write_text(text)
print("Prefer authenticated fresh-VM String.includes while retaining fail-closed preloaded-VM fallback.")
