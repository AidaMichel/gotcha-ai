from pathlib import Path


def replace_between(text, start, end, replacement, label):
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"missing start marker for {label}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"missing end marker for {label}")
    end_index += len(end)
    return text[:start_index] + replacement + text[end_index:]


runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

runtime = replace_between(
    runtime,
    "function bootstrapBuiltinModule(modulePath, rejectIfAlreadyLoaded) {",
    'const hasFreshVmAuthority = typeof runInNewContext === "function";',
    '''function bootstrapFreshBuiltinModule(modulePath) {
  // Builtin module exports are mutable. A preloaded builtin cannot be
  // authenticated without invoking authority that may itself be poisoned, so
  // use it only when this module is the first code to load it.
  if (bootstrapBuiltinWasLoaded(modulePath)) return null;
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

const vmModule = bootstrapFreshBuiltinModule("node:vm");
const runInNewContext = bootstrapOwnDataValue(vmModule, "runInNewContext");
const hasFreshVmAuthority = typeof runInNewContext === "function";''',
    "fresh vm bootstrap",
)

runtime = runtime.replace(
    '''const pristineObjectToString = hasFreshVmAuthority
  ? runInNewContext("Object.prototype.toString")
  : packageAuthority.ObjectToString;
''',
    "",
    1,
)

runtime = replace_between(
    runtime,
    "const supportedSetFlagsFromStringSource =",
    "function loadModuleUtilTypesAuthority() {",
    "function loadModuleUtilTypesAuthority() {",
    "remove V8 flag fallback",
)

runtime = replace_between(
    runtime,
    "let isProxy = unavailableProxyProbe;",
    "// Node 14 has no util/types module.",
    '''let isProxy = unavailableProxyProbe;
const namedNativeIsProxy = captureNamedNativeIsProxy();
if (typeof namedNativeIsProxy === "function") {
  isProxy = function isProxy(value) {
    try {
      return pristineReflectApply(namedNativeIsProxy, undefined, [value]) === true;
    } catch {
      return true;
    }
  };
}

// Node 14 has no util/types module.''',
    "proxy authority without V8 recovery",
)

runtime = replace_between(
    runtime,
    "function tagProbe(tag) {",
    "const weakMapKey = {};",
    '''function tagProbe() {
  // Object.prototype.toString reads Symbol.toStringTag and can execute an
  // attacker-controlled getter. If the authenticated native brand probe is
  // unavailable, fail closed without touching the boundary value.
  return unavailableBrandProbe;
}

const weakMapKey = {};''',
    "trap-free brand fallback",
)

for forbidden in ("getBuiltinModule", "setFlagsFromString", "node:v8", "pristineObjectToString"):
    if forbidden in runtime:
        raise SystemExit(f"round8 runtime still contains forbidden bootstrap path: {forbidden}")

runtime_path.write_text(runtime)


index_path = Path("src/index.js")
index = index_path.read_text()
index = replace_between(
    index,
    "const authorityRootModulePaths = [",
    'const packageAuthority = require("./package-authority");',
    'const packageAuthority = require("./package-authority");',
    "remove pre-authority cache eviction",
)
if "new Set" in index or "authorityRootModulePaths" in index:
    raise SystemExit("round8 index still contains pre-authority Set/cache traversal")
index_path.write_text(index)


provider_path = Path("src/provider-adapter-m13.js")
provider = provider_path.read_text()
old_nonconfig = '''  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.configurable !== true
  ) {
    if (constructorDescriptorIsTrusted(constructorDescriptor)) {
      reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
      return;
    }
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
'''
new_nonconfig = '''  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.configurable !== true
  ) {
    // The transport Promise cannot receive the mandatory temporary constructor
    // shield. Consume a recognized rejection when safe, then reject the
    // provider boundary regardless of fulfillment state.
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
'''
if old_nonconfig not in provider:
    raise SystemExit("missing provider non-configurable observation branch")
provider = provider.replace(old_nonconfig, new_nonconfig, 1)

old_nonextensible = '''  if (
    constructorDescriptor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!inheritedConstructorUsesSafeDefaultSpecies(promise)) throw boundaryError();
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
'''
new_nonextensible = '''  if (
    constructorDescriptor === undefined &&
    isExtensible(promise) !== true
  ) {
    // No own constructor can be installed, so this value is unshieldable.
    // Consume safely if possible and always fail the boundary.
    consumeRejectedRecognizedPromise(promise);
    throw boundaryError();
  }
'''
if old_nonextensible not in provider:
    raise SystemExit("missing provider non-extensible observation branch")
provider = provider.replace(old_nonextensible, new_nonextensible, 1)
provider_path.write_text(provider)


