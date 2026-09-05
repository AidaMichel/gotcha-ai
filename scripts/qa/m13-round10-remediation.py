#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"missing patch anchor in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1))


# 1) Keep package authority loadable even when a non-root primordial is rejected.
path = Path("src/package-authority.js")
text = path.read_text()
old = '''if (mandatoryAuthorityAvailable !== true) {
  // `null` is intentionally immutable authority absence. Consumers either
  // propagate that absence or the package root substitutes fail-closed public
  // boundaries without invoking the rejected primordial.
  module.exports = null;
} else {
  const authority = {
    GetOwnPropertyDescriptor,
    PromiseConstructor,
    PromisePrototype,
    PromiseThen,
    PromiseSpeciesGetter,
    ArrayConstructor,
    ArrayIsArray,
    FunctionConstructor,
    TypeErrorConstructor,
    BufferConstructor,
    ReflectApply,
    ObjectGetPrototypeOf,
    ObjectDefineProperty,
    ObjectFreeze,
    ObjectToString,
    FunctionToString,
    StringStartsWith,
    ArrayBufferIsView,
    DataViewByteLengthGetter,
    WeakMapHas,
    WeakSetHas,
    NumberValueOf,
    StringValueOf,
    BooleanValueOf,
    BigIntValueOf,
    SymbolValueOf,
    SymbolSpecies
  };

  module.exports = bootstrapReflectApply(
    ObjectFreeze,
    undefined,
    [authority]
  );
}
'''
new = '''const authority = {
  available: mandatoryAuthorityAvailable === true,
  GetOwnPropertyDescriptor,
  PromiseConstructor,
  PromisePrototype,
  PromiseThen,
  PromiseSpeciesGetter,
  ArrayConstructor,
  ArrayIsArray,
  FunctionConstructor,
  TypeErrorConstructor,
  BufferConstructor,
  ReflectApply,
  ObjectGetPrototypeOf,
  ObjectDefineProperty,
  ObjectFreeze,
  ObjectToString,
  FunctionToString,
  StringStartsWith,
  ArrayBufferIsView,
  DataViewByteLengthGetter,
  WeakMapHas,
  WeakSetHas,
  NumberValueOf,
  StringValueOf,
  BooleanValueOf,
  BigIntValueOf,
  SymbolValueOf,
  SymbolSpecies
};

// Authority absence is represented by a stable data object, not `null`. The
// package root can therefore expose its predeclared fail-closed API without any
// consumer dereferencing a missing authority record. Never invoke a rejected
// non-root primordial merely to freeze the unavailable record.
module.exports = mandatoryAuthorityAvailable === true
  ? bootstrapReflectApply(ObjectFreeze, undefined, [authority])
  : authority;
'''
if old not in text:
    raise SystemExit("package-authority final authority block changed")
path.write_text(text.replace(old, new, 1))

# 2) Runtime authority must short-circuit cleanly when package authority is absent.
path = Path("src/runtime-authority.js")
text = path.read_text()
old = '''"use strict";

const packageAuthority = require("./package-authority");
const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;
'''
new = '''"use strict";

const packageAuthority = require("./package-authority");

if (
  packageAuthority === null ||
  typeof packageAuthority !== "object" ||
  packageAuthority.available !== true
) {
  // Stable fail-closed authority shape. Package-root lazy getters inspect only
  // these fields and therefore never load a rejected host graph.
  module.exports = {
    consumerPrimordialsAvailable: false,
    consumerPrimordials: null,
    promiseAuthorityAvailable: false,
    promiseConstructor: null,
    promisePrototype: null,
    promiseThen: null,
    promiseSpecies: null,
    canLoadMutableBuiltinGraph() { return false; }
  };
} else {
const bootstrapGetOwnPropertyDescriptor =
  packageAuthority.GetOwnPropertyDescriptor;
'''
if old not in text:
    raise SystemExit("runtime-authority opening anchor changed")
text = text.replace(old, new, 1)
if not text.rstrip().endswith(");"):
    raise SystemExit("unexpected runtime-authority ending")
text = text.rstrip() + "\n}\n"
path.write_text(text)

