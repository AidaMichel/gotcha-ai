from pathlib import Path

path = Path('src/contract-attacks.js')
text = path.read_text()

needle = '''const objectCreate =\n  Object.create;\n\nconst objectPrototype =\n'''
replacement = '''const objectCreate =\n  Object.create;\n\nconst objectIs =\n  Object.is;\n\nconst objectPrototype =\n'''
if needle not in text:
    raise SystemExit('Could not add captured Object.is')
text = text.replace(needle, replacement, 1)
text = text.replace('''    return Object.is(\n      leftValue,\n      rightValue\n    );''', '''    return objectIs(\n      leftValue,\n      rightValue\n    );''', 1)

needle = '''  let leftDescriptors;\n  let rightDescriptors;\n\n  try {\n    leftDescriptors =\n      getOwnPropertyDescriptors(left);\n    rightDescriptors =\n      getOwnPropertyDescriptors(right);\n  } catch {\n    return false;\n  }\n'''
replacement = '''  let leftDescriptors;\n  let rightDescriptors;\n  let leftPrototype;\n  let rightPrototype;\n\n  try {\n    leftPrototype =\n      getPrototypeOf(left);\n    rightPrototype =\n      getPrototypeOf(right);\n    leftDescriptors =\n      getOwnPropertyDescriptors(left);\n    rightDescriptors =\n      getOwnPropertyDescriptors(right);\n  } catch {\n    return false;\n  }\n\n  if (\n    (leftPrototype === null) !==\n      (rightPrototype === null)\n  ) {\n    return false;\n  }\n'''
if needle not in text:
    raise SystemExit('Could not harden intrinsic nested-object comparison')
text = text.replace(needle, replacement, 1)

path.write_text(text)
print('Round 10 correction applied')
