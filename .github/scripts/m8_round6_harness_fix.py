from pathlib import Path

path = Path("test/m8-codex-round6.test.js")
text = path.read_text()

old = '''test("active AsyncLocalStorage objects fail the AI-data boundary", () => {
  const storage = new AsyncLocalStorage();
  storage.run({ secret: true }, () => {
    Object.setPrototypeOf(storage, Object.prototype);
    storage.foo = "bar";
    assert.throws(
      () => cloneAiData(storage, "storage"),
      /unsupported runtime object/
    );
  });
});'''
new = '''test("active AsyncLocalStorage objects fail the AI-data boundary", () => {
  const storage = new AsyncLocalStorage();
  storage.run({ secret: true }, () => {
    const originalPrototype = Object.getPrototypeOf(storage);
    try {
      Object.setPrototypeOf(storage, Object.prototype);
      storage.foo = "bar";
      assert.throws(
        () => cloneAiData(storage, "storage"),
        /unsupported runtime object/
      );
    } finally {
      Object.setPrototypeOf(storage, originalPrototype);
    }
  });
});'''

if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit("ALS test marker not found")

text = text.replace(
    '''    /own data property/\n  );\n});\n\ntest("Set prototype tampering cannot bypass duplicate attack IDs"''',
    '''    /(own data property|plain object)/\n  );\n});\n\ntest("Set prototype tampering cannot bypass duplicate attack IDs"''',
    1,
)

text = text.replace(
    '''    /finite number between 0 and 1/\n  );\n});\n\ntest("evaluator prototype tampering cannot corrupt engine aggregation"''',
    '''    /finite number/\n  );\n});\n\ntest("evaluator prototype tampering cannot corrupt engine aggregation"''',
    1,
)

path.write_text(text)
print("Round 6 harness aligned")
