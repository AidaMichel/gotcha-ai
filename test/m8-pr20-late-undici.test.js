"use strict";

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
