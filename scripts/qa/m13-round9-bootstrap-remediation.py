from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# Round 9: make the package descriptor capture fail closed before the mutable
# Object.getOwnPropertyDescriptor candidate can ever be invoked.
package_path = Path("src/package-authority.js")
package = package_path.read_text()
package = replace_once(
    package,
    'const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\n',
    '''const bootstrapReflectGetOwnPropertyDescriptor =\n  Reflect.getOwnPropertyDescriptor;\nconst bootstrapReflectApply = Reflect.apply;\nconst bootstrapFunctionToString = Function.prototype.toString;\n\nfunction captureNamedNativeDataFunction(object, key, expectedSource) {\n  let descriptor;\n  try {\n    descriptor = bootstrapReflectGetOwnPropertyDescriptor(object, key);\n  } catch {\n    return null;\n  }\n  if (\n    descriptor === undefined ||\n    "get" in descriptor ||\n    "set" in descriptor ||\n    typeof descriptor.value !== "function"\n  ) return null;\n\n  let source;\n  try {\n    source = bootstrapReflectApply(\n      bootstrapFunctionToString,\n      descriptor.value,\n      []\n    );\n  } catch {\n    return null;\n  }\n  return source === expectedSource ? descriptor.value : null;\n}\n\nconst getOwnPropertyDescriptor = captureNamedNativeDataFunction(\n  Object,\n  "getOwnPropertyDescriptor",\n  "function getOwnPropertyDescriptor() { [native code] }"\n);\n''',
    "package descriptor bootstrap",
)
package = replace_once(
    package,
    '''function dataValue(object, key) {\n  if (object === null || (typeof object !== "object" && typeof object !== "function")) {\n    return null;\n  }\n''',
    '''function dataValue(object, key) {\n  if (\n    typeof getOwnPropertyDescriptor !== "function" ||\n    object === null ||\n    (typeof object !== "object" && typeof object !== "function")\n  ) {\n    return null;\n  }\n''',
    "package dataValue guard",
)
package = replace_once(
    package,
    '''function accessorGetter(object, key) {\n  if (object === null || (typeof object !== "object" && typeof object !== "function")) {\n    return null;\n  }\n''',
    '''function accessorGetter(object, key) {\n  if (\n    typeof getOwnPropertyDescriptor !== "function" ||\n    object === null ||\n    (typeof object !== "object" && typeof object !== "function")\n  ) {\n    return null;\n  }\n''',
    "package accessor guard",
)
package = replace_once(
    package,
    'const ObjectGetPrototypeOf = dataValue(ObjectConstructor, "getPrototypeOf");\nconst ObjectFreeze = dataValue(ObjectConstructor, "freeze");\n',
    'const ObjectGetPrototypeOf = dataValue(ObjectConstructor, "getPrototypeOf");\nconst ObjectDefineProperty = dataValue(ObjectConstructor, "defineProperty");\nconst ObjectFreeze = dataValue(ObjectConstructor, "freeze");\n',
    "package defineProperty capture",
)
package = replace_once(
    package,
    '  ObjectGetPrototypeOf,\n  ObjectFreeze,\n',
    '  ObjectGetPrototypeOf,\n  ObjectDefineProperty,\n  ObjectFreeze,\n',
    "package defineProperty export",
)
package_path.write_text(package)


# Root bootstrap must consume package authority rather than re-reading the same
# mutable Object slots after package-authority has classified them.
index_path = Path("src/index.js")
index = index_path.read_text()
index = replace_once(
    index,
    '''const packageAuthority = require("./package-authority");\nconst bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\nconst bootstrapDefineProperty = Object.defineProperty;\n''',
    '''const packageAuthority = require("./package-authority");\nconst bootstrapGetOwnPropertyDescriptor =\n  packageAuthority.GetOwnPropertyDescriptor;\nconst bootstrapDefineProperty = packageAuthority.ObjectDefineProperty;\n''',
    "index package authority use",
)
index_path.write_text(index)


