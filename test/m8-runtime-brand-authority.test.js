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


test("stateful host constructor lookup is captured once and fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const poisoned = new Proxy(OriginalHeaders, {});
    let reads = 0;

    Object.defineProperty(globalThis, "Headers", {
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? poisoned : undefined;
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(reads, 1);
    assert.throws(() => cloneAiData(saved));
  `);
});

test("proxy-backed shared host-brand constructor authority fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalURL = globalThis.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let trapCalls = 0;
    globalThis.URL = new Proxy(OriginalURL, {
      get() {
        trapCalls += 1;
        throw new Error("URL constructor trap executed");
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("URL constructor descriptor trap executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(trapCalls, 0);
  `);
});


test("bound host constructor without usable probe fails closed", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalURL = globalThis.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URL = OriginalURL.bind(null);
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("proxy-backed Headers brand method is rejected without executing traps", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Constructor = globalThis.Headers;
    if (typeof Constructor !== "function") process.exit(0);

    const saved = new Constructor();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const originalGet = Constructor.prototype.get;
    let trapCalls = 0;
    Constructor.prototype.get = new Proxy(originalGet, {
      apply() {
        trapCalls += 1;
        throw new Error("poisoned Headers.get executed");
      }
    });
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
    assert.equal(trapCalls, 0);
  `);
});

test("ordinary throwing Headers brand method is rejected before execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Constructor = globalThis.Headers;
    if (typeof Constructor !== "function") process.exit(0);

    const saved = new Constructor();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let calls = 0;
    Constructor.prototype.get = function get() {
      calls += 1;
      throw new Error("poisoned Headers.get executed");
    };
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
    assert.equal(calls, 0);
  `);
});