# Insert exact host-origin authentication + mutable-builtin preflight after
# isProxy has been established and before any legacy Node-14 fallback.
path = Path("src/runtime-authority.js")
text = path.read_text()
anchor = '''// Node 14 has no util/types module. Only after trap-free proxy authority exists
// may we consult its legacy util binding for optional native brand probes.
'''
helper = r'''function inspectorHasNodeInternalFunctionOrigin(candidate, expectedEmbedderName) {
  if (
    typeof candidate !== "function" ||
    typeof expectedEmbedderName !== "string" ||
    expectedEmbedderName === "" ||
    isProxy(candidate)
  ) return false;

  let inspectorModule;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    return false;
  }

  const SessionConstructor = bootstrapOwnDataValue(inspectorModule, "Session");
  const sessionPrototype = bootstrapOwnDataValue(SessionConstructor, "prototype");
  const connect = bootstrapOwnDataValue(sessionPrototype, "connect");
  const disconnect = bootstrapOwnDataValue(sessionPrototype, "disconnect");
  const post = bootstrapOwnDataValue(sessionPrototype, "post");
  if (
    typeof SessionConstructor !== "function" ||
    typeof connect !== "function" ||
    typeof disconnect !== "function" ||
    typeof post !== "function" ||
    typeof pristineDefineProperty !== "function" ||
    typeof pristineReflectDeleteProperty !== "function"
  ) return false;

  let session;
  try {
    session = new SessionConstructor();
  } catch {
    return false;
  }

  // `on` lives on EventEmitter.prototype. Find it descriptor-by-descriptor so
  // an accessor-backed inherited replacement is rejected without execution.
  let eventPrototype = sessionPrototype;
  let on = null;
  for (let depth = 0; depth < 8 && eventPrototype !== null; depth += 1) {
    let descriptor;
    try {
      descriptor = pristineReflectApply(
        pristineGetOwnPropertyDescriptor,
        undefined,
        [eventPrototype, "on"]
      );
    } catch {
      return false;
    }
    if (descriptor !== undefined) {
      if (
        "get" in descriptor ||
        "set" in descriptor ||
        typeof descriptor.value !== "function" ||
        isProxy(descriptor.value)
      ) return false;
      on = descriptor.value;
      break;
    }
    try {
      eventPrototype = pristineReflectApply(
        pristineGetPrototypeOf,
        undefined,
        [eventPrototype]
      );
    } catch {
      return false;
    }
  }
  if (typeof on !== "function") return false;

  const key = "__gotchaRuntimeBuiltinLoaderCandidate__";
  let existingDescriptor;
  try {
    existingDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [globalThis, key]
    );
  } catch {
    return false;
  }
  if (existingDescriptor !== undefined) return false;

  const scriptMeta = [];
  function onScriptParsed(message) {
    const params = message && message.params;
    if (
      params !== null &&
      typeof params === "object" &&
      typeof params.scriptId === "string"
    ) {
      scriptMeta[scriptMeta.length] = {
        scriptId: params.scriptId,
        url: params.url,
        embedderName: params.embedderName
      };
    }
  }

  let connected = false;
  let installed = false;
  try {
    pristineReflectApply(pristineDefineProperty, undefined, [
      globalThis,
      key,
      {
        value: candidate,
        writable: false,
        enumerable: false,
        configurable: true
      }
    ]);
    installed = true;

    pristineReflectApply(connect, session, []);
    connected = true;
    pristineReflectApply(on, session, ["Debugger.scriptParsed", onScriptParsed]);

    let enableCalled = false;
    let enableError = null;
    pristineReflectApply(post, session, [
      "Debugger.enable",
      {},
      function gotchaDebuggerEnableCallback(error) {
        enableCalled = true;
        enableError = error;
      }
    ]);
    if (enableCalled !== true || enableError !== null) return false;

    let evaluateCalled = false;
    let evaluateError = null;
    let evaluateResult = null;
    pristineReflectApply(post, session, [
      "Runtime.evaluate",
      {
        expression: "globalThis.__gotchaRuntimeBuiltinLoaderCandidate__",
        generatePreview: false,
        returnByValue: false
      },
      function gotchaBuiltinLoaderEvaluateCallback(error, result) {
        evaluateCalled = true;
        evaluateError = error;
        evaluateResult = result;
      }
    ]);
    if (
      evaluateCalled !== true ||
      evaluateError !== null ||
      evaluateResult === null ||
      typeof evaluateResult !== "object" ||
      evaluateResult.result === null ||
      typeof evaluateResult.result !== "object" ||
      typeof evaluateResult.result.objectId !== "string"
    ) return false;

    let propertiesCalled = false;
    let propertiesError = null;
    let propertiesResult = null;
    pristineReflectApply(post, session, [
      "Runtime.getProperties",
      {
        objectId: evaluateResult.result.objectId,
        ownProperties: true,
        generatePreview: false
      },
      function gotchaBuiltinLoaderPropertiesCallback(error, result) {
        propertiesCalled = true;
        propertiesError = error;
        propertiesResult = result;
      }
    ]);
    if (
      propertiesCalled !== true ||
      propertiesError !== null ||
      propertiesResult === null ||
      typeof propertiesResult !== "object" ||
      propertiesResult.internalProperties === null ||
      typeof propertiesResult.internalProperties !== "object"
    ) return false;

    let scriptId = null;
    for (
      let index = 0;
      index < propertiesResult.internalProperties.length;
      index += 1
    ) {
      const entry = propertiesResult.internalProperties[index];
      if (
        entry !== null &&
        typeof entry === "object" &&
        entry.name === "[[FunctionLocation]]" &&
        entry.value !== null &&
        typeof entry.value === "object" &&
        entry.value.value !== null &&
        typeof entry.value.value === "object" &&
        typeof entry.value.value.scriptId === "string"
      ) {
        scriptId = entry.value.value.scriptId;
        break;
      }
    }
    if (scriptId === null) return false;

    for (let index = 0; index < scriptMeta.length; index += 1) {
      const meta = scriptMeta[index];
      if (
        meta.scriptId === scriptId &&
        meta.url === expectedEmbedderName &&
        meta.embedderName === expectedEmbedderName
      ) return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    if (connected) {
      try { pristineReflectApply(disconnect, session, []); } catch {}
    }
    if (installed) {
      try {
        pristineReflectApply(
          pristineReflectDeleteProperty,
          undefined,
          [globalThis, key]
        );
      } catch {}
    }
  }
}

const builtinLoaderSource =
  "function getBuiltinModule(id) {\n" +
  "  validateString(id, 'id');\n" +
  "  const normalizedId = BuiltinModule.normalizeRequirableId(id);\n" +
  "  return normalizedId ? require(normalizedId) : undefined;\n" +
  "}";

let authenticatedGetBuiltinModule = null;
let nodeMajorVersion = null;
try {
  const versions = bootstrapOwnDataValue(process, "versions");
  const nodeVersion = bootstrapOwnDataValue(versions, "node");
  if (typeof nodeVersion === "string") {
    let majorText = "";
    for (let index = 0; index < nodeVersion.length; index += 1) {
      const character = nodeVersion[index];
      if (character === ".") break;
      if (character < "0" || character > "9") {
        majorText = "";
        break;
      }
      majorText += character;
    }
    if (majorText !== "") nodeMajorVersion = Number(majorText);
  }

  const candidate = bootstrapOwnDataValue(process, "getBuiltinModule");
  const source = typeof candidate === "function"
    ? pristineReflectApply(pristineFunctionToString, candidate, [])
    : null;
  if (
    nodeMajorVersion !== null &&
    nodeMajorVersion >= 20 &&
    typeof candidate === "function" &&
    source === builtinLoaderSource &&
    pristineReflectApply(
      pristineGetPrototypeOf,
      undefined,
      [candidate]
    ) === localFunctionPrototype &&
    inspectorHasNodeInternalFunctionOrigin(
      candidate,
      "node:internal/modules/helpers"
    )
  ) {
    authenticatedGetBuiltinModule = candidate;
  }
} catch {
  authenticatedGetBuiltinModule = null;
}

function canLoadMutableBuiltinGraph() {
  // Node 14/16/18 do not expose process.getBuiltinModule and do not use the
  // modern builtin sync-exports path implicated by the Node 20+ regression.
  if (
    nodeMajorVersion !== null &&
    nodeMajorVersion < 20
  ) return true;

  if (typeof authenticatedGetBuiltinModule !== "function") return false;

  try {
    const utilModule = pristineReflectApply(
      authenticatedGetBuiltinModule,
      undefined,
      ["node:util"]
    );
    if (
      utilModule === null ||
      typeof utilModule !== "object" ||
      isProxy(utilModule)
    ) return false;
    const descriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [utilModule, "types"]
    );
    return (
      descriptor !== undefined &&
      !("get" in descriptor) &&
      !("set" in descriptor) &&
      descriptor.value === utilTypesAuthority &&
      descriptor.value !== null &&
      typeof descriptor.value === "object" &&
      !isProxy(descriptor.value)
    );
  } catch {
    return false;
  }
}

'''
if anchor not in text:
    raise SystemExit("runtime-authority isProxy insertion anchor changed")
