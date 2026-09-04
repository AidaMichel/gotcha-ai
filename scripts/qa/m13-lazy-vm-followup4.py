from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()

start = text.find("const consumerPrimordialsCoreAvailable = (")
end = text.find("const consumerPrimordialsAvailable = (", start)
if start < 0 or end < 0:
    raise SystemExit("consumer primordial availability anchors not found")

bundle = '''const consumerPrimordialsBundleAvailable = (\n  typeof pristineReflectApply === "function" &&\n  typeof pristineGetPrototypeOf === "function" &&\n  typeof pristineGetOwnPropertyDescriptor === "function" &&\n  typeof pristineFunctionToString === "function" &&\n  typeof pristineObjectFreeze === "function"\n);\n\n'''
text = text[:start] + bundle + text[end:]

old = '''const consumerPrimordialsAvailable = (\n  consumerPrimordialsCoreAvailable === true &&\n  consumerTypeErrorConstructorSource ===\n    "function TypeError() { [native code] }"\n);'''
new = '''const consumerPrimordialsAvailable = (\n  consumerPrimordialsBundleAvailable === true &&\n  typeof arrayIsArray === "function" &&\n  typeof consumerGetOwnPropertyDescriptors === "function" &&\n  typeof consumerIsExtensible === "function" &&\n  typeof consumerObjectIs === "function" &&\n  typeof consumerDefineProperty === "function" &&\n  typeof consumerHasOwnProperty === "function" &&\n  typeof consumerOwnKeys === "function" &&\n  typeof consumerNumberIsFinite === "function" &&\n  typeof consumerStringTrim === "function" &&\n  typeof consumerStringIncludes === "function" &&\n  typeof consumerSetConstructor === "function" &&\n  typeof consumerMapConstructor === "function" &&\n  typeof consumerSetHas === "function" &&\n  typeof consumerSetAdd === "function" &&\n  typeof consumerMapGet === "function" &&\n  typeof consumerMapSet === "function" &&\n  typeof consumerArrayPush === "function" &&\n  typeof consumerArrayPop === "function" &&\n  typeof consumerArrayJoin === "function" &&\n  consumerTypeErrorConstructorSource ===\n    "function TypeError() { [native code] }"\n);'''
if text.count(old) != 1:
    raise SystemExit(f"full consumer authority block: expected 1 match, got {text.count(old)}")
text = text.replace(old, new, 1)

old = "const consumerPrimordials = consumerPrimordialsCoreAvailable\n"
new = "const consumerPrimordials = consumerPrimordialsBundleAvailable\n"
if text.count(old) != 1:
    raise SystemExit(f"consumer bundle construction gate: expected 1 match, got {text.count(old)}")
text = text.replace(old, new, 1)

old = '''const consumerStringIncludes = captureLocalNativeDataFunction(\n  consumerStringPrototype,\n  "includes",\n  "function includes() { [native code] }"\n);'''
new = '''const consumerStringIncludes = hasFreshVmAuthority\n  ? runInNewContext("String.prototype.includes")\n  : captureLocalNativeDataFunction(\n      consumerStringPrototype,\n      "includes",\n      "function includes() { [native code] }"\n    );'''
if text.count(old) != 1:
    raise SystemExit(f"consumer String.includes authority: expected 1 match, got {text.count(old)}")
text = text.replace(old, new, 1)

path.write_text(text)
print("Made the primordial bundle structurally load-safe and preserved pristine String.includes authority.")
