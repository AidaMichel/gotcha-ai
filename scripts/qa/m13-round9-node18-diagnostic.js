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

run("lazy builtin phase trace", `
  "use strict";
  const util = require("node:util");
  const descriptor = Object.getOwnPropertyDescriptor(util, "types");
  if (!descriptor || descriptor.configurable !== true) process.exit(0);
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
  } catch (error) {
    try { process.stderr.write("TRACE_ERROR\\n" + (error && error.stack || error) + "\\n"); } catch {}
  } finally {
    Object.defineProperty(util, "types", descriptor);
  }
  process.stdout.write("typesCalls=" + calls + "\\n");
`);
