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

const runtimePath = path.join(repoRoot, "src", "runtime-authority.js");
const indexPath = path.join(repoRoot, "src", "index.js");

run("util.inspect getter trace", `
  "use strict";
  const util = require("node:util");
  require("node:buffer");
  require("node:vm");
  const descriptor = Object.getOwnPropertyDescriptor(util, "inspect");
  let calls = 0;
  Object.defineProperty(util, "inspect", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      calls += 1;
      try { process.stderr.write("INSPECT_GET\\n" + new Error("inspect access").stack + "\\n"); } catch {}
      throw new Error("inspect getter executed");
    }
  });
  try { require(${JSON.stringify(runtimePath)}); }
  catch (error) { try { process.stderr.write("RUNTIME_ERROR\\n" + (error && error.stack || error) + "\\n"); } catch {} }
  finally { Object.defineProperty(util, "inspect", descriptor); }
  process.stdout.write("inspectCalls=" + calls + "\\n");
`);

run("util.types getter trace", `
  "use strict";
  const util = require("node:util");
  const descriptor = Object.getOwnPropertyDescriptor(util, "types");
  if (!descriptor || descriptor.configurable !== true) {
    process.stdout.write("types descriptor not configurable\\n");
    process.exit(0);
  }
  let calls = 0;
  Object.defineProperty(util, "types", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      calls += 1;
      try { process.stderr.write("TYPES_GET\\n" + new Error("types access").stack + "\\n"); } catch {}
      throw new Error("types getter executed");
    }
  });
  try {
    const api = require(${JSON.stringify(indexPath)});
    void api.createStructuredProviderAdapter;
    void api.runContractAttacks;
  } catch (error) {
    try { process.stderr.write("INDEX_ERROR\\n" + (error && error.stack || error) + "\\n"); } catch {}
  } finally {
    Object.defineProperty(util, "types", descriptor);
  }
  process.stdout.write("typesCalls=" + calls + "\\n");
`);
