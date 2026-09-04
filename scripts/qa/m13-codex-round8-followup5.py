from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

old = '''      typeof candidate === "function" &&
      (
        source === "function isProxy() { [native code] }" ||
        (
          utilTypesAuthorityLoadedFresh === true &&
          source === "function () { [native code] }"
        )
      )
'''
new = '''      typeof candidate === "function" &&
      source === "function isProxy() { [native code] }"
'''
if old not in runtime:
    raise SystemExit("missing anonymous util/types trust branch")
runtime = runtime.replace(old, new, 1)

runtime_path.write_text(runtime)
print("Removed forgeable anonymous util/types trust; fresh V8 is now the only anonymous Proxy authority recovery path.")
