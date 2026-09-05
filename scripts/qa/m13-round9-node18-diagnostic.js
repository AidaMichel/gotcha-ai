"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..", "..");

function run(label, code) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.stdout.write(`status=${result.status}\n`);
}

const indexPath = path.join(repoRoot, "src", "index.js");

run("lazy and M8 execution builtin phase trace", `
  "use strict";
  (async () => {
    const util = require("node:util");
    const descriptor = Object.getOwnPropertyDescriptor(util, "types");
    if (!descriptor || descriptor.configurable !== true) return;
    let calls = 0;
    let traces = 0;
    Object.defineProperty(util, "types", {
      configurable: true,
      enumerable: descriptor.enumerable,
      get() {
        calls += 1;
        if (traces < 4) {
          traces += 1;
          try { process.stderr.write("UTIL_TYPES_GET_" + calls + "\\n" + new Error("util.types access").stack + "\\n"); } catch {}
        }
        throw new Error("types getter executed");
      }
    });
    try {
      const api = require(${JSON.stringify(indexPath)});
      process.stdout.write("afterRoot=" + calls + "\\n");
      const factory = api.createStructuredProviderAdapter;
      process.stdout.write("afterProviderGetter=" + calls + " factory=" + typeof factory + "\\n");
      factory({
        model: "trace-model",
        mode: "contract-protection",
        transport() {
          return { version: 1, kind: "gotcha-provider-response", output: {} };
        }
      });
      process.stdout.write("afterProviderFactory=" + calls + "\\n");
      const runContractAttacks = api.runContractAttacks;
      process.stdout.write("afterM8Getter=" + calls + " run=" + typeof runContractAttacks + "\\n");
      try {
        await runContractAttacks({
          contract: {
            version: 1,
            status: "confirmed",
            task: "Return the approved time.",
            rules: [{ id: "time", statement: "Time must be 3 PM.", kind: "required", severity: "major" }]
          },
          input: { value: 1 },
          expectedOutput: { time: "3 PM" },
          evaluator() { return true; },
          generator() {
            return {
              version: 1,
              task: "Return the approved time.",
              attacks: []
            };
          }
        });
      } catch (error) {
        process.stderr.write("M8_EXEC_ERROR\\n" + (error && error.stack || error) + "\\n");
      }
      process.stdout.write("afterM8Execution=" + calls + "\\n");
    } catch (error) {
      try { process.stderr.write("TRACE_ERROR\\n" + (error && error.stack || error) + "\\n"); } catch {}
    } finally {
      Object.defineProperty(util, "types", descriptor);
    }
    process.stdout.write("typesCalls=" + calls + "\\n");
  })().catch((error) => {
    process.stderr.write(String(error && error.stack || error) + "\\n");
    process.exitCode = 1;
  });
`);
