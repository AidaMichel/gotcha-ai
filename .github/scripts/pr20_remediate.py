from pathlib import Path


def replace_once(path, old, new, label):
    text = path.read_text()
    if new in text:
        return
    if text.count(old) != 1:
        raise SystemExit(f"{label} is missing or ambiguous")
    path.write_text(text.replace(old, new, 1))


package_authority = Path("src/package-authority.js")
replace_once(
    package_authority,
    '''const ObjectGetPrototypeOf = captureNativeDataFunction(
  ObjectConstructor,
  "getPrototypeOf",
  "function getPrototypeOf() { [native code] }"
);
const ObjectDefineProperty = captureNativeDataFunction(''',
    '''const ObjectGetPrototypeOf = captureNativeDataFunction(
  ObjectConstructor,
  "getPrototypeOf",
  "function getPrototypeOf() { [native code] }"
);
const ObjectSetPrototypeOf = captureNativeDataFunction(
  ObjectConstructor,
  "setPrototypeOf",
  "function setPrototypeOf() { [native code] }"
);
const ObjectDefineProperty = captureNativeDataFunction(''',
    "package Object.setPrototypeOf capture",
)
replace_once(
    package_authority,
    '''  typeof ObjectGetPrototypeOf === "function" &&
  typeof ObjectDefineProperty === "function" &&''',
    '''  typeof ObjectGetPrototypeOf === "function" &&
  typeof ObjectSetPrototypeOf === "function" &&
  typeof ObjectDefineProperty === "function" &&''',
    "package Object.setPrototypeOf mandatory authority",
)
replace_once(
    package_authority,
    '''  ObjectGetOwnPropertyDescriptor,
  ObjectGetPrototypeOf,
  ObjectDefineProperty,''',
    '''  ObjectGetOwnPropertyDescriptor,
  ObjectGetPrototypeOf,
  ObjectSetPrototypeOf,
  ObjectDefineProperty,''',
    "package Object.setPrototypeOf export",
)

runtime_authority = Path("src/runtime-authority.js")
replace_once(
    runtime_authority,
    '''    objectFreeze(value) { return value; },
    functionToString: null,''',
    '''    objectFreeze(value) { return value; },
    objectSetPrototypeOf: null,
    functionToString: null,''',
    "runtime unavailable Object.setPrototypeOf authority",
)
replace_once(
    runtime_authority,
    '''const exported = {
  objectFreeze: pristineObjectFreeze,
  functionToString: pristineFunctionToString,''',
    '''const exported = {
  objectFreeze: pristineObjectFreeze,
  objectSetPrototypeOf: packageAuthority.ObjectSetPrototypeOf,
  functionToString: pristineFunctionToString,''',
    "runtime Object.setPrototypeOf export",
)

