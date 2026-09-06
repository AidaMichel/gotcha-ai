"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");
const indexPath = path.join(repoRoot, "src", "index.js");

function runPoisonCase(setup, expectedExitCode) {
  const code = `
    "use strict";
    ${setup}
    let api;
    try {
      api = require(${JSON.stringify(indexPath)});
    } catch (error) {
      console.error(error && error.stack || error);
      process.exitCode = ${expectedExitCode};
    } finally {
      if (typeof restore === "function") restore();
    }
    if (!api || typeof api.generateContractProtectionProposal !== "function") {
      process.exitCode = ${expectedExitCode};
    }
    if (calls !== 0) process.exitCode = ${expectedExitCode};
  `;
  return spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

test("non-root Object.getPrototypeOf poisoning is rejected without execution", () => {
  const run = runPoisonCase(`
    const define = Object.defineProperty;
    const descriptor = Object.getOwnPropertyDescriptor(Object, "getPrototypeOf");
    const nativeApply = Reflect.apply;
    let calls = 0;
    const poison = new Proxy(descriptor.value, {
      apply(target, thisArg, args) {
        calls += 1;
        return nativeApply(target, thisArg, args);
      }
    });
    define(Object, "getPrototypeOf", {
      value: poison,
      writable: descriptor.writable,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    });
    function restore() { define(Object, "getPrototypeOf", descriptor); }
  `, 91);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("non-root Object.freeze poisoning is rejected without execution", () => {
  const run = runPoisonCase(`
    const define = Object.defineProperty;
    const descriptor = Object.getOwnPropertyDescriptor(Object, "freeze");
    const nativeApply = Reflect.apply;
    let calls = 0;
    const poison = new Proxy(descriptor.value, {
      apply(target, thisArg, args) {
        calls += 1;
        return nativeApply(target, thisArg, args);
      }
    });
    define(Object, "freeze", {
      value: poison,
      writable: descriptor.writable,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    });
    function restore() { define(Object, "freeze", descriptor); }
  `, 92);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("non-root Object.defineProperty poisoning is rejected without execution", () => {
  const run = runPoisonCase(`
    const define = Object.defineProperty;
    const descriptor = Object.getOwnPropertyDescriptor(Object, "defineProperty");
    const nativeApply = Reflect.apply;
    let calls = 0;
    const poison = new Proxy(descriptor.value, {
      apply(target, thisArg, args) {
        calls += 1;
        return nativeApply(target, thisArg, args);
      }
    });
    define(Object, "defineProperty", {
      value: poison,
      writable: descriptor.writable,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    });
    function restore() { define(Object, "defineProperty", descriptor); }
  `, 93);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("accessor-backed global Symbol is rejected without getter execution", () => {
  const run = runPoisonCase(`
    const define = Object.defineProperty;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Symbol");
    let calls = 0;
    define(globalThis, "Symbol", {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() {
        calls += 1;
        return descriptor.value;
      }
    });
    function restore() { define(globalThis, "Symbol", descriptor); }
  `, 94);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("accessor-backed global Object is rejected without getter execution", () => {
  const run = runPoisonCase(`
    const define = Object.defineProperty;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Object");
    let calls = 0;
    define(globalThis, "Object", {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get() {
        calls += 1;
        return descriptor.value;
      }
    });
    function restore() { define(globalThis, "Object", descriptor); }
  `, 95);
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
