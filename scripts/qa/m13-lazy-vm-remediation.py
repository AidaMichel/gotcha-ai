from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


# ---------------------------------------------------------------------------
# Shared runtime authority: this is the only module allowed to touch node:vm.
# Export one authenticated primordial bundle for all lazy consumers.
# ---------------------------------------------------------------------------
runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()
consumer_block = r'''
function captureLocalNativeDataFunction(object, key, expectedSource) {
  if (object === null || (typeof object !== "object" && typeof object !== "function")) {
    return null;
  }
  try {
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [object, key]
    );
    const candidate = (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor)
    ) ? descriptor.value : null;
    if (
      typeof candidate !== "function" ||
      isProxy(candidate) ||
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    return pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    ) === expectedSource ? candidate : null;
  } catch {
    return null;
  }
}

function captureLocalNativeConstructor(name) {
  const candidate = bootstrapOwnDataValue(globalThis, name);
  if (
    typeof candidate !== "function" ||
    isProxy(candidate)
  ) return null;
  try {
    if (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) !== localFunctionPrototype
    ) return null;
    return pristineReflectApply(
      pristineFunctionToString,
      candidate,
      []
    ) === "function " + name + "() { [native code] }"
      ? candidate
      : null;
  } catch {
    return null;
  }
}

const consumerObjectConstructor = captureLocalNativeConstructor("Object");
const consumerArrayConstructor = captureLocalNativeConstructor("Array");
const consumerSetConstructor = captureLocalNativeConstructor("Set");
const consumerMapConstructor = captureLocalNativeConstructor("Map");
const consumerNumberConstructor = captureLocalNativeConstructor("Number");
const consumerStringConstructor = captureLocalNativeConstructor("String");
const consumerTypeErrorConstructor = captureLocalNativeConstructor("TypeError");
const consumerReflectObject = bootstrapOwnDataValue(globalThis, "Reflect");

const consumerObjectPrototype = bootstrapOwnDataValue(
  consumerObjectConstructor,
  "prototype"
);
const consumerArrayPrototype = bootstrapOwnDataValue(
  consumerArrayConstructor,
  "prototype"
);
const consumerSetPrototype = bootstrapOwnDataValue(
  consumerSetConstructor,
  "prototype"
);
const consumerMapPrototype = bootstrapOwnDataValue(
  consumerMapConstructor,
  "prototype"
);
const consumerStringPrototype = bootstrapOwnDataValue(
  consumerStringConstructor,
  "prototype"
);

const consumerGetOwnPropertyDescriptors = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "getOwnPropertyDescriptors",
  "function getOwnPropertyDescriptors() { [native code] }"
);
const consumerIsExtensible = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "isExtensible",
  "function isExtensible() { [native code] }"
);
const consumerObjectIs = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "is",
  "function is() { [native code] }"
);
const consumerDefineProperty = captureLocalNativeDataFunction(
  consumerObjectConstructor,
  "defineProperty",
  "function defineProperty() { [native code] }"
);
const consumerHasOwnProperty = captureLocalNativeDataFunction(
  consumerObjectPrototype,
  "hasOwnProperty",
  "function hasOwnProperty() { [native code] }"
);
const consumerOwnKeys = captureLocalNativeDataFunction(
  consumerReflectObject,
  "ownKeys",
  "function ownKeys() { [native code] }"
);
const consumerNumberIsFinite = captureLocalNativeDataFunction(
  consumerNumberConstructor,
  "isFinite",
  "function isFinite() { [native code] }"
);
const consumerStringTrim = captureLocalNativeDataFunction(
  consumerStringPrototype,
  "trim",
  "function trim() { [native code] }"
);
const consumerStringIncludes = captureLocalNativeDataFunction(
  consumerStringPrototype,
  "includes",
  "function includes() { [native code] }"
);
const consumerSetHas = captureLocalNativeDataFunction(
  consumerSetPrototype,
  "has",
  "function has() { [native code] }"
);
const consumerSetAdd = captureLocalNativeDataFunction(
  consumerSetPrototype,
  "add",
  "function add() { [native code] }"
);
const consumerMapGet = captureLocalNativeDataFunction(
  consumerMapPrototype,
  "get",
  "function get() { [native code] }"
);
const consumerMapSet = captureLocalNativeDataFunction(
  consumerMapPrototype,
  "set",
  "function set() { [native code] }"
);
const consumerArrayPush = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "push",
  "function push() { [native code] }"
);
const consumerArrayPop = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "pop",
  "function pop() { [native code] }"
);
const consumerArrayJoin = captureLocalNativeDataFunction(
  consumerArrayPrototype,
  "join",
  "function join() { [native code] }"
);

function captureOptionalNativeConstructor(name) {
  const candidate = bootstrapOwnDataValue(globalThis, name);
  if (candidate === null || candidate === undefined) return null;
  if (
    typeof candidate !== "function" ||
    isProxy(candidate)
  ) return null;
  try {
    return (
      pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [candidate]
      ) === localFunctionPrototype &&
      pristineReflectApply(
        pristineFunctionToString,
        candidate,
        []
      ) === "function " + name + "() { [native code] }"
    ) ? candidate : null;
  } catch {
    return null;
  }
}

const consumerWeakRefConstructor = captureOptionalNativeConstructor("WeakRef");
const consumerFinalizationRegistryConstructor =
  captureOptionalNativeConstructor("FinalizationRegistry");

const freshVmIsContext = hasFreshVmAuthority
  ? bootstrapOwnDataValue(vmModule, "isContext")
  : null;
function isVmContext(value) {
  if (typeof freshVmIsContext !== "function") return false;
  try {
    return pristineReflectApply(freshVmIsContext, vmModule, [value]) === true;
  } catch {
    return true;
  }
}

const consumerTypeErrorConstructorSource =
  bootstrapFunctionSource(consumerTypeErrorConstructor);

const consumerPrimordialsAvailable = (
  typeof pristineReflectApply === "function" &&
  typeof pristineGetPrototypeOf === "function" &&
  typeof pristineGetOwnPropertyDescriptor === "function" &&
  typeof pristineFunctionToString === "function" &&
  typeof pristineObjectFreeze === "function" &&
  typeof arrayIsArray === "function" &&
  typeof consumerGetOwnPropertyDescriptors === "function" &&
  typeof consumerIsExtensible === "function" &&
  typeof consumerObjectIs === "function" &&
  typeof consumerDefineProperty === "function" &&
  typeof consumerHasOwnProperty === "function" &&
  typeof consumerOwnKeys === "function" &&
  typeof consumerNumberIsFinite === "function" &&
  typeof consumerStringTrim === "function" &&
  typeof consumerStringIncludes === "function" &&
  typeof consumerSetConstructor === "function" &&
  typeof consumerMapConstructor === "function" &&
  typeof consumerSetHas === "function" &&
  typeof consumerSetAdd === "function" &&
  typeof consumerMapGet === "function" &&
  typeof consumerMapSet === "function" &&
  typeof consumerArrayPush === "function" &&
  typeof consumerArrayPop === "function" &&
  typeof consumerArrayJoin === "function" &&
  consumerTypeErrorConstructorSource ===
    "function TypeError() { [native code] }"
);

const consumerPrimordials = consumerPrimordialsAvailable
  ? pristineReflectApply(pristineObjectFreeze, undefined, [{
      reflectApply: pristineReflectApply,
      getPrototypeOf: pristineGetPrototypeOf,
      getOwnPropertyDescriptor: pristineGetOwnPropertyDescriptor,
      getOwnPropertyDescriptors: consumerGetOwnPropertyDescriptors,
      functionToString: pristineFunctionToString,
      objectFreeze: pristineObjectFreeze,
      isExtensible: consumerIsExtensible,
      objectIs: consumerObjectIs,
      defineProperty: consumerDefineProperty,
      hasOwnProperty: consumerHasOwnProperty,
      ownKeys: consumerOwnKeys,
      arrayIsArray,
      numberIsFinite: consumerNumberIsFinite,
      stringTrim: consumerStringTrim,
      stringIncludes: consumerStringIncludes,
      SetConstructor: consumerSetConstructor,
      MapConstructor: consumerMapConstructor,
      setHas: consumerSetHas,
      setAdd: consumerSetAdd,
      mapGet: consumerMapGet,
      mapSet: consumerMapSet,
      arrayPush: consumerArrayPush,
      arrayPop: consumerArrayPop,
      arrayJoin: consumerArrayJoin,
      promiseConstructorSource: pristinePromiseConstructorSource,
      promiseThenSource: pristinePromiseThenSource,
      typeErrorConstructorSource: consumerTypeErrorConstructorSource
    }])
  : null;
'''
if "const consumerPrimordialsAvailable =" not in runtime:
    runtime = replace_once(
        runtime,
        "\nconst exported = {\n",
        "\n" + consumer_block + "\nconst exported = {\n",
        "insert shared consumer primordials",
    )
