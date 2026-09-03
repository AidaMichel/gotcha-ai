from pathlib import Path

path = Path("src/contract-attacks-core.js")
text = path.read_text()
old = '''const {\n  attack\n} = require("./engine");\n\nconst {\n  cloneAiData,\n  snapshotAiData\n} = require("./ai-data");\n'''
new = '''const m8DependencyAuthorityAvailable = (\n  promiseAuthorityAvailable === true &&\n  typeof runtimeAuthority.arrayIsArray === "function" &&\n  typeof runtimeAuthority.isProxy === "function" &&\n  typeof runtimeAuthority.isPromise === "function"\n);\n\nlet attack = null;\nlet cloneAiData = null;\nlet snapshotAiData = null;\n\nif (m8DependencyAuthorityAvailable) {\n  ({ attack } = require("./engine"));\n  ({ cloneAiData, snapshotAiData } = require("./ai-data"));\n}\n'''
if old not in text:
    raise SystemExit("M8 heavy dependency marker missing")
text = text.replace(old, new, 1)

# The public M8 call already performs requirePromiseIntrinsicIntegrity first.
# Strengthen that preflight so a missing dependency seam can never be reached
# if authenticated package/runtime authority was unavailable during bootstrap.
old = '''function requirePromiseIntrinsicIntegrity() {\n  if (\n    !promiseAuthorityAvailable ||\n'''
new = '''function requirePromiseIntrinsicIntegrity() {\n  if (\n    !m8DependencyAuthorityAvailable ||\n    typeof attack !== "function" ||\n    typeof cloneAiData !== "function" ||\n    typeof snapshotAiData !== "function" ||\n    !promiseAuthorityAvailable ||\n'''
if old not in text:
    raise SystemExit("M8 integrity dependency preflight marker missing")
text = text.replace(old, new, 1)
path.write_text(text)

print("round6 M8 heavy dependencies gated on authenticated authority")