text = text.replace(anchor, helper + anchor, 1)

# Export the preflight.
old = '''  hasTrustedLocalPromiseSpecies
};
'''
new = '''  hasTrustedLocalPromiseSpecies,
  canLoadMutableBuiltinGraph
};
'''
if old not in text:
    raise SystemExit("runtime-authority export anchor changed")
text = text.replace(old, new, 1)
path.write_text(text)

# 3) Gate lazy M8 graph before any host builtin graph can be loaded.
path = Path("src/contract-attacks-core.js")
replace_once(
    path,
    '''  if (!m8DependencyAuthorityAvailable) return;

  try {
''',
    '''  if (
    !m8DependencyAuthorityAvailable ||
    typeof runtimeAuthority.canLoadMutableBuiltinGraph !== "function" ||
    runtimeAuthority.canLoadMutableBuiltinGraph() !== true
  ) return;

  try {
'''
)

# 4) Gate deferred M11 legacy adapter graph at the same seam.
path = Path("src/provider-adapter-m13.js")
replace_once(
    path,
    '''  if (
    !promiseAuthorityAvailable ||
    !legacyTypeErrorAuthorityAvailable
  ) {
    return null;
  }

  try {
''',
    '''  if (
    !promiseAuthorityAvailable ||
    !legacyTypeErrorAuthorityAvailable ||
    typeof runtimeAuthority.canLoadMutableBuiltinGraph !== "function" ||
    runtimeAuthority.canLoadMutableBuiltinGraph() !== true
  ) {
    return null;
  }

  try {
'''
)

