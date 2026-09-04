from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


path = Path("src/runtime-authority.js")
text = path.read_text()

# With mutable module-load metadata removed, do not derive the expected native
# source from the same ambient candidate being authenticated. Fixed ECMAScript
# intrinsic source forms make coordinated ordinary/bound replacements fail
# closed instead of turning the comparison into a tautology.
text = replace_once(
    text,
    '''const pristineArrayConstructorSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Array)")\n  : bootstrapFunctionSource(packageAuthority.ArrayConstructor);\nconst pristineArrayIsArraySource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Array.isArray)")\n  : bootstrapFunctionSource(packageAuthority.ArrayIsArray);\nconst pristinePromiseConstructorSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Promise)")\n  : bootstrapFunctionSource(packageAuthority.PromiseConstructor);\nconst pristinePromiseThenSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Promise.prototype.then)")\n  : bootstrapFunctionSource(packageAuthority.PromiseThen);\n''',
    '''const pristineArrayConstructorSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Array)")\n  : "function Array() { [native code] }";\nconst pristineArrayIsArraySource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Array.isArray)")\n  : "function isArray() { [native code] }";\nconst pristinePromiseConstructorSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Promise)")\n  : "function Promise() { [native code] }";\nconst pristinePromiseThenSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Promise.prototype.then)")\n  : "function then() { [native code] }";\n''',
    "fixed native Array/Promise sources",
)

text = replace_once(
    text,
    '''const pristinePromiseSpeciesGetterSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)")\n  : bootstrapFunctionSource(packageAuthority.PromiseSpeciesGetter);\n''',
    '''const pristinePromiseSpeciesGetterSource = hasFreshVmAuthority\n  ? runInNewContext("Function.prototype.toString.call(Object.getOwnPropertyDescriptor(Promise, Symbol.species).get)")\n  : "function get [Symbol.species]() { [native code] }";\n''',
    "fixed Promise species getter source",
)

path.write_text(text)
print("Applied Round-9 fixed intrinsic source baselines.")
