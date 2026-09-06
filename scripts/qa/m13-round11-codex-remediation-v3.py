#!/usr/bin/env python3
from pathlib import Path

quality_path = Path("src/quality-contract.js")
loop_path = Path("src/contract-quality-loop.js")
test_path = Path("test/m13-review-remediation.test.js")

quality = quality_path.read_text()
old_import = '''const {
  types: utilTypes
} = require("node:util");
'''
if old_import not in quality:
    raise SystemExit("quality-contract util import anchor not found")
quality = quality.replace(
    old_import,
    'const runtimeAuthority = require("./runtime-authority");\n',
    1,
)
if "utilTypes.isProxy" not in quality:
    raise SystemExit("quality-contract utilTypes.isProxy use not found")
quality = quality.replace("utilTypes.isProxy", "runtimeAuthority.isProxy")
if "utilTypes" in quality:
    raise SystemExit("quality-contract utilTypes reference remains")
quality_path.write_text(quality)

loop = loop_path.read_text()
dead_import = 'const { types: utilTypes } = require("node:util");\n'
if dead_import not in loop:
    raise SystemExit("contract-quality-loop dead util import anchor not found")
loop = loop.replace(dead_import, "", 1)
if "utilTypes" in loop:
    raise SystemExit("contract-quality-loop utilTypes reference remains")
loop_path.write_text(loop)

tests = test_path.read_text()
fs_import = 'const fs = require("node:fs");\n'
if fs_import not in tests:
    path_import = 'const path = require("node:path");\n'
    if path_import not in tests:
        raise SystemExit("test path import anchor not found")
    tests = tests.replace(path_import, path_import + fs_import, 1)

marker = "// ROUND11_LAZY_UTIL_CLEANUP_REGRESSION"
if marker not in tests:
    tests += r'''

// ROUND11_LAZY_UTIL_CLEANUP_REGRESSION

test("round11 legacy quality modules have no direct node util types dependency", () => {
  const qualitySource = fs.readFileSync(
    path.join(repoRoot, "src", "quality-contract.js"),
    "utf8"
  );
  const loopSource = fs.readFileSync(
    path.join(repoRoot, "src", "contract-quality-loop.js"),
    "utf8"
  );
  assert.equal(qualitySource.includes('require("node:util")'), false);
  assert.equal(loopSource.includes('require("node:util")'), false);
  assert.equal(qualitySource.includes("utilTypes"), false);
  assert.equal(loopSource.includes("utilTypes"), false);
});
'''

test_path.write_text(tests)