source = Path("src/ai-data-core.js")
replace_once(
    source,
    '''const getPrototypeOf =
  Object.getPrototypeOf;

const ownKeys =''',
    '''const getPrototypeOf =
  Object.getPrototypeOf;

const setPrototypeOf =
  runtimeAuthority.objectSetPrototypeOf;

const ownKeys =''',
    "AI-data setPrototypeOf authority binding",
)
replace_once(
    source,
    '''function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {''',
    '''function captureRequiredUndiciProbe(
  constructorName,
  expectedConstructorLength,
  alternateExpectedConstructorLength,
  propertyName,
  kind,
  expectedLength,
  args
) {''',
    "Undici capture signature",
)
replace_once(
    source,
    '''    !hasExpectedCallableMetadata(
      constructor,
      constructorName,
      0
    ) ||''',
    '''    !(
      hasExpectedCallableMetadata(
        constructor,
        constructorName,
        expectedConstructorLength
      ) ||
      (
        alternateExpectedConstructorLength !== null &&
        hasExpectedCallableMetadata(
          constructor,
          constructorName,
          alternateExpectedConstructorLength
        )
      )
    ) ||''',
    "Undici constructor metadata",
)
replace_once(
    source,
    '''  return {
    constructor,
    method: callable,
    args
  };
}''',
    '''  return {
    constructor,
    prototype,
    method: callable,
    args
  };
}''',
    "Undici probe prototype retention",
)
replace_once(
    source,
    '''const headersBrandProbe =
  captureRequiredUndiciProbe(
    "Headers",
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const additionalHostBrandMethodAuthorityAvailable =
  !undiciRuntimeExpected ||
  (
    undiciHostBrandAuthorityAvailable &&
    headersBrandProbe !== null
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    headersBrandProbe === null
      ? []
      : [headersBrandProbe]
  );''',
    '''const headersBrandProbe =
  captureRequiredUndiciProbe(
    "Headers",
    0,
    null,
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const formDataBrandProbe =
  captureRequiredUndiciProbe(
    "FormData",
    0,
    1,
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const requestBrandProbe =
  captureRequiredUndiciProbe(
    "Request",
    1,
    null,
    "url",
    "getter",
    0,
    []
  );

const responseBrandProbe =
  captureRequiredUndiciProbe(
    "Response",
    0,
    null,
    "status",
    "getter",
    0,
    []
  );

const additionalHostBrandMethodAuthorityAvailable =
  !undiciRuntimeExpected ||
  (
    undiciHostBrandAuthorityAvailable &&
    headersBrandProbe !== null &&
    formDataBrandProbe !== null &&
    requestBrandProbe !== null &&
    responseBrandProbe !== null &&
    typeof setPrototypeOf === "function"
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    !additionalHostBrandMethodAuthorityAvailable ||
    !undiciRuntimeExpected
      ? []
      : [
          headersBrandProbe,
          formDataBrandProbe,
          requestBrandProbe,
          responseBrandProbe
        ]
  );''',
    "Undici probe set",
)
replace_once(
    source,
    '''function probeAdditionalHostBrand(
  probe,
  value
) {
  try {
    reflectApply(
      probe.method,
      value,
      probe.args
    );

    return true;
  } catch {}

  let previousHasInstanceDescriptor;''',
    '''function probeAdditionalHostBrand(
  probe,
  value
) {
  try {
    reflectApply(
      probe.method,
      value,
      probe.args
    );

    return true;
  } catch {}

  if (typeof setPrototypeOf !== "function") {
    throw hostBrandAuthorityError();
  }

  let originalPrototype;

  try {
    originalPrototype =
      getPrototypeOf(value);
  } catch {
    throw hostBrandAuthorityError();
  }

  let prototypeInstalled = false;

  try {
    reflectApply(
      setPrototypeOf,
      undefined,
      [value, probe.prototype]
    );
    prototypeInstalled = true;

    try {
      reflectApply(
        probe.method,
        value,
        probe.args
      );

      return true;
    } catch {}
  } catch {}
  finally {
    if (prototypeInstalled) {
      try {
        reflectApply(
          setPrototypeOf,
          undefined,
          [value, originalPrototype]
        );
      } catch {
        throw hostBrandAuthorityError();
      }

      let restoredPrototype;

      try {
        restoredPrototype =
          getPrototypeOf(value);
      } catch {
        throw hostBrandAuthorityError();
      }

      if (restoredPrototype !== originalPrototype) {
        throw hostBrandAuthorityError();
      }
    }
  }

  let previousHasInstanceDescriptor;''',
    "authenticated Undici prototype restoration probe",
)

test = Path("test/m8-pr20-late-undici.test.js")
test.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const aiDataPath = path.resolve(__dirname, "../src/ai-data.js");

function runIsolated(source) {
  const child = spawnSync(process.execPath, ["-e", source], { encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr || child.stdout);
}

for (const name of ["Headers", "FormData", "Request", "Response"]) {
  test(`prototype-rewritten ${name} with nested own data fails closed`, () => {
    runIsolated(`
      "use strict";
      const assert = require("node:assert/strict");
      const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
      const Constructor = globalThis[${JSON.stringify(name)}];
      if (typeof Constructor !== "function") process.exit(0);
      let value;
      if (${JSON.stringify(name)} === "Request") value = new Constructor("https://example.com/");
      else if (${JSON.stringify(name)} === "Response") value = new Constructor("ok");
      else value = new Constructor();
      value.foo = { nested: true };
      Object.setPrototypeOf(value, Object.prototype);
      const rewrittenPrototype = Object.getPrototypeOf(value);
      assert.throws(() => cloneAiData(value), /unsupported runtime object/);
      assert.equal(Object.getPrototypeOf(value), rewrittenPrototype);
    `);
  });
}

test("ordinary nested data remains cloneable and is not mistaken for an Undici brand", () => {
  const { cloneAiData } = require(aiDataPath);
  const value = { foo: { nested: true, list: [1, { ok: "yes" }] } };
  assert.deepEqual(cloneAiData(value), value);
});

test("unsafe nested accessors are rejected without getter execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    let getterCalls = 0;
    const nested = {};
    Object.defineProperty(nested, "danger", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("getter executed");
      }
    });
    assert.throws(() => cloneAiData({ nested }));
    assert.equal(getterCalls, 0);
  `);
});
''')
