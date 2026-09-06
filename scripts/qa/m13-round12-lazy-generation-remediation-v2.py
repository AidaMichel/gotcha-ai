from pathlib import Path


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{label}: anchor not found")
    path.write_text(text.replace(old, new, 1))

package = Path("src/package-authority.js")
replace_once(
    package,
    '''const ObjectGetPrototypeOf = captureNativeDataFunction(\n  ObjectConstructor,\n  "getPrototypeOf",\n  "function getPrototypeOf() { [native code] }"\n);\n''',
    '''const ObjectGetOwnPropertyDescriptor = captureNativeDataFunction(\n  ObjectConstructor,\n  "getOwnPropertyDescriptor",\n  "function getOwnPropertyDescriptor() { [native code] }"\n);\nconst ObjectGetPrototypeOf = captureNativeDataFunction(\n  ObjectConstructor,\n  "getPrototypeOf",\n  "function getPrototypeOf() { [native code] }"\n);\n''',
    "package descriptor capture",
)
replace_once(
    package,
    '''  ObjectPrototype !== null &&\n  typeof ObjectGetPrototypeOf === "function" &&\n''',
    '''  ObjectPrototype !== null &&\n  typeof ObjectGetOwnPropertyDescriptor === "function" &&\n  typeof ObjectGetPrototypeOf === "function" &&\n''',
    "package descriptor mandatory authority",
)
replace_once(
    package,
    '''  ReflectApply,\n  ObjectGetPrototypeOf,\n''',
    '''  ReflectApply,\n  ObjectGetOwnPropertyDescriptor,\n  ObjectGetPrototypeOf,\n''',
    "package descriptor export",
)

index = Path("src/index.js")
replace_once(
    index,
    '''function bindImplementationGeneration() {\n  if (!promiseAuthorityAvailable()) return null;\n''',
    '''function bindImplementationGeneration() {\n  if (\n    packageAuthority === null ||\n    packageAuthority.available !== true ||\n    !promiseAuthorityAvailable()\n  ) return null;\n''',
    "root generation authority gate",
)
