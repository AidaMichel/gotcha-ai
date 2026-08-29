from pathlib import Path

runtime = Path("src/ai-data-core.js")
text = runtime.read_text()

old_capture = '''function captureGlobalConstructor(
  name
) {
  const value =
    globalThis[name];

  return (
    typeof value === "function"
  )
    ? value
    : null;
}
'''
new_capture = '''function captureGlobalConstructor(
  name
) {
  let value;

  try {
    value = globalThis[name];
  } catch {
    return null;
  }

  return (
    typeof value === "function" &&
    !utilTypePredicates.isProxy(value)
  )
    ? value
    : null;
}

function globalConstructorRequiresAuthority(
  name
) {
  try {
    return typeof globalThis[name] ===
      "function";
  } catch {
    return true;
  }
}
'''
if old_capture not in text:
    raise SystemExit("captureGlobalConstructor block not found")
text = text.replace(old_capture, new_capture, 1)

old_probes = '''const additionalHostBrandMethodProbes =
  objectFreeze(
    [
      {
        constructor:
          captureGlobalConstructor(
            "Headers"
          ),
        method:
          capturePrototypeMethod(
            captureGlobalConstructor(
              "Headers"
            ),
            "get"
          ),
        args: [
          "__gotcha_brand_probe__"
        ]
      },
      {
        constructor:
          captureGlobalConstructor(
            "FormData"
          ),
        method:
          capturePrototypeMethod(
            captureGlobalConstructor(
              "FormData"
            ),
            "get"
          ),
        args: [
          "__gotcha_brand_probe__"
        ]
      }
    ].filter(
      (probe) =>
        probe.constructor !== null &&
        probe.method !== null
    )
  );
'''
new_probes = '''const headersConstructor =
  captureGlobalConstructor("Headers");

const formDataConstructor =
  captureGlobalConstructor("FormData");

const headersBrandMethod =
  capturePrototypeMethod(
    headersConstructor,
    "get"
  );

const formDataBrandMethod =
  capturePrototypeMethod(
    formDataConstructor,
    "get"
  );

const additionalHostBrandAuthorityAvailable =
  (
    !globalConstructorRequiresAuthority(
      "Headers"
    ) ||
    (
      headersConstructor !== null &&
      headersBrandMethod !== null
    )
  ) &&
  (
    !globalConstructorRequiresAuthority(
      "FormData"
    ) ||
    (
      formDataConstructor !== null &&
      formDataBrandMethod !== null
    )
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    [
      {
        constructor: headersConstructor,
        method: headersBrandMethod,
        args: [
          "__gotcha_brand_probe__"
        ]
      },
      {
        constructor: formDataConstructor,
        method: formDataBrandMethod,
        args: [
          "__gotcha_brand_probe__"
        ]
      }
    ].filter(
      (probe) =>
        probe.constructor !== null &&
        probe.method !== null
    )
  );
'''
if old_probes not in text:
    raise SystemExit("additionalHostBrandMethodProbes block not found")
text = text.replace(old_probes, new_probes, 1)

marker = '''function probeAdditionalHostBrand(
  probe,
  value
) {
'''
helper = '''function samePropertyDescriptor(
  left,
  right
) {
  if (
    left === undefined ||
    right === undefined
  ) {
    return left === right;
  }

  const leftKeys = ownKeys(left);
  const rightKeys = ownKeys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (
    let index = 0;
    index < leftKeys.length;
    index += 1
  ) {
    const key = leftKeys[index];
    let found = false;

    for (
      let rightIndex = 0;
      rightIndex < rightKeys.length;
      rightIndex += 1
    ) {
      if (rightKeys[rightIndex] === key) {
        found = true;
        break;
      }
    }

    if (
      !found ||
      !objectIs(left[key], right[key])
    ) {
      return false;
    }
  }

  return true;
}

function hostBrandAuthorityError() {
  return new Error(
    "Host brand probe authority is unavailable."
  );
}

function assertHostBrandAuthorityRestored(
  probe,
  expectedDescriptor
) {
  let currentDescriptor;

  try {
    currentDescriptor =
      getOwnPropertyDescriptor(
        probe.constructor,
        symbolHasInstance
      );
  } catch {
    throw hostBrandAuthorityError();
  }

  if (
    !samePropertyDescriptor(
      currentDescriptor,
      expectedDescriptor
    )
  ) {
    throw hostBrandAuthorityError();
  }
}

'''
if marker not in text:
    raise SystemExit("probeAdditionalHostBrand marker not found")
