from pathlib import Path

path = Path("src/index.js")
text = path.read_text()
old = '''require("./package-authority");\n\nfunction call(modulePath, exportName, args) {'''
new = '''const packageAuthorityModules = [\n  "./package-authority",\n  "./runtime-authority",\n  "./ai-data-core",\n  "./provider-adapter"\n];\nfor (const modulePath of packageAuthorityModules) {\n  try {\n    delete require.cache[require.resolve(modulePath)];\n  } catch {}\n}\nrequire("./package-authority");\n\nfunction call(modulePath, exportName, args) {'''
if old not in text:
    raise SystemExit("lazy index package authority marker missing")
path.write_text(text.replace(old, new, 1))
print("round6 package boundary resets pre-cached internal authority")
