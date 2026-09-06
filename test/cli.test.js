const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
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
  "  gotcha-ai init [directory]",
  "  gotcha-ai run [--config path] [--session path]",
  "  gotcha-ai verify <session-path> [--config path]",
  "  gotcha-ai --help",
  ""
].join("\n");

const demoOutput = [
  "Evaluator said: PASS",
  "Gotcha: wrong-price survived",
  "Why: Changes the price while keeping the product correct.",
  "Protection: Product price must remain correct.",
  "Re-attack: CAUGHT",
  ""
].join("\n");

test(
  "bare CLI prints helpful guidance",
  () => {
    const result = runCli();
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, helpOutput);
  }
);

test(
  "--help prints usage",
  () => {
    const result = runCli("--help");
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, helpOutput);
  }
);

test(
  "demo prints deterministic Gotcha flow",
  () => {
    const result = runCli("demo");
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, demoOutput);
  }
);

test(
  "demo preserves legacy behavior and ignores trailing arguments",
  () => {
    const result = runCli("demo", "legacy-extra");
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, demoOutput);
  }
);

test(
  "init creates starter config and private session directory metadata",
  () => {
    const parent = fs.mkdtempSync(
      path.join(os.tmpdir(), "gotcha-cli-init-")
    );
    const target = path.join(parent, "sample");

    try {
      const result = runCli("init", target);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(
        fs.existsSync(path.join(target, "gotcha.config.js")),
        true
      );
      assert.equal(
        fs.existsSync(path.join(target, ".gotcha", ".gitignore")),
        true
      );
      assert.equal(
        result.stdout.includes("Gotcha project initialized."),
        true
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);

test(
  "init refuses to overwrite an existing config",
  () => {
    const target = fs.mkdtempSync(
      path.join(os.tmpdir(), "gotcha-cli-conflict-")
    );
    const configPath = path.join(target, "gotcha.config.js");
    fs.writeFileSync(configPath, "sentinel\n");

    try {
      const result = runCli("init", target);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr.includes("Refusing to overwrite existing file:"),
        true
      );
      assert.equal(fs.readFileSync(configPath, "utf8"), "sentinel\n");
    } finally {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
);

test(
  "unknown command fails cleanly",
  () => {
    const result = runCli("potato");
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
    assert.equal(result.stderr.includes("Error:"), false);
  }
);
