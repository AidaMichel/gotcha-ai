"use strict";

const test =
  require("node:test");
const assert =
  require("node:assert/strict");
const fs =
  require("node:fs");
const os =
  require("node:os");
const path =
  require("node:path");
const {
  spawnSync
} = require("node:child_process");

const cliPath =
  path.join(
    __dirname,
    "..",
    "bin",
    "gotcha.js"
  );

function withTempDirectory(
  prefix,
  callback
) {
  const directory =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        prefix
      )
    );

  try {
    return callback(directory);
  } finally {
    fs.rmSync(
      directory,
      {
        recursive: true,
        force: true
      }
    );
  }
}

test(
  "probe CLI surfaces stable survivors, flaky candidates, and baseline instability",
  () =>
    withTempDirectory(
      "gotcha-probe-cli-",
      (directory) => {
        const configPath =
          path.join(
            directory,
            "probe.config.js"
          );

        fs.writeFileSync(
          configPath,
          `"use strict";

module.exports = {
  evaluator(output, context) {
    if (context.caseId === "unstable") {
      return context.trial === 1;
    }

    if (output.kind === "good") {
      return true;
    }

    if (output.kind === "flaky") {
      return context.trial <= 2;
    }

    return output.kind === "survivor";
  },

  probe: {
    trials: 4,
    cases: [
      {
        id: "stable",
        expectedOutput: { kind: "good" },
        candidates: [
          {
            id: "missed",
            description: "Wrong candidate that still passes.",
            output: { kind: "survivor" }
          },
          {
            id: "sometimes",
            output: { kind: "flaky" }
          },
          {
            id: "caught",
            output: { kind: "bad" }
          }
        ]
      },
      {
        id: "unstable",
        expectedOutput: { kind: "good" },
        candidates: [
          {
            id: "do-not-interpret",
            output: { kind: "survivor" }
          }
        ]
      }
    ]
  }
};
`
        );

        const result =
          spawnSync(
            process.execPath,
            [
              cliPath,
              "probe",
              "--config",
              configPath
            ],
            {
              cwd: directory,
              encoding: "utf8"
            }
          );

        assert.equal(
          result.status,
          0,
          result.stderr
        );
        assert.equal(
          result.stdout.includes(
            "[SURVIVOR] missed · 4/4 PASS"
          ),
          true
        );
        assert.equal(
          result.stdout.includes(
            "[FLAKY] sometimes · 2/4 PASS"
          ),
          true
        );
        assert.equal(
          result.stdout.includes(
            "[CAUGHT] caught · 0/4 PASS"
          ),
          true
        );
        assert.equal(
          result.stdout.includes(
            "BASELINE UNSTABLE"
          ),
          true
        );
        assert.equal(
          result.stdout.includes(
            "GOTCHA — 1 stable survivor candidate found."
          ),
          true
        );
        assert.equal(
          result.stdout.includes(
            "not automatically a confirmed semantic failure"
          ),
          true
        );
      }
    )
);