runtime = replace_once(
    runtime,
    "const exported = {\n  isProxy,",
    "const exported = {\n"
    "  objectFreeze: pristineObjectFreeze,\n"
    "  functionToString: pristineFunctionToString,\n"
    "  consumerPrimordialsAvailable,\n"
    "  consumerPrimordials,\n"
    "  weakRefConstructor: consumerWeakRefConstructor,\n"
    "  finalizationRegistryConstructor: consumerFinalizationRegistryConstructor,\n"
    "  isVmContext,\n"
    "  isProxy,",
    "runtime authority shared exports",
)
write(str(runtime_path), runtime)

# ---------------------------------------------------------------------------
# Root gate: no lazy authority consumer is loaded unless shared primordials are
# complete. runGotcha is synchronous, so gate it explicitly as well.
# ---------------------------------------------------------------------------
index_path = Path("src/index.js")
index = index_path.read_text()
index = replace_once(
    index,
    "    runtimeAuthority !== null &&\n"
    "    runtimeAuthority.promiseAuthorityAvailable === true &&",
    "    runtimeAuthority !== null &&\n"
    "    runtimeAuthority.consumerPrimordialsAvailable === true &&\n"
    "    runtimeAuthority.promiseAuthorityAvailable === true &&",
    "gate lazy exports on consumer primordials",
)
index = replace_once(
    index,
    "function runGotcha({ evaluator, expectedOutput, mutationPack }) {\n"
    "  const { compileMutationPack } = require(\"./mutation-pack\");",
    "function runGotcha({ evaluator, expectedOutput, mutationPack }) {\n"
    "  if (\n"
    "    runtimeAuthority === null ||\n"
    "    runtimeAuthority.consumerPrimordialsAvailable !== true\n"
    "  ) throw makeBoundaryError();\n"
    "  const { compileMutationPack } = require(\"./mutation-pack\");",
    "gate runGotcha on consumer primordials",
)
write(str(index_path), index)

