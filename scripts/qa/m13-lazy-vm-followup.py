from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()
old = 'const consumerTypeErrorConstructor = captureLocalNativeConstructor("TypeError");'
new = r'''const consumerTypeErrorConstructorCandidate =
  bootstrapOwnDataValue(globalThis, "TypeError");
let consumerTypeErrorConstructor = null;
try {
  if (
    typeof consumerTypeErrorConstructorCandidate === "function" &&
    !isProxy(consumerTypeErrorConstructorCandidate) &&
    pristineReflectApply(
      pristineFunctionToString,
      consumerTypeErrorConstructorCandidate,
      []
    ) === "function TypeError() { [native code] }"
  ) {
    consumerTypeErrorConstructor = consumerTypeErrorConstructorCandidate;
  }
} catch {
  consumerTypeErrorConstructor = null;
}'''
if text.count(old) != 1:
    raise SystemExit(f"TypeError constructor rule: expected one match, got {text.count(old)}")
text = text.replace(old, new, 1)
path.write_text(text)
print("Adjusted Error-constructor identity rule without weakening native/Proxy authentication.")
