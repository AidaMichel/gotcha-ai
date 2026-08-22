"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  spawnSync
} = require("node:child_process");

const repoRoot = path.join(
  __dirname,
  ".."
);

function run(
  command,
  args,
  options = {}
) {
  return spawnSync(
    command,
    args,
    {
      encoding: "utf8",
      ...options
    }
  );
}

function runNpm(
  args,
  options = {}
) {
  if (process.env.npm_execpath) {
    return run(
      process.execPath,
      [
        process.env.npm_execpath,
        ...args
      ],
      options
    );
  }

  if (process.platform === "win32") {
    const bundledNpmCli =
      path.join(
        path.dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js"
      );

    assert.ok(
      fs.existsSync(bundledNpmCli),
      "Could not locate npm CLI on Windows"
    );

    return run(
      process.execPath,
      [
        bundledNpmCli,
        ...args
      ],
      options
    );
  }

  return run(
    "npm",
    args,
    options
  );
}

function createIsolatedNpmEnv({
  userConfig,
  globalConfig,
  cacheDir
}) {
  const env = {};

  for (
    const [key, value]
      of Object.entries(process.env)
  ) {
    if (
      !key
        .toLowerCase()
        .startsWith("npm_config_")
    ) {
      env[key] = value;
    }
  }

  env.npm_config_userconfig =
    userConfig;

  env.npm_config_globalconfig =
    globalConfig;

  env.npm_config_cache =
    cacheDir;

  env.npm_config_bin_links = "true";
  env.npm_config_audit = "false";
  env.npm_config_fund = "false";
  env.npm_config_update_notifier =
    "false";

  return env;
}

test(
  "packed npm artifact exposes contract attacks to an external consumer",
  () => {
    const tempRoot =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "gotcha contract package test "
        )
      );

    const packDir =
      path.join(
        tempRoot,
        "pack output"
      );

    const consumerDir =
      path.join(
        tempRoot,
        "consumer project"
      );

    const npmUserConfig =
      path.join(
        tempRoot,
        "user.npmrc"
      );

    const npmGlobalConfig =
      path.join(
        tempRoot,
        "global.npmrc"
      );

    const npmCacheDir =
      path.join(
        tempRoot,
        "npm cache"
      );

    fs.mkdirSync(packDir);
    fs.mkdirSync(consumerDir);

    fs.writeFileSync(
      npmUserConfig,
      ""
    );

    fs.writeFileSync(
      npmGlobalConfig,
      ""
    );

    const npmEnv =
      createIsolatedNpmEnv({
        userConfig:
          npmUserConfig,
        globalConfig:
          npmGlobalConfig,
        cacheDir:
          npmCacheDir
      });

    try {
      const packResult =
        runNpm(
          [
            "pack",
            "--pack-destination",
            packDir
          ],
          {
            cwd: repoRoot,
            env: npmEnv
          }
        );

      assert.equal(
        packResult.status,
        0,
        packResult.stderr
      );

      const tarball =
        fs.readdirSync(packDir)
          .find(
            (file) =>
              file.endsWith(".tgz")
          );

      assert.ok(
        tarball,
        "npm pack did not create a tarball"
      );

      fs.writeFileSync(
        path.join(
          consumerDir,
          "package.json"
        ),
        JSON.stringify(
          {
            name:
              "gotcha-contract-test-consumer",
            version: "1.0.0",
            private: true,
            type: "commonjs"
          },
          null,
          2
        )
      );

      const installResult =
        runNpm(
          [
            "install",
            "--bin-links=true",
            path.join(
              packDir,
              tarball
            )
          ],
          {
            cwd: consumerDir,
            env: npmEnv
          }
        );

      assert.equal(
        installResult.status,
        0,
        installResult.stderr
      );

      const contractAttackExample =
        path.join(
          consumerDir,
          "node_modules",
          "gotcha-ai",
          "examples",
          "contract-attacks.js"
        );

      assert.ok(
        fs.existsSync(
          contractAttackExample
        ),
        "packed package did not include the contract attack example"
      );

      const exampleResult =
        run(
          process.execPath,
          [
            contractAttackExample
          ],
          {
            cwd: consumerDir
          }
        );

      assert.equal(
        exampleResult.status,
        0,
        exampleResult.stderr
      );

      assert.equal(
        exampleResult.stdout,
        [
          "TEACH: examples accepted",
          "CONTRACT: 1 rule proposed",
          "CONFIRM: confirmed",
          "ATTACK: 1 candidate generated",
          "GOTCHA: wrong-time survived",
          ""
        ].join("\n")
      );

      const consumerCode = `
        const {
          runContractAttacks
        } = require("gotcha-ai");

        async function main() {
          const contract = {
            version: 1,
            status: "confirmed",

            task:
              "Schedule the requested person at the requested time.",

            rules: [
              {
                id: "time-rule",

                statement:
                  "The scheduled time must match the requested time.",

                kind: "required",
                severity: "critical"
              }
            ]
          };

          const result =
            await runContractAttacks({
              contract,

              input: {
                request:
                  "Schedule Sara at 3 PM."
              },

              expectedOutput: {
                person: "Sara",
                time: "3 PM"
              },

              evaluator(output) {
                return (
                  output.person ===
                    "Sara"
                );
              },

              generator() {
                return {
                  version: 1,
                  task: contract.task,

                  attacks: [
                    {
                      id: "wrong-time",
                      ruleId: "time-rule",
                      type: "wrong-time",

                      description:
                        "Changes the requested time.",

                      rationale:
                        "The evaluator ignores the confirmed time rule.",

                      mutatedOutput: {
                        person: "Sara",
                        time: "4 PM"
                      },

                      scores: {
                        realism: 0.9,
                        subtlety: 0.9,
                        novelty: 0.8,
                        fixability: 1
                      }
                    }
                  ]
                };
              }
            });

          console.log(
            String(
              result.attack
                .survivors.length
            )
          );

          console.log(
            result.topFinding.id
          );
        }

        main().catch(
          (error) => {
            console.error(
              error.message
            );

            process.exitCode = 1;
          }
        );
      `;

      const apiResult =
        run(
          process.execPath,
          [
            "-e",
            consumerCode
          ],
          {
            cwd: consumerDir
          }
        );

      assert.equal(
        apiResult.status,
        0,
        apiResult.stderr
      );

      assert.equal(
        apiResult.stdout,
        [
          "1",
          "wrong-time",
          ""
        ].join("\n")
      );
    } finally {
      fs.rmSync(
        tempRoot,
        {
          recursive: true,
          force: true
        }
      );
    }
  }
);