# Runtime bootstrap no longer consults process.moduleLoadList. That metadata is
# caller-mutable and cannot prove builtin freshness. We conservatively avoid
# the VM fresh-authority path and authenticate anonymous native-looking
# util/types callables with Inspector internal slots instead.
runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()
old = '''function bootstrapBuiltinWasLoaded(modulePath) {\n  const list = bootstrapOwnDataValue(process, "moduleLoadList");\n  if (list === null || typeof list !== "object") return true;\n  const bareName = modulePath.slice(0, 5) === "node:"\n    ? modulePath.slice(5)\n    : modulePath;\n  try {\n    for (let index = 0; index < list.length; index += 1) {\n      if (list[index] === "NativeModule " + bareName) return true;\n    }\n  } catch {\n    return true;\n  }\n  return false;\n}\n\nfunction bootstrapFreshBuiltinModule(modulePath) {\n  // Builtin module exports are mutable. A preloaded builtin cannot be\n  // authenticated without invoking authority that may itself be poisoned, so\n  // use it only when this module is the first code to load it.\n  if (bootstrapBuiltinWasLoaded(modulePath)) return null;\n  try {\n    return require(modulePath);\n  } catch {\n    return null;\n  }\n}\n\nconst vmModule = bootstrapFreshBuiltinModule("node:vm");\nconst runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");\nconst hasFreshVmAuthority = typeof runInNewContext === "function";\n'''
new = '''// process.moduleLoadList is configurable caller-controlled state and cannot\n// establish builtin freshness without executing Proxy traps. Treat VM export\n// authority as unavailable at bootstrap and use the descriptor-captured package\n// primordials plus trap-free Inspector classification instead.\nconst vmModule = null;\nconst runInNewContext = null;\nconst hasFreshVmAuthority = false;\n'''
runtime = replace_once(runtime, old, new, "remove moduleLoadList authority")
old = '''let utilTypesAuthorityLoadedFresh = false;\n\nfunction loadModuleUtilTypesAuthority() {\n  // Node 22 exposes the pristine public util/types probes as anonymous native\n  // functions. A callable Proxy has the same Function#toString shape, so that\n  // anonymous shape is only authoritative when Gotcha itself is the first\n  // loader of the public builtin. Preloaded authority remains fail-closed.\n  const wasLoaded = bootstrapBuiltinWasLoaded("node:util/types");\n  try {\n    const authority = require("node:util/types");\n    utilTypesAuthorityLoadedFresh = wasLoaded === false;\n    return authority;\n  } catch {}\n  try {\n    const authority = require("util/types");\n    utilTypesAuthorityLoadedFresh = wasLoaded === false;\n    return authority;\n  } catch {\n    utilTypesAuthorityLoadedFresh = false;\n    return null;\n  }\n}\n'''
new = '''function loadModuleUtilTypesAuthority() {\n  try {\n    return require("node:util/types");\n  } catch {}\n  try {\n    return require("util/types");\n  } catch {\n    return null;\n  }\n}\n'''
runtime = replace_once(runtime, old, new, "remove util types freshness metadata")
runtime = replace_once(
    runtime,
    '''  if (\n    bootstrapBuiltinWasLoaded("node:inspector") ||\n    typeof pristineDefineProperty !== "function" ||\n''',
    '''  if (\n    typeof pristineDefineProperty !== "function" ||\n''',
    "remove inspector moduleLoadList gate",
)
old = '''    const remote = callbackResult.result;\n    if (remote.subtype === "proxy") classified = true;\n    else if (remote.type === "function" && remote.subtype === undefined) classified = false;\n    else classified = null;\n'''
new = '''    const remote = callbackResult.result;\n    if (remote.subtype === "proxy") {\n      classified = true;\n    } else if (\n      remote.type === "function" &&\n      remote.subtype === undefined &&\n      typeof remote.objectId === "string"\n    ) {\n      let propertiesCalled = false;\n      let propertiesError = null;\n      let propertiesResult = null;\n      pristineReflectApply(post, session, [\n        "Runtime.getProperties",\n        {\n          objectId: remote.objectId,\n          ownProperties: true,\n          generatePreview: false\n        },\n        function gotchaInspectorPropertiesCallback(error, result) {\n          propertiesCalled = true;\n          propertiesError = error;\n          propertiesResult = result;\n        }\n      ]);\n      if (\n        propertiesCalled !== true ||\n        propertiesError !== null ||\n        propertiesResult === null ||\n        typeof propertiesResult !== "object" ||\n        !Array.isArray(propertiesResult.internalProperties)\n      ) {\n        classified = null;\n      } else {\n        let bound = false;\n        for (\n          let index = 0;\n          index < propertiesResult.internalProperties.length;\n          index += 1\n        ) {\n          const entry = propertiesResult.internalProperties[index];\n          if (\n            entry !== null &&\n            typeof entry === "object" &&\n            (\n              entry.name === "[[TargetFunction]]" ||\n              entry.name === "[[BoundThis]]" ||\n              entry.name === "[[BoundArgs]]"\n            )\n          ) {\n            bound = true;\n            break;\n          }\n        }\n        classified = bound;\n      }\n    } else {\n      classified = null;\n    }\n'''
runtime = replace_once(runtime, old, new, "inspector bound classification")
old = '''    if (\n      source !== namedNativeSource &&\n      source !== "function () { [native code] }"\n    ) return null;\n    return candidate;\n'''
new = '''    if (source === namedNativeSource) return candidate;\n    if (\n      source === "function () { [native code] }" &&\n      inspectorClassifiesProxy(candidate) === false\n    ) return candidate;\n    return null;\n'''
runtime = replace_once(runtime, old, new, "reject bound anonymous native probes")
runtime_path.write_text(runtime)


