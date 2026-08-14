const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  spawnSync
} = require("node:child_process");

const starterPath = path.join(
  __dirname,
  "..",
  "examples",
  "starter-template.js"
);

test(
  "starter template runs through the public Gotcha API",
  () => {
    const result =
      spawnSync(
        process.execPath,
        [starterPath],
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
        'Survivors before: ["wrong-important-value"]',
        "Top Gotcha: wrong-important-value",
        "Protection: The important value must remain correct.",
        "Survivors after: []",
        ""
      ].join("\n")
    );
  }
);
