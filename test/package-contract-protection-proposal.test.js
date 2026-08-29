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
  if (process.platform === "win32") {
    const bundledNpmCli = path.join(
      path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"
    );
    assert.ok(fs.existsSync(bundledNpmCli), "Could not locate npm CLI on Windows");
    return run(process.execPath, [bundledNpmCli, ...args], options);
  }
  return run("npm", args, options);
}

function createIsolatedNpmEnv({ userConfig, globalConfig, cacheDir }) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toLowerCase().startsWith("npm_config_")) env[key] = value;
  }
  env.npm_config_userconfig = userConfig;
  env.npm_config_globalconfig = globalConfig;
  env.npm_config_cache = cacheDir;
  env.npm_config_bin_links = "true";
  env.npm_config_audit = "false";
  env.npm_config_fund = "false";
  env.npm_config_update_notifier = "false";
  return env;
}

test("packed npm artifact exposes M13 proposal generation to an external consumer", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gotcha-m13-package-"));
  const packDir = path.join(temp, "pack");
  const consumer = path.join(temp, "consumer");
  const npmUserConfig = path.join(temp, "user.npmrc");
  const npmGlobalConfig = path.join(temp, "global.npmrc");
  const npmCacheDir = path.join(temp, "npm-cache");

  fs.mkdirSync(packDir);
  fs.mkdirSync(consumer);
  fs.writeFileSync(npmUserConfig, "");
  fs.writeFileSync(npmGlobalConfig, "");
  const npmEnv = createIsolatedNpmEnv({
    userConfig: npmUserConfig,
    globalConfig: npmGlobalConfig,
    cacheDir: npmCacheDir
  });

  try {
    const pack = runNpm(["pack", "--pack-destination", packDir], {
      cwd: repoRoot,
      env: npmEnv
    });
    assert.equal(pack.status, 0, pack.stderr);
    const tarball = fs.readdirSync(packDir).find((name) => name.endsWith(".tgz"));
    assert.ok(tarball);

    fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({
      name: "gotcha-m13-consumer",
      version: "1.0.0",
      private: true,
      type: "commonjs"
    }));
    const install = runNpm([
      "install", "--bin-links=true", "--ignore-scripts", path.join(packDir, tarball)
    ], { cwd: consumer, env: npmEnv });
    assert.equal(install.status, 0, install.stderr);

    const code = `
      "use strict";
      const {
        runContractAttacks,
        generateContractProtectionProposal,
        createStructuredProviderAdapter,
        prepareContractQualityLoop
      } = require("gotcha-ai");

      (async () => {
        const contract = {
          version: 1,
          status: "confirmed",
          task: "Return the approved time.",
          rules: [{
            id: "time-rule",
            statement: "Time must be 3 PM.",
            kind: "required",
            severity: "major"
          }]
        };
        const attacked = await runContractAttacks({
          contract,
          input: { request: "Schedule it." },
          expectedOutput: { time: "3 PM" },
          evaluator() { return true; },
          generator() {
            return {
              version: 1,
              task: contract.task,
              attacks: [{
                id: "wrong-time",
                ruleId: "time-rule",
                type: "wrong-time",
                description: "Changes the time.",
                rationale: "Violates the rule.",
                mutatedOutput: { time: "4 PM" },
                scores: { realism: .9, subtlety: .8, novelty: .7, fixability: .9 }
              }]
            };
          }
        });

        const provider = createStructuredProviderAdapter({
          model: "fake-model",
          mode: "contract-protection",
          transport(request) {
            return {
              version: 1,
              kind: "gotcha-provider-response",
              output: {
                version: 1,
                task: request.input.task,
                sourceAttackId: request.input.source.attackId,
                ruleId: request.input.source.ruleId,
                protection: {
                  statement: "Reject any output whose time is not exactly 3 PM.",
                  rationale: "The survivor changed the approved time."
                }
              }
            };
          }
        });

        const generated = await generateContractProtectionProposal({
          experiment: attacked.experiment,
          sourceAttackId: "wrong-time",
          generator: provider
        });
        const checkpoint = await prepareContractQualityLoop({
          experiment: attacked.experiment,
          sourceAttackId: "wrong-time",
          proposal: generated.proposal
        });

        if (generated.state !== "proposal-ready") throw new Error("proposal state");
        if (checkpoint.state !== "awaiting-human-decision") throw new Error("checkpoint state");
        console.log("M13 packed proposal flow available");
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;
    const apiRun = run(process.execPath, ["-e", code], { cwd: consumer });
    assert.equal(apiRun.status, 0, apiRun.stderr);
    assert.equal(apiRun.stdout, "M13 packed proposal flow available\n");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});