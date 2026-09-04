from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# The package root must not reload node:util while establishing runtime
# authority. On Node 18, BuiltinModule.syncExports reads accessor-backed public
# exports during require("node:util"), so merely attempting to inspect/neutralize
# util.inspect can execute an unrelated hostile util.types getter. Runtime
# authority owns the builtin-specific handling; the root only loads it and
# fails closed if capture fails.
index_path = Path("src/index.js")
index = index_path.read_text()
start_marker = 'const packageAuthority = require("./package-authority");\n'
end_marker = '\nfunction makeBoundaryError() {'
start = index.find(start_marker)
end = index.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("index runtime bootstrap: expected markers not found")
index = (
    index[:start]
    + '''let runtimeAuthority = null;\ntry {\n  runtimeAuthority = require("./runtime-authority");\n} catch {\n  runtimeAuthority = null;\n}\n'''
    + index[end:]
)
index_path.write_text(index)


# v2 briefly routed util/types authority through require("node:util") plus a
# descriptor read. That descriptor read itself is too late on Node 18 because
# the builtin loader synchronizes public exports first. Direct node:util/types
# loading was verified under a poisoned parent util.types accessor on Node
# 18/20/22/24 without executing the getter, so keep the authority seam on the
# dedicated builtin instead of the mutable parent export.
runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()
runtime = replace_once(
    runtime,
    '''function loadModuleUtilTypesAuthority() {\n  // `node:util/types` may be served through the mutable `node:util.types`\n  // export. Read that export descriptor-safely instead of triggering an\n  // accessor while establishing lazy provider/runtime authority.\n  let utilModule;\n  try {\n    utilModule = require("node:util");\n  } catch {\n    return null;\n  }\n  const authority = bootstrapOwnDataValue(utilModule, "types");\n  return authority !== null && typeof authority === "object"\n    ? authority\n    : null;\n}\n''',
    '''function loadModuleUtilTypesAuthority() {\n  try {\n    return require("node:util/types");\n  } catch {}\n  try {\n    return require("util/types");\n  } catch {\n    return null;\n  }\n}\n''',
    "direct util types authority",
)
runtime_path.write_text(runtime)


# ObjectDefineProperty was exported by v1 only for the root's temporary
# node:util.inspect rewrite. With that root surgery removed, do not leave an
# unused authority slot behind.
package_path = Path("src/package-authority.js")
package = package_path.read_text()
package = replace_once(
    package,
    'const ObjectGetPrototypeOf = dataValue(ObjectConstructor, "getPrototypeOf");\nconst ObjectDefineProperty = dataValue(ObjectConstructor, "defineProperty");\nconst ObjectFreeze = dataValue(ObjectConstructor, "freeze");\n',
    'const ObjectGetPrototypeOf = dataValue(ObjectConstructor, "getPrototypeOf");\nconst ObjectFreeze = dataValue(ObjectConstructor, "freeze");\n',
    "remove unused package defineProperty capture",
)
package = replace_once(
    package,
    '  ObjectGetPrototypeOf,\n  ObjectDefineProperty,\n  ObjectFreeze,\n',
    '  ObjectGetPrototypeOf,\n  ObjectFreeze,\n',
    "remove unused package defineProperty export",
)
package_path.write_text(package)

print("Closed Node-18 Round-9 builtin getter paths.")
