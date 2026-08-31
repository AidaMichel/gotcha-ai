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

    assert.equal(reads, 0);
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

test("concise spoofed Headers brand method is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Constructor = globalThis.Headers;
    if (typeof Constructor !== "function") process.exit(0);

    const saved = new Constructor();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let calls = 0;
    Constructor.prototype.get = ({
      get(name) {
        calls += 1;
        throw new Error("spoofed concise method executed");
      }
    }).get;

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(calls, 0);
  `);
});

test("replacement Headers constructor cannot borrow the genuine prototype authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const Replacement = OriginalHeaders.bind(null);
    Object.defineProperty(Replacement, "prototype", {
      value: OriginalHeaders.prototype
    });
    globalThis.Headers = Replacement;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("module-owned URL probe survives a missing ambient URL constructor", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalURL = globalThis.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URL = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("proxy-backed replacement constructor prototype is never inspected", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let trapCalls = 0;
    function Replacement() {}
    Replacement.prototype = new Proxy({}, {
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("prototype descriptor trap executed");
      },
      get() {
        trapCalls += 1;
        throw new Error("prototype get trap executed");
      }
    });

    globalThis.Headers = Replacement;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
    assert.equal(trapCalls, 0);
  `);
});

test("poisoned String includes is not probe authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const originalIncludes = String.prototype.includes;
    let calls = 0;
    String.prototype.includes = function poisonedIncludes() {
      calls += 1;
      throw new Error("ambient String.includes executed");
    };

    let cloneAiData;
    try {
      ({ cloneAiData } = require(${JSON.stringify(aiDataPath)}));
    } finally {
      String.prototype.includes = originalIncludes;
    }

    assert.equal(calls, 0);
    assert.deepEqual(
      cloneAiData({ safe: true }),
      { safe: true }
    );
  `);
});

test("module-owned URLSearchParams probe works without the ambient constructor", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Original = globalThis.URLSearchParams;
    if (typeof Original !== "function") process.exit(0);

    const saved = new Original("a=1");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URLSearchParams = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("URLPattern brand detection does not depend on its ambient getter shape", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Original = globalThis.URLPattern;
    if (typeof Original !== "function") process.exit(0);

    const saved = new Original({ pathname: "/x" });
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URLPattern = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});


test("untrusted lazy Headers accessor is rejected without executing it", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    let setterCalls = 0;
    Object.defineProperty(globalThis, "Headers", {
      configurable: true,
      enumerable: false,
      get() {
        getterCalls += 1;
        throw new Error("untrusted lazy Headers getter executed");
      },
      set() {
        setterCalls += 1;
        throw new Error("untrusted lazy Headers setter executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
  `);
});


test("module-owned Blob slice authenticates rewritten Blob without rejecting plain data", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const { Blob } = require("node:buffer");
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.deepEqual(
      cloneAiData({ safe: true }),
      { safe: true }
    );

    if (typeof Blob !== "function") process.exit(0);

    const value = new Blob(["x"]);
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);

    assert.throws(() => cloneAiData(value));
  `);
});


test("prototype-rewritten AbortController uses captured private-brand authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalAbortController = globalThis.AbortController;
    if (typeof OriginalAbortController !== "function") process.exit(0);

    const saved = new OriginalAbortController();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    globalThis.AbortController = undefined;

    assert.throws(
      () => cloneAiData(saved, "AbortController"),
      /unsupported runtime object/
    );
  `);
});

test("untrusted lazy AbortController accessor fails closed without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalAbortController = globalThis.AbortController;
    if (typeof OriginalAbortController !== "function") process.exit(0);

    const saved = new OriginalAbortController();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    let setterCalls = 0;

    Object.defineProperty(
      globalThis,
      "AbortController",
      {
        configurable: true,
        enumerable: false,
        get() {
          getterCalls += 1;
          throw new Error("untrusted AbortController getter executed");
        },
        set() {
          setterCalls += 1;
          throw new Error("untrusted AbortController setter executed");
        }
      }
    );

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
    assert.equal(setterCalls, 0);
  `);
});


test("poisoned node:url module export is rejected without executing its brand getter", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const nodeUrl = require("node:url");

    const OriginalURL = nodeUrl.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    function FakeURL() {}
    Object.defineProperty(FakeURL.prototype, "href", {
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("poisoned node:url URL getter executed");
      }
    });

    nodeUrl.URL = FakeURL;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
  `);
});

test("poisoned genuine node:url brand getter is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");
    const nodeUrl = require("node:url");

    const OriginalURL = nodeUrl.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const descriptor = Object.getOwnPropertyDescriptor(
      OriginalURL.prototype,
      "href"
    );
    if (!descriptor || descriptor.configurable !== true) process.exit(0);

    let getterCalls = 0;
    Object.defineProperty(OriginalURL.prototype, "href", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        getterCalls += 1;
        throw new Error("poisoned genuine URL href getter executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
  `);
});


test("poisoned relocated global Blob accessor is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalBlob = globalThis.Blob;
    if (typeof OriginalBlob !== "function") process.exit(0);

    const saved = new OriginalBlob(["x"]);
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let getterCalls = 0;
    Object.defineProperty(globalThis, "Blob", {
      configurable: true,
      enumerable: false,
      get() {
        getterCalls += 1;
        throw new Error("poisoned global Blob getter executed");
      }
    });

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(getterCalls, 0);
  `);
});
