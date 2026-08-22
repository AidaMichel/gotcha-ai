from pathlib import Path

path = Path('src/contract-attacks.js')
text = path.read_text()
old = '''  return objectFreeze(shadow);\n}\n\nfunction getForeignIdentityShadow('''
new = '''  return shadow;\n}\n\nfunction getForeignIdentityShadow('''
if old not in text:
    raise SystemExit('Could not make evaluator identity shadow disposable')
path.write_text(text.replace(old, new, 1))
print('Round 12 disposable shadow refinement applied')
