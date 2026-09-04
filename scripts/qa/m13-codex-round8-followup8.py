from pathlib import Path
import json

index_path = Path("src/index.js")
index = index_path.read_text()

# Materialize a complete fixed consumer reset list at build time. Preserve the
# two frozen authority roots if they were already captured by a preloaded Gotcha
# consumer; recapturing them after VM/Inspector are loaded would create a second
# fail-closed generation. Every other source module is reloaded around the one
# preserved authority generation.
module_paths = []
for path in sorted(Path("src").glob("*.js")):
    if path.name in ("index.js", "package-authority.js", "runtime-authority.js"):
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
print("Preserved authority roots, reset every consumer, and hardened boundary errors.")