# ---------------------------------------------------------------------------
# M8 core: no independent VM import; use the shared authenticated freeze.
# ---------------------------------------------------------------------------
core_path = Path("src/contract-attacks-core.js")
core = core_path.read_text()
core = replace_once(
    core,
    'const {\n  runInNewContext\n} = require("node:vm");\n\n',
    "",
    "remove M8 mutable node:vm import",
)
core = replace_once(
    core,
    "// The M8 core owns the experiment authority. It is created from the same\n"
    "// util.types instance observed by this core plus pristine VM operations at\n"
    "// core initialization, then retained on the cached core export. No separately\n"
    "// cacheable dependency can predate or outlive this authority.\n"
    "const experimentFreeze =\n"
    '  runInNewContext("Object.freeze");',
    "// The M8 core owns the experiment authority. It is created from the same\n"
    "// authenticated runtime generation used by the package root and retained on\n"
    "// the cached core export. No separately mutable builtin authority is invoked\n"
    "// when this legacy core is loaded lazily.\n"
    "const experimentFreeze =\n"
    "  runtimeAuthority.objectFreeze;",
    "route M8 freeze through shared authority",
)
core = replace_once(
    core,
    "  promiseAuthorityAvailable === true &&\n"
    "  typeof runtimeAuthority.arrayIsArray === \"function\" &&",
    "  promiseAuthorityAvailable === true &&\n"
    "  runtimeAuthority.consumerPrimordialsAvailable === true &&\n"
    "  typeof runtimeAuthority.arrayIsArray === \"function\" &&",
    "gate M8 dependency authority",
)
write(str(core_path), core)