# 5) Make the bootstrap TCB normative so the same-realm guarantee is honest.
path = Path("docs/M13_PROTECTION_PROPOSALS_SPEC.md")
replace_once(
    path,
    '''## 5. Captured boundary authority

At M13 module initialization, before any public invocation or generator execution, M13 captures every primitive used for public boundary classification, capture, projection, Promise observation, and candidate validation.
''',
    '''## 5. Captured boundary authority

The same-realm bootstrap trust boundary is defined normatively in
`docs/BOOTSTRAP_TRUST_MODEL.md`. The package is not a same-process sandbox: the
module-local CommonJS loader plus the minimal reflection roots named there are
the trusted computing base required to inspect descriptors without invoking
accessors and to authenticate every later callable. Pre-first-load code that
has already replaced those roots has process-equivalent authority and is
outside this poisoning guarantee. No other ambient primitive or Node builtin
export receives that exemption.

At M13 module initialization, before any public invocation or generator execution, M13 captures every primitive used for public boundary classification, capture, projection, Promise observation, and candidate validation.
'''
)

# 6) Permanent invocation-level regressions for the two lazy Codex findings and
# source-identical forged loader protection.
path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
marker = 'test("round10 lazy M8 and legacy graphs never execute poisoned util.types",'
if marker not in text:
    text += r'''

test("round10 lazy M8 and legacy graphs never execute poisoned util.types", () => {
  const script = String.raw`
    const util = require("node:util");
    const original = Object.getOwnPropertyDescriptor(util, "types");
    if (!original || original.configurable !== true) process.exit(0);
    let getterCalls = 0;
    Object.defineProperty(util, "types", {
      configurable: true,
      enumerable: original.enumerable,
      get() {
        getterCalls += 1;
        throw new Error("poison util.types executed");
      }
    });

    const api = require("./src");

    Promise.resolve(api.runContractAttacks({})).catch(() => undefined).then(() => {
      for (const mode of ["quality-contract", "contract-attacks"]) {
        try {
          api.createStructuredProviderAdapter({
            mode,
            transport() { throw new Error("transport must not run"); }
          });
        } catch {}
      }
      if (getterCalls !== 0) {
        console.error("util.types getter calls", getterCalls);
        process.exit(91);
      }
      Object.defineProperty(util, "types", original);
      console.log("round10-lazy-util-safe");
    });
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.match(child.stdout, /round10-lazy-util-safe/);
});

test("round10 source-identical getBuiltinModule replacement is never invoked", () => {
  const script = String.raw`
    const descriptor = Object.getOwnPropertyDescriptor(process, "getBuiltinModule");
    if (!descriptor || typeof descriptor.value !== "function" || descriptor.configurable !== true) {
      console.log("round10-loader-not-applicable");
      process.exit(0);
    }
    let calls = 0;
    function getBuiltinModule(id) {
      calls += 1;
      return descriptor.value(id);
    }
    Object.defineProperty(process, "getBuiltinModule", {
      value: getBuiltinModule,
      writable: descriptor.writable,
      enumerable: descriptor.enumerable,
      configurable: true
    });
    const api = require("./src");
    Promise.resolve(api.runContractAttacks({})).catch(() => undefined).then(() => {
      try {
        api.createStructuredProviderAdapter({ mode: "quality-contract", transport() {} });
      } catch {}
      if (calls !== 0) {
        console.error("forged loader calls", calls);
        process.exit(92);
      }
      Object.defineProperty(process, "getBuiltinModule", descriptor);
      console.log("round10-forged-loader-safe");
    });
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 15000
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  assert.match(child.stdout, /round10-(?:forged-loader-safe|loader-not-applicable)/);
});
'''
    path.write_text(text)

print("Round10 remediation staged")
