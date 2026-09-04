from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

needle = '''  let inspectorModule;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    return null;
  }
'''
replacement = '''  // Node 22 can read node:buffer.Buffer while evaluating node:inspector.
  // Never load inspector through an accessor-backed Buffer export: inspect the
  // cached/fresh module descriptor without invoking it and fail closed.
  let bufferModule;
  try {
    bufferModule = require("node:buffer");
  } catch {
    return null;
  }
  let bufferDescriptor;
  try {
    bufferDescriptor = pristineReflectApply(
      pristineGetOwnPropertyDescriptor,
      undefined,
      [bufferModule, "Buffer"]
    );
  } catch {
    return null;
  }
  if (
    bufferDescriptor === undefined ||
    "get" in bufferDescriptor ||
    "set" in bufferDescriptor ||
    typeof bufferDescriptor.value !== "function"
  ) return null;

  let inspectorModule;
  try {
    inspectorModule = require("node:inspector");
  } catch {
    return null;
  }
'''
if needle not in runtime:
    raise SystemExit("missing inspector load block")
runtime = runtime.replace(needle, replacement, 1)
runtime_path.write_text(runtime)

index_path = Path("src/index.js")
index = index_path.read_text()
needle = '''"use strict";

const packageAuthority = require("./package-authority");
'''
replacement = '''"use strict";

// Authority-bearing modules must share one capture generation. A caller may
// preload one of these modules before requiring the package root; invalidate a
// fixed, explicit list before root capture so lazy public exports cannot mix
// stale and fresh authority objects. Avoid ambient Set/Object.keys/Array
// helpers and graph traversal at this pre-authority boundary.
const authorityConsumerModulePaths = [
  "./ai-data-core",
  "./ai-data",
  "./contract-attacks-core",
  "./contract-attacks",
  "./contract-experiment",
  "./contract-experiment-hook",
  "./contract-experiment-safe",
  "./contract-protection-proposal",
  "./contract-quality-loop",
  "./contract-remediation",
  "./engine",
  "./mutation-pack",
  "./provider-adapter",
  "./provider-adapter-m13",
  "./quality-contract",
  "./runtime-authority",
  "./package-authority"
];
for (let index = 0; index < authorityConsumerModulePaths.length; index += 1) {
  try {
    delete require.cache[require.resolve(authorityConsumerModulePaths[index])];
  } catch {}
}

const packageAuthority = require("./package-authority");
'''
if needle not in index:
    raise SystemExit("missing Round-8 index authority capture anchor")
index = index.replace(needle, replacement, 1)
if "new Set" in index or "Object.keys(require.cache)" in index:
    raise SystemExit("ambient cache traversal reintroduced")
index_path.write_text(index)

print("Guarded inspector Buffer bootstrap and restored explicit authority-consumer cache coherency.")