# ---------------------------------------------------------------------------
# Provider adapter: reuse exact Promise authority and shared Function#toString.
# ---------------------------------------------------------------------------
provider_path = Path("src/provider-adapter-m13.js")
provider = provider_path.read_text()
provider = replace_once(
    provider,
    'const { runInNewContext } = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");',
    'const runtimeAuthority = require("./runtime-authority");\n'
    'const consumerPrimordials = runtimeAuthority.consumerPrimordials;',
    "remove provider vm import",
)
for old, new, label in [
    ('const pristineReflectApply = runInNewContext("Reflect.apply");',
     'const pristineReflectApply = consumerPrimordials.reflectApply;',
     'provider reflectApply'),
    ('const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");',
     'const pristineGetPrototypeOf = consumerPrimordials.getPrototypeOf;',
     'provider getPrototypeOf'),
    ('const pristineGetOwnPropertyDescriptor = runInNewContext(\n    "Object.getOwnPropertyDescriptor"\n  );',
     'const pristineGetOwnPropertyDescriptor =\n    consumerPrimordials.getOwnPropertyDescriptor;',
     'provider descriptor'),
    ('const pristineFunctionToString = runInNewContext("Function.prototype.toString");',
     'const pristineFunctionToString = consumerPrimordials.functionToString;',
     'provider Function#toString'),
    ('const pristinePromiseConstructorSource = runInNewContext(\n    "Function.prototype.toString.call(Promise)"\n  );',
     'const pristinePromiseConstructorSource =\n    consumerPrimordials.promiseConstructorSource;',
     'provider Promise source'),
    ('const pristinePromiseThenSource = runInNewContext(\n    "Function.prototype.toString.call(Promise.prototype.then)"\n  );',
     'const pristinePromiseThenSource = consumerPrimordials.promiseThenSource;',
     'provider Promise.then source'),
    ('const pristineTypeErrorSource = runInNewContext(\n    "Function.prototype.toString.call(TypeError)"\n  );\n  const pristineFunctionToString = runInNewContext(\n    "Function.prototype.toString"\n  );',
     'const pristineTypeErrorSource =\n    consumerPrimordials.typeErrorConstructorSource;\n  const pristineFunctionToString = consumerPrimordials.functionToString;',
     'provider TypeError source'),
]:
    provider = replace_once(provider, old, new, label)
write(str(provider_path), provider)

# ---------------------------------------------------------------------------
# M12 quality loop: VM import was unused.
# ---------------------------------------------------------------------------
quality_path = Path("src/contract-quality-loop.js")
quality = quality_path.read_text()
quality = replace_once(
    quality,
    'const { runInNewContext } = require("node:vm");\n\n',
    "",
    "remove unused M12 vm import",
)
write(str(quality_path), quality)

# ---------------------------------------------------------------------------
# Experiment capture layers: consume the shared primordial bundle directly.
# ---------------------------------------------------------------------------
safe_path = Path("src/contract-experiment-safe.js")
safe = safe_path.read_text()
safe = replace_once(
    safe,
    'const {\n  runInNewContext\n} = require("node:vm");\n',
    'const runtimeAuthority = require("./runtime-authority");\n',
    "safe experiment vm import",
)
start = 'const pristineIntrinsics =\n  runInNewContext(`({\n'
end = '  })`);\n\n'
start_index = safe.find(start)
if start_index < 0:
    raise SystemExit("safe experiment pristine block start not found")
