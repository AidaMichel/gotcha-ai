from pathlib import Path


def replace_once(path, old, new, label):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{label}: anchor not found")
    path.write_text(text.replace(old, new, 1))

package = Path("src/package-authority.js")
replace_once(
    package,
    '''const ObjectDefineProperty = captureNativeDataFunction(\n  ObjectConstructor,\n  "defineProperty",\n  "function defineProperty() { [native code] }"\n);\n''',
    '''const ObjectDefineProperty = captureNativeDataFunction(\n  ObjectConstructor,\n  "defineProperty",\n  "function defineProperty() { [native code] }"\n);\nconst ObjectCreate = captureNativeDataFunction(\n  ObjectConstructor,\n  "create",\n  "function create() { [native code] }"\n);\n''',
    "package Object.create authority",
)
replace_once(
    package,
    '''const WeakSetHas = captureNativeDataFunction(\n  WeakSetPrototype,\n  "has",\n  "function has() { [native code] }"\n);\n''',
    '''const WeakSetHas = captureNativeDataFunction(\n  WeakSetPrototype,\n  "has",\n  "function has() { [native code] }"\n);\nconst WeakSetAdd = captureNativeDataFunction(\n  WeakSetPrototype,\n  "add",\n  "function add() { [native code] }"\n);\n''',
    "package WeakSet.add authority",
)
replace_once(
    package,
    '''  typeof ObjectDefineProperty === "function" &&\n  typeof ObjectFreeze === "function" &&\n''',
    '''  typeof ObjectDefineProperty === "function" &&\n  typeof ObjectCreate === "function" &&\n  typeof ObjectFreeze === "function" &&\n''',
    "package Object.create mandatory authority",
)
replace_once(
    package,
    '''  typeof WeakMapHas === "function" &&\n  typeof WeakSetHas === "function" &&\n''',
    '''  typeof WeakMapHas === "function" &&\n  typeof WeakSetHas === "function" &&\n  typeof WeakSetAdd === "function" &&\n''',
    "package WeakSet.add mandatory authority",
)
replace_once(
    package,
    '''  ObjectDefineProperty,\n  ObjectFreeze,\n''',
    '''  ObjectDefineProperty,\n  ObjectCreate,\n  ObjectFreeze,\n''',
    "package Object.create export",
)
replace_once(
    package,
    '''  WeakMapHas,\n  WeakSetHas,\n''',
    '''  WeakMapHas,\n  WeakSetHas,\n  WeakSetAdd,\n''',
    "package WeakSet.add export",
)
