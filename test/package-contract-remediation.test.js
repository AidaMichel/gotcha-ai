"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function runNpm(args, options = {}) {
  if (process.env.npm_execpath) {
    return run(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  return run(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}

test("packed npm artifact exposes contract remediation to an external consumer", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gotcha-remediation-package-"));
  const packDir = path.join(temp, "pack");
  const consumer = path.join(temp, "consumer");
  fs.mkdirSync(packDir);
  fs.mkdirSync(consumer);
  try {
    const pack = runNpm(["pack", "--pack-destination", packDir], { cwd: repoRoot });
    assert.equal(pack.status, 0, pack.stderr);
    const tarball = fs.readdirSync(packDir).find((name) => name.endsWith(".tgz"));
    assert.ok(tarball);
    fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({
      name: "gotcha-remediation-consumer",
      version: "1.0.0",
      private: true,
      type: "commonjs"
    }));
    const install = runNpm(["install", "--ignore-scripts", path.join(packDir, tarball)], { cwd: consumer });
    assert.equal(install.status, 0, install.stderr);
    const example = path.join(consumer, "node_modules", "gotcha-ai", "examples", "contract-remediation.js");
    assert.ok(fs.existsSync(example), "remediation example missing from packed artifact");
    const exampleRun = run(process.execPath, [example], { cwd: consumer });
    assert.equal(exampleRun.status, 0, exampleRun.stderr);
    assert.equal(exampleRun.stdout, [
      "GOTCHA: wrong-time survived",
      "DRAFT: draft",
      "CONFIRM: confirmed",
      "VERIFY: verified",
      "RE-ATTACK: 0 survivors",
      ""
    ].join("\n"));

    const code = `
      const api = require("gotcha-ai");
      for (const name of [
        "draftContractProtection",
        "confirmContractProtection",
        "verifyContractProtection"
      ]) {
        if (typeof api[name] !== "function") throw new Error(name + " missing");
      }
      console.log("M10 public APIs available");
    `;
    const apiRun = run(process.execPath, ["-e", code], { cwd: consumer });
    assert.equal(apiRun.status, 0, apiRun.stderr);
    assert.equal(apiRun.stdout, "M10 public APIs available\n");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