text = text.replace(marker, helper + marker, 1)

text = text.replace(
'''  } catch {
    return false;
  }

  if (
    previousHasInstanceDescriptor !==
      undefined &&
    !previousHasInstanceDescriptor.configurable
  ) {
    return false;
  }
''',
'''  } catch {
    throw hostBrandAuthorityError();
  }

  if (
    previousHasInstanceDescriptor !==
      undefined &&
    !previousHasInstanceDescriptor.configurable
  ) {
    throw hostBrandAuthorityError();
  }
''',
1,
)

text = text.replace(
'''  } catch {
    return false;
  } finally {
    if (installed) {
      if (
        previousHasInstanceDescriptor ===
          undefined
      ) {
        if (
          !deleteProperty(
            probe.constructor,
            symbolHasInstance
          )
        ) {
          throw new Error(
            "Failed to restore host brand probe authority."
          );
        }
      } else {
        defineProperty(
          probe.constructor,
          symbolHasInstance,
          previousHasInstanceDescriptor
        );
      }
    }
  }
}
''',
'''  } catch {
    throw hostBrandAuthorityError();
  } finally {
    if (installed) {
      try {
        if (
          previousHasInstanceDescriptor ===
            undefined
        ) {
          if (
            !deleteProperty(
              probe.constructor,
              symbolHasInstance
            )
          ) {
            throw hostBrandAuthorityError();
          }
        } else {
          defineProperty(
            probe.constructor,
            symbolHasInstance,
            previousHasInstanceDescriptor
          );
        }
      } catch {
        throw hostBrandAuthorityError();
      }

      assertHostBrandAuthorityRestored(
        probe,
        previousHasInstanceDescriptor
      );
    }
  }
}
''',
1,
)

old_additional_start = '''function hasUnsupportedAdditionalBrand(
  value
) {
  for (
'''
new_additional_start = '''function hasUnsupportedAdditionalBrand(
  value
) {
  if (!additionalHostBrandAuthorityAvailable) {
    throw hostBrandAuthorityError();
  }

  for (
'''
if old_additional_start not in text:
    raise SystemExit("hasUnsupportedAdditionalBrand start not found")
text = text.replace(old_additional_start, new_additional_start, 1)

runtime.write_text(text)

test_path = Path("test/m8-runtime-brand-authority.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const aiDataPath = path.resolve(
  __dirname,
  "../src/ai-data.js"
);

function runIsolated(source) {
  const child = spawnSync(
    process.execPath,
    ["-e", source],
    {
      encoding: "utf8"
    }
  );

  assert.equal(
    child.status,
    0,
    child.stderr || child.stdout
  );
}

test("non-configurable host-brand probe authority fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    for (const name of ["Headers", "FormData"]) {
      const Constructor = globalThis[name];
      if (typeof Constructor !== "function") continue;

      const value = new Constructor();
      value.foo = "bar";
      Object.setPrototypeOf(value, Object.prototype);

      Object.defineProperty(Constructor, Symbol.hasInstance, {
        value() { return false; },
        configurable: false
      });

      assert.throws(() => cloneAiData(value));
      break;
    }
  `);
});

test("proxy-backed host constructors are rejected before proxy traps execute", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    let trapCalls = 0;
    globalThis.Headers = new Proxy(OriginalHeaders, {
      get() {
        trapCalls += 1;
        throw new Error("constructor get trap executed");
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("constructor descriptor trap executed");
      },
      defineProperty() {
        trapCalls += 1;
        throw new Error("constructor define trap executed");
      },
      deleteProperty() {
        trapCalls += 1;
        return true;
      }
    });

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    const value = new OriginalHeaders();
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);

    assert.throws(() => cloneAiData(value));
    assert.equal(trapCalls, 0);
  `);
});

test("temporary host-brand authority restores the exact prior descriptor", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    const Constructor = globalThis.Headers;
    if (typeof Constructor !== "function") process.exit(0);

    const before = Object.getOwnPropertyDescriptor(
      Constructor,
      Symbol.hasInstance
    );

    const value = new Constructor();
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);
    assert.throws(() => cloneAiData(value));

    const after = Object.getOwnPropertyDescriptor(
      Constructor,
      Symbol.hasInstance
    );
    assert.deepEqual(after, before);
  `);
});
''')