# The provider layer already uses runtimeAuthority for every brand decision; do
# not touch node:util.types again on lazy module load.
provider_path = Path("src/provider-adapter-m13.js")
provider = provider_path.read_text()
provider = replace_once(
    provider,
    'const { types: utilTypes } = require("node:util");\n',
    '',
    "remove provider util types read",
)
provider_path.write_text(provider)


# Permanent regressions for all five Round-9 Codex findings.
test_path = Path("test/m13-review-remediation.test.js")
test = test_path.read_text()
marker = 'test("round9 descriptor primitive poisoning never executes", () => {'
if marker not in test:
    test += r'''


test("round9 descriptor primitive poisoning never executes", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Reflect.getOwnPropertyDescriptor(Object, "getOwnPropertyDescriptor");
    let calls = 0;
    const poisoned = new Proxy(original.value, {
      apply(target, thisArg, args) {
        calls += 1;
        return Reflect.apply(target, thisArg, args);
      }
    });
    Object.defineProperty(Object, "getOwnPropertyDescriptor", {
      value: poisoned,
      writable: original.writable,
      enumerable: original.enumerable,
      configurable: original.configurable
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Reflect.defineProperty(Object, "getOwnPropertyDescriptor", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 90;
    if (calls !== 0) process.exitCode = 91;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 bootstrap never invokes ambient String.prototype.slice", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Object.getOwnPropertyDescriptor(String.prototype, "slice");
    let calls = 0;
    Object.defineProperty(String.prototype, "slice", {
      value: function poisonedSlice() { calls += 1; return Reflect.apply(original.value, this, arguments); },
      writable: original.writable,
      enumerable: original.enumerable,
      configurable: original.configurable
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(String.prototype, "slice", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 92;
    if (calls !== 0) process.exitCode = 93;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 lazy provider never reads accessor-backed node util types", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = Object.getOwnPropertyDescriptor(util, "types");
    if (!original || original.configurable !== true) process.exit(0);
    let calls = 0;
    Object.defineProperty(util, "types", {
      get() { calls += 1; throw new Error("poisoned util.types getter executed"); },
      set: undefined,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try {
      api = require(${JSON.stringify(indexPath)});
      void api.createStructuredProviderAdapter;
    } catch (error) {
      console.error(error && error.stack || error);
      process.exitCode = 94;
    } finally {
      Object.defineProperty(util, "types", original);
    }
    if (calls !== 0) process.exitCode = 95;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 bound util types probes are rejected without execution", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    let types;
    try { types = require("node:util/types"); }
    catch { process.exit(0); }
    const original = Object.getOwnPropertyDescriptor(types, "isDate");
    if (!original || original.configurable !== true) process.exit(0);
    let calls = 0;
    function attacker() { calls += 1; return false; }
    const poisoned = attacker.bind(null);
    Object.defineProperty(types, "isDate", {
      value: poisoned,
      writable: original.writable,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(types, "isDate", original); }
    Promise.resolve(api.generateContractProtectionProposal({})).catch(() => {}).then(() => {
      if (calls !== 0) process.exitCode = 96;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 process moduleLoadList Proxy is never inspected", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Object.getOwnPropertyDescriptor(process, "moduleLoadList");
    if (!original || original.configurable !== true || !Array.isArray(original.value)) process.exit(0);
    let calls = 0;
    const poisoned = new Proxy(original.value, {
      get(target, property, receiver) {
        calls += 1;
        return Reflect.get(target, property, receiver);
      }
    });
    Object.defineProperty(process, "moduleLoadList", {
      value: poisoned,
      writable: original.writable,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(process, "moduleLoadList", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 97;
    if (calls !== 0) process.exitCode = 98;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
'''
test_path.write_text(test)

print("Applied Round-9 bootstrap authority remediation.")
