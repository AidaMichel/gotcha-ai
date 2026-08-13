const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  spawnSync
} = require("node:child_process");

const quickstartPath = path.join(
  __dirname,
  "..",
  "examples",
  "quickstart.js"
);

test(
  "public quickstart delivers the Gotcha moment",
  () => {
    const result =
      spawnSync(
        process.execPath,
        [quickstartPath],
        {
          encoding: "utf8"
        }
      );

    assert.equal(
      result.status,
      0
    );

    assert.equal(
      result.stderr,
      ""
    );

    assert.equal(
      result.stdout,
      [
        "Evaluator said: PASS",
        "Gotcha: wrong-price survived",
        "Why: Changes the price while keeping the product correct.",
        "Protection: Product price must remain correct.",
        "Re-attack: CAUGHT",
        ""
      ].join("\n")
    );
  }
);
