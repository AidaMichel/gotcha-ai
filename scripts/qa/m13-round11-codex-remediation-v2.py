#!/usr/bin/env python3
from pathlib import Path

runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

old = '''let utilTypesAuthority = loadModuleUtilTypesAuthority();
const modernMutableBuiltinGraph = detectModernMutableBuiltinGraph();
// Node 20+ may synchronize mutable node:util exports while loading later
// builtin graphs. Capture its loader-provided module object only on that host
// generation. Older Node releases deliberately avoid this require because Node
// 18 can consult poisoned util.inspect/util.types while resolving node:util.
const mutableBuiltinUtilModule = modernMutableBuiltinGraph === true
  ? loadMutableBuiltinUtilModule()
  : null;
const capturedMutableBuiltinUtilTypes = modernMutableBuiltinGraph === true
  ? bootstrapOwnDataValue(mutableBuiltinUtilModule, "types")
  : null;
'''
new = '''let utilTypesAuthority = loadModuleUtilTypesAuthority();
const modernMutableBuiltinGraph = detectModernMutableBuiltinGraph();

function hasMutableUtilExportSynchronization() {
  if (modernMutableBuiltinGraph !== true) return false;
  // node:sea became available after the earliest Node 20 line where loading
  // node:util itself can consult mutable util.inspect/util.types. We only use
  // builtin resolution as a host-generation capability signal; no export from
  // node:sea is read or invoked.
  try {
    require("node:sea");
    return true;
  } catch {
    return false;
  }
}

const mutableUtilExportSynchronization =
  hasMutableUtilExportSynchronization();
// Only host generations that actually synchronize the mutable node:util
// facade during later builtin loads need this extra descriptor preflight.
// Early Node 20 follows the same no-extra-node:util bootstrap path as Node 18;
// the permanent poisoned-util regression verifies its lazy graphs stay trap-free.
const mutableBuiltinUtilModule = mutableUtilExportSynchronization
  ? loadMutableBuiltinUtilModule()
  : null;
const capturedMutableBuiltinUtilTypes = mutableUtilExportSynchronization
  ? bootstrapOwnDataValue(mutableBuiltinUtilModule, "types")
  : null;
'''
if old not in runtime:
    raise SystemExit("Round11 util sync block anchor not found")
runtime = runtime.replace(old, new, 1)

old_gate = '''  if (modernMutableBuiltinGraph === false) return true;
  if (modernMutableBuiltinGraph !== true) return false;

  // On Node 20+, lazy M8/M11 graphs are allowed only while node:util.types is
'''
new_gate = '''  if (modernMutableBuiltinGraph === false) return true;
  if (modernMutableBuiltinGraph !== true) return false;
  if (mutableUtilExportSynchronization !== true) return true;

  // On host generations with mutable util-facade synchronization, lazy M8/M11
  // graphs are allowed only while node:util.types is
'''
if old_gate not in runtime:
    raise SystemExit("Round11 canLoad gate anchor not found")
runtime = runtime.replace(old_gate, new_gate, 1)

runtime_path.write_text(runtime)
