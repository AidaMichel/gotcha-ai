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
      throw new Error("inspect getter executed");
    }
  });
  try { require(${JSON.stringify(runtimePath)}); }
  catch {}
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
      throw new Error("types getter executed");
    }
  });
  try {
    const api = require(${JSON.stringify(indexPath)});
    void api.createStructuredProviderAdapter;
    void api.runContractAttacks;
  } catch {}
  finally {
    Object.defineProperty(util, "types", descriptor);
  }
  process.stdout.write("typesCalls=" + calls + "\\n");
`);

run("direct node:util/types under poisoned util.types", `
  "use strict";
  const util = require("node:util");
  const descriptor = Object.getOwnPropertyDescriptor(util, "types");
  if (!descriptor || descriptor.configurable !== true) {
    process.stdout.write("directTypes descriptor not configurable\\n");
    process.exit(0);
  }
  let calls = 0;
  Object.defineProperty(util, "types", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      calls += 1;
      throw new Error("types getter executed");
    }
  });
  let loaded = false;
  try {
    const types = require("node:util/types");
    loaded = types !== null && typeof types === "object";
  } catch {}
  finally {
    Object.defineProperty(util, "types", descriptor);
  }
  process.stdout.write("directTypesCalls=" + calls + " loaded=" + loaded + "\\n");
`);
