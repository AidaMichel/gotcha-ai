from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

old_loader = '''function loadModuleUtilTypesAuthority() {
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
'''
new_loader = '''let utilTypesAuthorityLoadedFresh = false;

function loadModuleUtilTypesAuthority() {
  // Node 22 exposes the pristine public util/types probes as anonymous native
  // functions. A callable Proxy has the same Function#toString shape, so that
  // anonymous shape is only authoritative when Gotcha itself is the first
  // loader of the public builtin. Preloaded authority remains fail-closed.
  const wasLoaded = bootstrapBuiltinWasLoaded("node:util/types");
  try {
    const authority = require("node:util/types");
    utilTypesAuthorityLoadedFresh = wasLoaded === false;
    return authority;
  } catch {}
  try {
    const authority = require("util/types");
    utilTypesAuthorityLoadedFresh = wasLoaded === false;
    return authority;
  } catch {
    utilTypesAuthorityLoadedFresh = false;
    return null;
  }
}

let utilTypesAuthority = loadModuleUtilTypesAuthority();
'''
if old_loader not in runtime:
    raise SystemExit("missing util/types authority loader")
runtime = runtime.replace(old_loader, new_loader, 1)

old_auth = '''      typeof candidate === "function" &&
      source === "function isProxy() { [native code] }"
'''
new_auth = '''      typeof candidate === "function" &&
      (
        source === "function isProxy() { [native code] }" ||
        (
          utilTypesAuthorityLoadedFresh === true &&
          source === "function () { [native code] }"
        )
      )
'''
if old_auth not in runtime:
    raise SystemExit("missing named native isProxy authentication")
runtime = runtime.replace(old_auth, new_auth, 1)

runtime_path.write_text(runtime)
print("Added Node-22-compatible fresh util/types proxy authority without trusting preloaded anonymous probes.")