end_index = safe.find(end, start_index)
if end_index < 0:
    raise SystemExit("safe experiment pristine block end not found")
safe = safe[:start_index] + (
    "const pristineIntrinsics =\n"
    "  runtimeAuthority.consumerPrimordials;\n\n"
) + safe[end_index + len(end):]
write(str(safe_path), safe)

experiment_path = Path("src/contract-experiment.js")
experiment = experiment_path.read_text()
experiment = replace_once(
    experiment,
    'const {\n  runInNewContext\n} = require("node:vm");\n',
    'const runtimeAuthority = require("./runtime-authority");\n',
    "experiment vm import",
)
start = 'const pristineIntrinsics =\n  runInNewContext(`({\n'
end = '  })`);\n\n'
start_index = experiment.find(start)
if start_index < 0:
    raise SystemExit("experiment pristine block start not found")
end_index = experiment.find(end, start_index)
if end_index < 0:
    raise SystemExit("experiment pristine block end not found")
experiment = experiment[:start_index] + (
    "const pristineIntrinsics =\n"
    "  runtimeAuthority.consumerPrimordials;\n\n"
) + experiment[end_index + len(end):]
write(str(experiment_path), experiment)

# ---------------------------------------------------------------------------
# AI-data: shared Function/String authority, optional runtime brands, no VM.
# ---------------------------------------------------------------------------
ai_path = Path("src/ai-data-core.js")
ai = ai_path.read_text()
ai = replace_once(
    ai,
    'const vm =\n  require("node:vm");\n\n',
    "",
    "ai-data vm import",
)
ai = replace_once(
    ai,
    'const vmIsContext =\n  typeof vm.isContext === "function"\n    ? vm.isContext\n    : null;',
    'const vmIsContext =\n  runtimeAuthority.isVmContext;',
    "ai-data vm context",
)
ai = replace_once(
    ai,
    'const functionToString =\n  vm.runInNewContext(\n    "Function.prototype.toString"\n  );\n\nconst stringIncludes =\n  vm.runInNewContext(\n    "String.prototype.includes"\n  );',
    'const functionToString =\n  runtimeAuthority.consumerPrimordials.functionToString;\n\n'
    'const stringIncludes =\n  runtimeAuthority.consumerPrimordials.stringIncludes;',
    "ai-data shared string/function primordials",
)
ai = replace_once(
    ai,
    'const pristineWeakRefConstructor =\n  vm.runInNewContext(\n    "typeof WeakRef === \'function\' ? WeakRef : null"\n  );\n\nconst pristineFinalizationRegistryConstructor =\n  vm.runInNewContext(\n    "typeof FinalizationRegistry === \'function\' ? FinalizationRegistry : null"\n  );',
    'const pristineWeakRefConstructor =\n  runtimeAuthority.weakRefConstructor;\n\n'
    'const pristineFinalizationRegistryConstructor =\n  runtimeAuthority.finalizationRegistryConstructor;',
    "ai-data weak runtime constructors",
)
ai = replace_once(
    ai,
    '      reflectApply(\n        vmIsContext,\n        vm,\n        [value]\n      )',
    '      reflectApply(\n        vmIsContext,\n        undefined,\n        [value]\n      )',
    "ai-data vm context receiver",
)
write(str(ai_path), ai)

# ---------------------------------------------------------------------------
# Mutation Pack: use shared Function#toString.
# ---------------------------------------------------------------------------
mutation_path = Path("src/mutation-pack.js")
mutation = mutation_path.read_text()
mutation = replace_once(
    mutation,
    'const { runInNewContext } = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");\n\nconst functionToString = runInNewContext("Function.prototype.toString");',
    'const runtimeAuthority = require("./runtime-authority");\n\n'
    'const functionToString =\n  runtimeAuthority.consumerPrimordials.functionToString;',
    "mutation-pack vm removal",
)
write(str(mutation_path), mutation)

