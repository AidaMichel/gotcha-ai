const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  spawnSync
} = require("node:child_process");

const demoPath = path.join(
  __dirname,
  "..",
  "examples",
  "order-fulfillment",
  "demo.js"
);

test(
  "third proof domain uses only the public Gotcha entry point",
  () => {
    const source =
      fs.readFileSync(
        demoPath,
        "utf8"
      );

    assert.match(
      source,
      /require\(["']\.\.\/\.\.\/src["']\)/
    );

    assert.doesNotMatch(
      source,
      /src\/engine/
    );

    assert.doesNotMatch(
      source,
      /src\/mutation-pack/
    );
  }
);

test(
  "third unrelated structured-data domain runs the complete Gotcha flow",
  () => {
    const result =
      spawnSync(
        process.execPath,
        [demoPath],
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

    assert.match(
      result.stdout,
      /Business domain: Order Fulfillment/
    );

    assert.match(
      result.stdout,
      /wrong-quantity/
    );

    assert.match(
      result.stdout,
      /wrong-warehouse/
    );

    assert.match(
      result.stdout,
      /Top Gotcha: wrong-quantity/
    );

    assert.match(
      result.stdout,
      /Protection: Shipment quantity must match the approved quantity\./
    );

    assert.match(
      result.stdout,
      /Survivors after: \[\"wrong-warehouse\"\]/
    );

    assert.match(
      result.stdout,
      /Improvement: 1/
    );
  }
);
