"use strict";

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
