"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const util = require("node:util");

const repoRoot = path.join(__dirname, "..");

test("runtime authority provides trap-free local Proxy detection", () => {
  const authority = require("../src/runtime-authority");
  assert.equal(typeof authority.isProxy, "function");
  assert.equal(authority.isProxy({}), false);
  assert.equal(authority.isProxy(new Proxy({}, {})), true);
});

test("runtime authority distinguishes plain objects, DataViews, and typed arrays", () => {
  const authority = require("../src/runtime-authority");
  assert.equal(authority.hasForbiddenRuntimeBrand({}), false);
  assert.equal(authority.hasForbiddenRuntimeBrand(new DataView(new ArrayBuffer(8))), true);
  assert.equal(authority.isTypedArray(new Uint8Array(8)), true);
  assert.equal(authority.isTypedArray(new DataView(new ArrayBuffer(8))), false);
});

test("runtime authority does not execute a poisoned Proxy util.types.isProxy", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isProxy;
    let poisonCalls = 0;
    const poison = new Proxy(function poisonedIsProxy() {
      poisonCalls += 1;
      throw new Error("poisoned isProxy executed");
    }, {
      apply() {
        poisonCalls += 1;
        throw new Error("poisoned isProxy proxy executed");
      },
      get() {
        poisonCalls += 1;
        throw new Error("poisoned isProxy get trap executed");
      },
      getPrototypeOf() {
        poisonCalls += 1;
        throw new Error("poisoned isProxy getPrototypeOf trap executed");
      }
    });
    util.types.isProxy = poison;
    let authority;
    try {
      authority = require(${JSON.stringify(modulePath)});
    } catch (error) {
      console.error(error);
      process.exit(20);
    } finally {
      util.types.isProxy = original;
    }
    if (poisonCalls !== 0) process.exit(21);
    // Inspector rejects the callable Proxy without executing its traps, so the
    // poisoned public probe is never retained or invoked.
    if (authority.isProxy({}) !== true) process.exit(22);
    if (authority.isProxy(new Proxy({}, {})) !== true) process.exit(23);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("runtime authority does not depend on mutable util.types.isDataView", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const util = require("node:util");
    const original = util.types.isDataView;
    let poisonCalls = 0;
    util.types.isDataView = new Proxy(function poisonedIsDataView() {
      poisonCalls += 1;
      throw new Error("poisoned isDataView executed");
    }, {
      apply() {
        poisonCalls += 1;
        throw new Error("poisoned isDataView proxy executed");
      }
    });
    let authority;
    try {
      authority = require(${JSON.stringify(modulePath)});
    } catch (error) {
      console.error(error);
      process.exit(10);
    } finally {
      util.types.isDataView = original;
    }
    if (poisonCalls !== 0) process.exit(11);
    if (authority.hasForbiddenRuntimeBrand({}) !== false) process.exit(12);
    if (authority.hasForbiddenRuntimeBrand(new DataView(new ArrayBuffer(4))) !== true) process.exit(13);
    if (authority.isTypedArray(new Uint8Array(4)) !== true) process.exit(14);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});


test("round8 preloaded inspector replacement is never executed", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    const inspector = require("node:inspector");
    const original = Object.getOwnPropertyDescriptor(inspector, "Session");
    let calls = 0;
    Object.defineProperty(inspector, "Session", {
      value: function Session() { calls += 1; throw new Error("poison inspector"); },
      writable: true,
      enumerable: original.enumerable,
      configurable: true
    });
    let authority;
    try { authority = require(${JSON.stringify(modulePath)}); }
    finally { Object.defineProperty(inspector, "Session", original); }
    if (calls !== 0) process.exit(31);
    if (!authority || typeof authority.isProxy !== "function") process.exit(32);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});


test("round8 benign util and vm preload preserves runtime authority", () => {
  const modulePath = path.join(repoRoot, "src", "runtime-authority.js");
  const code = `
    "use strict";
    require("node:util");
    require("node:vm");
    const authority = require(${JSON.stringify(modulePath)});
    let trapCalls = 0;
    const proxy = new Proxy({}, {
      get() { trapCalls += 1; return undefined; },
      getPrototypeOf() { trapCalls += 1; return null; },
      ownKeys() { trapCalls += 1; return []; }
    });
    if (authority.isProxy({}) !== false) process.exit(41);
    if (authority.isProxy(proxy) !== true) process.exit(42);
    if (trapCalls !== 0) process.exit(43);
    if (authority.promiseAuthorityAvailable !== true) process.exit(44);
  `;
  const run = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
