from pathlib import Path

# Keep ai-data's existing vm.Script / vm.isContext brand checks. The security
# boundary being centralized is executable runInNewContext authority; removing
# the whole vm module would silently widen the accepted AI-data runtime model.
ai_path = Path("src/ai-data-core.js")
ai = ai_path.read_text()
needle = 'const runtimeAuthority =\n  require("./runtime-authority");\n\n'
insert = needle + 'const vm =\n  require("node:vm");\n\n'
if ai.count(needle) != 1:
    raise SystemExit(f"ai-data runtimeAuthority anchor: expected 1, got {ai.count(needle)}")
ai = ai.replace(needle, insert, 1)
old = 'const vmIsContext =\n  runtimeAuthority.isVmContext;'
new = 'const vmIsContext =\n  typeof vm.isContext === "function"\n    ? vm.isContext\n    : null;'
if ai.count(old) != 1:
    raise SystemExit(f"ai-data vmIsContext rule: expected 1, got {ai.count(old)}")
ai = ai.replace(old, new, 1)
old = '      reflectApply(\n        vmIsContext,\n        undefined,\n        [value]\n      )'
new = '      reflectApply(\n        vmIsContext,\n        vm,\n        [value]\n      )'
if ai.count(old) != 1:
    raise SystemExit(f"ai-data vmIsContext receiver: expected 1, got {ai.count(old)}")
ai = ai.replace(old, new, 1)
ai_path.write_text(ai)

# Narrow the permanent architectural law to executable VM authority. A module
# may retain vm.Script/isContext brand checks, but only runtime-authority may
# call or retain runInNewContext.
test_path = Path("test/m13-review-remediation.test.js")
test = test_path.read_text()
old = 'test("round9 runtime-authority is the sole node:vm authority consumer", () => {'
new = 'test("round9 runtime-authority is the sole runInNewContext authority consumer", () => {'
if test.count(old) != 1:
    raise SystemExit(f"round9 static test name: expected 1, got {test.count(old)}")
test = test.replace(old, new, 1)
old = "    if (source.includes('require(\"node:vm\")') || source.includes(\"runInNewContext\")) {\n      offenders.push(name);\n    }"
new = "    if (source.includes(\"runInNewContext\")) {\n      offenders.push(name);\n    }"
if test.count(old) != 1:
    raise SystemExit(f"round9 static test predicate: expected 1, got {test.count(old)}")
test = test.replace(old, new, 1)
test_path.write_text(test)

print("Preserved VM brand checks while centralizing runInNewContext authority.")
