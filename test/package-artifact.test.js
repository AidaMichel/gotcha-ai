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
  const needsWindowsShell =
    process.platform === "win32" &&
    (
      command === "npm" ||
      command.endsWith(".cmd") ||
      command.endsWith(".bat")
    );

  return spawnSync(
    command,
    args,
    {
      encoding: "utf8",
      shell: needsWindowsShell,
      ...options
    }
  );
}

test(
  "packed npm artifact works for an external consumer",
  () => {
    const tempRoot =
      fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "gotcha-package-test-"
        )
      );

    const packDir =
      path.join(
        tempRoot,
        "pack"
      );

    const consumerDir =
      path.join(
        tempRoot,
        "consumer"
      );

    fs.mkdirSync(packDir);
    fs.mkdirSync(consumerDir);

    try {
      const packResult =
        run(
          "npm",
          [
            "pack",
            "--pack-destination",
            packDir
          ],
          {
            cwd: repoRoot
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
        run(
          "npm",
          [
            "install",
            path.join(
              packDir,
              tarball
            )
          ],
          {
            cwd: consumerDir
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

      const cliResult =
        run(
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
