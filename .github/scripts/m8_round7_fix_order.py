from pathlib import Path

path = Path("src/contract-attacks.js")
text = path.read_text()

block = '''const objectConstructorSource =
  reflectApply(
    functionToString,
    ObjectConstructor,
    []
  );

const arrayConstructorSource =
  reflectApply(
    functionToString,
    ArrayConstructor,
    []
  );

'''

if block not in text:
    raise SystemExit("constructor source block not found")

text = text.replace(block, "", 1)

anchor = '''const reflectConstruct =
  Reflect.construct;
'''

if anchor not in text:
    raise SystemExit("Reflect.construct anchor not found")

text = text.replace(anchor, anchor + "\n" + block.rstrip() + "\n", 1)
path.write_text(text)
print("Round 7 initialization order fixed")
