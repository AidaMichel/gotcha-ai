const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  spawnSync
} = require("node:child_process");

const cliPath = path.join(
  __dirname,
  "..",
  "bin",
  "gotcha.js"
);

function runCli(...args) {
  return spawnSync(
    process.execPath,
    [cliPath, ...args],
    {
      encoding: "utf8"
    }
  );
}

const helpOutput = [
  "Gotcha",
  "Catch what your AI evals miss.",
  "",
  "Usage:",
  "  gotcha-ai demo",
  "  gotcha-ai --help",
  ""
].join("\n");

test(
  "bare CLI prints helpful guidance",
  () => {
    const result = runCli();

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      helpOutput
    );
  }
);

test(
  "--help prints usage",
  () => {
    const result =
      runCli("--help");

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      helpOutput
    );
  }
);

test(
  "demo prints deterministic Gotcha flow",
  () => {
    const result =
      runCli("demo");

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");

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

test(
  "unknown command fails cleanly",
  () => {
    const result =
      runCli("potato");

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");

    assert.equal(
      result.stderr,
      [
        "Unknown command: potato",
        "Run `gotcha-ai --help` for usage.",
        ""
      ].join("\n")
    );

    assert.equal(
      result.stderr.includes(
        "Error:"
      ),
      false
    );
  }
);
