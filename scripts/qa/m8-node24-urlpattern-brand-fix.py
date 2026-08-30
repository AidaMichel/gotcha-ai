from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"

core = CORE.read_text()

old = '''      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUrl,
          "URL"
        ),
        "href"
      ),
'''

new = '''      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUrl,
          "URL"
        ),
        "href"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUrl,
          "URLPattern"
        ),
        "pathname"
      ),
'''

if core.count(old) != 1:
    raise SystemExit(
        f"expected one trusted node:url URL getter seam, found {core.count(old)}"
    )

core = core.replace(old, new, 1)
CORE.write_text(core)
print("added module-owned URLPattern pathname brand authority")