test_path = Path("test/m13-review-remediation.test.js")
tests = test_path.read_text()
marker = 'test("round8 source-identical V8 setter replacement is never executed", () => {'
if marker not in tests:
    tests += r'''


test("round8 source-identical V8 setter replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const v8 = require("node:v8");
    const original = Object.getOwnPropertyDescriptor(v8, "setFlagsFromString");
    let calls = 0;
    const replacement = Function(
      "validateString",
      "_setFlagsFromString",
      "return function setFlagsFromString(flags) {\\n" +
      "  validateString(flags, 'flags');\\n" +
      "  _setFlagsFromString(flags);\\n" +
      "}"
    )(
      function validateString() {},
      function _setFlagsFromString() { calls += 1; }
    );
    Object.defineProperty(v8, "setFlagsFromString", {
      value: replacement,
      writable: true,
      enumerable: true,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(v8, "setFlagsFromString", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 2;
    if (calls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 process.getBuiltinModule replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const original = Object.getOwnPropertyDescriptor(process, "getBuiltinModule");
    if (!original || typeof original.value !== "function") process.exit(0);
    let calls = 0;
    Object.defineProperty(process, "getBuiltinModule", {
      value: function getBuiltinModule() { calls += 1; return null; },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(process, "getBuiltinModule", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 4;
    if (calls !== 0) process.exitCode = 5;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 preloaded vm data replacement is never executed", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const vm = require("node:vm");
    const original = Object.getOwnPropertyDescriptor(vm, "runInNewContext");
    let calls = 0;
    Object.defineProperty(vm, "runInNewContext", {
      value: function runInNewContext() { calls += 1; throw new Error("poison vm"); },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { Object.defineProperty(vm, "runInNewContext", original); }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 6;
    if (calls !== 0) process.exitCode = 7;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 fallback brand checks never invoke Symbol.toStringTag getters", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    let types;
    try { types = require("node:util/types"); }
    catch { types = require("node:util").types; }
    const original = Object.getOwnPropertyDescriptor(types, "isDate");
    Object.defineProperty(types, "isDate", {
      value: function isDate() { return false; },
      writable: true,
      enumerable: true,
      configurable: true
    });
    const api = require(${JSON.stringify(indexPath)});
    Object.defineProperty(types, "isDate", original);
    let tagCalls = 0;
    const value = {};
    Object.defineProperty(value, Symbol.toStringTag, {
      get() { tagCalls += 1; throw new Error("toStringTag getter executed"); },
      configurable: true
    });
    Promise.resolve(api.generateContractProtectionProposal(value)).catch(() => {}).then(() => {
      if (tagCalls !== 0) process.exitCode = 8;
    });
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 package bootstrap never invokes ambient Set replacement", () => {
  const indexPath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeSet = Set;
    let calls = 0;
    function PoisonSet(iterable) { calls += 1; return new NativeSet(iterable); }
    PoisonSet.prototype = NativeSet.prototype;
    globalThis.Set = PoisonSet;
    let api;
    try { api = require(${JSON.stringify(indexPath)}); }
    finally { globalThis.Set = NativeSet; }
    if (!api || typeof api.generateContractProtectionProposal !== "function") process.exitCode = 9;
    if (calls !== 0) process.exitCode = 10;
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("round8 provider consumes then rejects unshieldable fulfilled transport Promises", async () => {
  const { createStructuredProviderAdapter } = require("../src");
  const instructions =
    "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
    "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
    "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
    "The protection statement must describe what the quality system should enforce.\n" +
    "The rationale must explain why this protection addresses the selected survivor.";
  const request = {
    task: "Return the approved time.",
    case: { input: {}, expectedOutput: {} },
    source: { attackId: "wrong-time", ruleId: "time-rule" },
    rule: { id: "time-rule", statement: "Time must be 3 PM.", kind: "required", severity: "major" },
    attack: {
      id: "wrong-time", ruleId: "time-rule", type: "wrong-time",
      description: "Changes the approved time.", rationale: "Violates the confirmed rule.", output: {}
    },
    instructions
  };

  for (const mode of ["non-configurable", "non-extensible"]) {
    const adapter = createStructuredProviderAdapter({
      mode: "contract-protection",
      model: "x",
      transport() {
        const promise = Promise.resolve({
          version: 1,
          kind: "gotcha-provider-response",
          output: proposal()
        });
        if (mode === "non-configurable") {
          Object.defineProperty(promise, "constructor", {
            value: Promise,
            writable: false,
            enumerable: false,
            configurable: false
          });
        } else {
          Object.preventExtensions(promise);
        }
        return promise;
      }
    });
    await assert.rejects(adapter(request), TypeError, mode);
  }
});
'''

test_path.write_text(tests)

print("Applied M13 Codex Round-8 remediation and regressions.")
