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
  "packed npm artifact works for an external consumer",
  () => {
    const tempRoot =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "gotcha package test "
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
            name: "gotcha-test-consumer",
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

      const cliName =
        process.platform === "win32"
          ? "gotcha-ai.cmd"
          : "gotcha-ai";

      const cliPath =
        path.join(
          consumerDir,
          "node_modules",
          ".bin",
          cliName
        );

      assert.ok(
        fs.existsSync(cliPath),
        "npm install did not create the Gotcha CLI shim"
      );

      const cliResult =
        process.platform === "win32"
          ? run(
              process.env.ComSpec ||
                "cmd.exe",
              [
                "/d",
                "/c",
                `"${cliPath}" demo`
              ],
              {
                cwd: consumerDir
              }
            )
          : run(
              cliPath,
              ["demo"],
              {
                cwd: consumerDir
              }
            );
      assert.equal(
        cliResult.status,
        0,
        cliResult.stderr
      );

      assert.equal(
        cliResult.stdout,
        [
          "Evaluator said: PASS",
          "Gotcha: wrong-price survived",
          "Why: Changes the price while keeping the product correct.",
          "Protection: Product price must remain correct.",
          "Re-attack: CAUGHT",
          ""
        ].join("\n")
      );
      const qualityContractExample =
        path.join(
          consumerDir,
          "node_modules",
          "gotcha-ai",
          "examples",
          "quality-contract.js"
        );

      assert.ok(
        fs.existsSync(
          qualityContractExample
        ),
        "packed package did not include the M7 quality contract example"
      );

      const qualityContractExampleResult =
        run(
          process.execPath,
          [
            qualityContractExample
          ],
          {
            cwd:
              consumerDir
          }
        );

      assert.equal(
        qualityContractExampleResult.status,
        0,
        qualityContractExampleResult.stderr
      );

      assert.equal(
        qualityContractExampleResult.stdout,
        [
          "TEACH: examples accepted",
          "CONTRACT: 3 rules proposed",
          "- rule-1: The scheduled person must match the person requested by the user.",
          "- rule-2: The scheduled time must match the time requested by the user.",
          "- rule-3: If a required meeting time is missing, ask the user for clarification instead of inventing one.",
          "CONFIRM: confirmed",
          "Active rules: 3",
          ""
        ].join("\n")
      );
      const consumerCode = `
        const {
          runGotcha
        } = require("gotcha-ai");

        const result = runGotcha({
          expectedOutput: {
            status: "ok",
            value: 1
          },

          evaluator(output) {
            return output.status === "ok";
          },

          mutationPack: [
            {
              id: "wrong-value",
              type: "value-substitution",
              description: "Changes value",

              mutate(output) {
                output.value = 2;
                return output;
              },

              scores: {
                severity: 1,
                realism: 1,
                subtlety: 1,
                novelty: 1,
                fixability: 1
              },

              protection: {
                description:
                  "Value must stay correct",

                check(output) {
                  return output.value === 1;
                }
              }
            }
          ]
        });

        console.log(
          result.topFinding.id
        );

        console.log(
          String(
            result.after.survivors.length
          )
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
          "wrong-value",
          "0",
          ""
        ].join("\n")
      );

      const m7ConsumerCode = `
        const {
          draftQualityContract,
          confirmQualityContract
        } = require("gotcha-ai");

        async function main() {
          const task =
            "Schedule a meeting at the requested time.";

          const examples = [
            {
              id: "example-1",
              type: "judgment",
              input: "Schedule Sara at 3 PM.",
              output:
                "Meeting scheduled with Sara at 3 PM.",
              judgment: "good"
            }
          ];

          const draft =
            await draftQualityContract({
              task,
              examples,

              generator:
                async ({
                  task: validatedTask
                }) => ({
                  version: 1,
                  task: validatedTask,

                  rules: [
                    {
                      id: "rule-1",

                      statement:
                        "The scheduled time must match the requested time.",

                      kind: "required",
                      severity: "critical",
                      confidence: "high",

                      rationale:
                        "The example establishes the requested time as required.",

                      evidence: [
                        {
                          type: "example",
                          exampleId:
                            "example-1"
                        }
                      ]
                    }
                  ]
                })
            });

          const confirmed =
            confirmQualityContract({
              draft,

              decisions: [
                {
                  ruleId: "rule-1",
                  decision: "accept"
                }
              ]
            });

          console.log(
            String(
              draft.rules.length
            )
          );

          console.log(
            confirmed.status
          );

          console.log(
            String(
              confirmed.rules.length
            )
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

      const m7ApiResult =
        run(
          process.execPath,
          [
            "-e",
            m7ConsumerCode
          ],
          {
            cwd: consumerDir
          }
        );

      assert.equal(
        m7ApiResult.status,
        0,
        m7ApiResult.stderr
      );

      assert.equal(
        m7ApiResult.stdout,
        [
          "1",
          "confirmed",
          "1",
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
