from pathlib import Path

source = Path("src/ai-data-core.js")
text = source.read_text()

old = '''function isStructuredCloneProbeSafe(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    runtimeAuthority.isProxy(value)
  ) {
    return false;
  }

  let descriptors;

  try {
    descriptors =
      getOwnPropertyDescriptors(
        value
      );
  } catch {
    return false;
  }

  for (
    const key of ownKeys(descriptors)
  ) {
    if (typeof key === "symbol") {
      return false;
    }

    const descriptor =
      descriptors[key];

    if (
      "get" in descriptor ||
      "set" in descriptor
    ) {
      return false;
    }

    const child =
      descriptor.value;

    if (
      typeof child === "function" ||
      typeof child === "symbol" ||
      (
        child !== null &&
        typeof child === "object"
      )
    ) {
      return false;
    }
  }

  return true;
}
'''

new = '''function isStructuredCloneProbeSafe(
  value
) {
  if (
    value === null ||
    typeof value !== "object" ||
    runtimeAuthority.isProxy(value)
  ) {
    return false;
  }

  const pending = [value];
  const seen = new WeakSetConstructor();

  while (pending.length > 0) {
    const current = pending.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      runtimeAuthority.isProxy(current)
    ) {
      return false;
    }

    if (seen.has(current)) {
      continue;
    }

    seen.add(current);

    let descriptors;

    try {
      descriptors =
        getOwnPropertyDescriptors(
          current
        );
    } catch {
      return false;
    }

    for (
      const key of ownKeys(descriptors)
    ) {
      if (typeof key === "symbol") {
        return false;
      }

      const descriptor =
        descriptors[key];

      if (
        "get" in descriptor ||
        "set" in descriptor
      ) {
        return false;
      }

      const child =
        descriptor.value;
      const childType =
        typeof child;

      if (
        childType === "function" ||
        childType === "symbol" ||
        childType === "bigint" ||
        childType === "undefined"
      ) {
        return false;
      }

      if (
        child !== null &&
        childType === "object"
      ) {
        pending.push(child);
      }
    }
  }

  return true;
}
'''

if old in text:
    if text.count(old) != 1:
        raise SystemExit("structured-clone safety block is ambiguous")
    source.write_text(text.replace(old, new, 1))
elif new not in text:
    raise SystemExit("structured-clone safety block not recognized")

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
      assert.throws(() => cloneAiData(value), /unsupported runtime object|Host brand probe authority/);
    `);
  });
}

test("nested safe plain data remains cloneable", () => {
  const { cloneAiData } = require(aiDataPath);
  const value = { foo: { nested: true, list: [1, { ok: "yes" }] } };
  assert.deepEqual(cloneAiData(value), value);
});

test("unsafe nested accessors are never observed by the structured-clone probe", () => {
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