# ---------------------------------------------------------------------------
# M13 proposal boundary: keep all existing verification, source its primitives
# from the single shared runtime authority instead of node:vm.
# ---------------------------------------------------------------------------
proposal_path = Path("src/contract-protection-proposal.js")
proposal_text = proposal_path.read_text()
proposal_text = replace_once(
    proposal_text,
    'const { runInNewContext } = require("node:vm");\nconst runtimeAuthority = require("./runtime-authority");',
    'const runtimeAuthority = require("./runtime-authority");\n'
    'const consumerPrimordials = runtimeAuthority.consumerPrimordials;',
    "proposal vm import",
)
for old, new, label in [
    ('const pristineReflectApply = runInNewContext("Reflect.apply");',
     'const pristineReflectApply = consumerPrimordials.reflectApply;',
     'proposal reflectApply'),
    ('const pristineFunctionToString = runInNewContext("Function.prototype.toString");',
     'const pristineFunctionToString = consumerPrimordials.functionToString;',
     'proposal Function#toString'),
    ('const pristineGetOwnPropertyDescriptor = runInNewContext(\n    "Object.getOwnPropertyDescriptor"\n  );',
     'const pristineGetOwnPropertyDescriptor =\n    consumerPrimordials.getOwnPropertyDescriptor;',
     'proposal descriptor'),
    ('const pristineGetPrototypeOf = runInNewContext("Object.getPrototypeOf");',
     'const pristineGetPrototypeOf = consumerPrimordials.getPrototypeOf;',
     'proposal getPrototypeOf'),
    ('const pristinePromiseConstructorSource = runInNewContext(\n    "Function.prototype.toString.call(Promise)"\n  );',
     'const pristinePromiseConstructorSource =\n    consumerPrimordials.promiseConstructorSource;',
     'proposal Promise source'),
    ('const pristinePromiseThenSource = runInNewContext(\n    "Function.prototype.toString.call(Promise.prototype.then)"\n  );',
     'const pristinePromiseThenSource = consumerPrimordials.promiseThenSource;',
     'proposal Promise.then source'),
]:
    proposal_text = replace_once(proposal_text, old, new, label)
write(str(proposal_path), proposal_text)

# ---------------------------------------------------------------------------
# Permanent regressions: dynamic public exploit + static single-authority law.
# ---------------------------------------------------------------------------
test_path = Path("test/m13-review-remediation.test.js")
test_text = test_path.read_text()
marker = 'test("round9 preloaded vm replacement never executes through lazy runContractAttacks load", () => {'
if marker not in test_text:
    test_text += r'''


test("round9 preloaded vm replacement never executes through lazy runContractAttacks load", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const original = Object.getOwnPropertyDescriptor(vm, "runInNewContext");
    let poisonCalls = 0;
    Object.defineProperty(vm, "runInNewContext", {
      value: function runInNewContext() {
        poisonCalls += 1;
        throw new Error("poisoned lazy vm authority executed");
      },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    let publicFn;
    try {
      api = require(${JSON.stringify(indexPath)});
      if (poisonCalls !== 0) process.exitCode = 81;
      try { publicFn = api.runContractAttacks; }
      catch (error) {
        console.error(error && error.stack || error);
        process.exitCode = 82;
      }
      if (poisonCalls !== 0) process.exitCode = 83;
      if (typeof publicFn !== "function") process.exitCode = 84;
    } finally {
      Object.defineProperty(vm, "runInNewContext", original);
    }
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round9 runtime-authority is the sole node:vm authority consumer", () => {
  const fs = require("node:fs");
  const sourceDir = path.join(repoRoot, "src");
  const allowed = "runtime-authority.js";
  const offenders = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".js") || name === allowed) continue;
    const source = fs.readFileSync(path.join(sourceDir, name), "utf8");
    if (source.includes('require("node:vm")') || source.includes("runInNewContext")) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, []);
});
'''
write(str(test_path), test_text)

print("Applied centralized lazy-VM authority remediation and permanent regressions.")
