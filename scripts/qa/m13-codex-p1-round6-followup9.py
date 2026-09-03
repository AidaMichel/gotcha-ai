from pathlib import Path

path = Path("src/ai-data-core.js")
text = path.read_text()

old_encoder = '''      captureTrustedModuleGetter(
        nodeUtil,
        "TextEncoder",
        "encoding",
        "internal/encoding",
        false
      ),'''
new_encoder = '''      captureTrustedModuleGetter(
        null,
        "TextEncoder",
        "encoding",
        "internal/encoding",
        false
      ),'''
old_decoder = '''      captureTrustedModuleGetter(
        nodeUtil,
        "TextDecoder",
        "encoding",
        "internal/encoding",
        false
      ),'''
new_decoder = '''      captureTrustedModuleGetter(
        null,
        "TextDecoder",
        "encoding",
        "internal/encoding",
        false
      ),'''

if text.count("nodeUtil") != 2:
    raise SystemExit(f"unexpected stale nodeUtil reference count: {text.count('nodeUtil')}")
if old_encoder not in text:
    raise SystemExit("TextEncoder stale nodeUtil marker missing")
if old_decoder not in text:
    raise SystemExit("TextDecoder stale nodeUtil marker missing")

text = text.replace(old_encoder, new_encoder, 1)
text = text.replace(old_decoder, new_decoder, 1)

if "nodeUtil" in text:
    raise SystemExit("stale nodeUtil reference remains after final cleanup")

path.write_text(text)
print("round6 final stale nodeUtil cleanup applied")
