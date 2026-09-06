#!/usr/bin/env python3
from pathlib import Path

core_path = Path("src/ai-data-core.js")
test_path = Path("test/m13-review-remediation.test.js")

core = core_path.read_text()
old = '''  if (
    resolvedDescriptor === undefined ||
    "get" in resolvedDescriptor ||
    "set" in resolvedDescriptor ||
    resolvedDescriptor.value !== constructor
  ) {
    return null;
  }

  return constructor;
}

function captureRequiredUndiciProbe(
'''
new = '''  const resolvedToDataProperty =
    resolvedDescriptor !== undefined &&
    !("get" in resolvedDescriptor) &&
    !("set" in resolvedDescriptor) &&
    resolvedDescriptor.value === constructor;

  // Node 20.0-20.11 keeps the authenticated pre_execution lazy accessor in
  // place even after it returns the Undici constructor. Newer releases replace
  // it with a data property. Both states are safe: the accessor source/name/
  // arity was authenticated above, and captureRequiredUndiciProbe separately
  // authenticates the returned constructor and brand method against the
  // embedded Undici bundle before retaining either callable.
  const retainedAuthenticatedAccessor =
    resolvedDescriptor !== undefined &&
    "get" in resolvedDescriptor &&
    "set" in resolvedDescriptor &&
    resolvedDescriptor.get === getter &&
    resolvedDescriptor.set === setter &&
    resolvedDescriptor.enumerable === globalDescriptor.enumerable &&
    resolvedDescriptor.configurable === globalDescriptor.configurable;

  if (
    !resolvedToDataProperty &&
    !retainedAuthenticatedAccessor
  ) {
    return null;
  }

  return constructor;
}

function captureRequiredUndiciProbe(
'''
if old not in core:
    raise SystemExit("Undici resolution postcondition anchor not found")
core = core.replace(old, new, 1)
core_path.write_text(core)

tests = test_path.read_text()
marker = "// ROUND11_EARLY_NODE20_UNDICI_COMPAT_REGRESSION"
if marker not in tests:
    tests += r'''

// ROUND11_EARLY_NODE20_UNDICI_COMPAT_REGRESSION

test("round11 clean host-brand boundary remains available across supported runtimes", () => {
  const modulePath = path.join(repoRoot, "src", "ai-data-core.js");
  const code = `
    "use strict";
    const ai = require(${JSON.stringify(modulePath)});
    const value = { ok: true, nested: [1, "two", null] };
    const cloned = ai.cloneAiData(value);
    if (
      cloned === value ||
      cloned.ok !== true ||
      !Array.isArray(cloned.nested) ||
      cloned.nested[1] !== "two"
    ) process.exitCode = 149;
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
'''

test_path.write_text(tests)
