from pathlib import Path
import json

index_path = Path("src/index.js")
index = index_path.read_text()

# Materialize a complete fixed source-module reset list at build time. Runtime
# stays deterministic and does not walk require.cache dynamically, but no
# Gotcha source wrapper can retain a stale authority generation.
module_paths = []
for path in sorted(Path("src").glob("*.js")):
    if path.name == "index.js":
        continue
    module_paths.append("./" + path.stem)

start = index.find("const authorityConsumerModulePaths = [")
if start < 0:
    raise SystemExit("missing explicit authority consumer list")
end = index.find("];", start)
if end < 0:
    raise SystemExit("unterminated authority consumer list")
end += 2

literal = "const authorityConsumerModulePaths = [\n" + ",\n".join(
    "  " + json.dumps(value) for value in module_paths
) + "\n];"
index = index[:start] + literal + index[end:]

# Boundary failure construction must not depend on any captured authority
# object. Let the JS engine create the TypeError directly and return it.
start = index.find("function makeBoundaryError() {")
end_marker = "\n\nfunction unavailableSyncBoundary()"
end = index.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("missing makeBoundaryError block")
replacement = '''function makeBoundaryError() {
  try {
    null.gotchaBoundary;
  } catch (error) {
    return error;
  }
}'''
index = index[:start] + replacement + index[end:]

if "new Set" in index or "Object.keys(require.cache)" in index:
    raise SystemExit("dynamic pre-authority cache traversal reintroduced")
if "packageAuthority.TypeErrorConstructor" in index:
    raise SystemExit("boundary error still dereferences package authority")

index_path.write_text(index)
print("Materialized complete source cache reset and null-independent boundary error.")
