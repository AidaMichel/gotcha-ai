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
if old not in text:
    if new in text:
        print("Round 6 ALS harness already fixed")
    else:
        raise SystemExit("ALS test marker not found")
else:
    path.write_text(text.replace(old, new, 1))
    print("Round 6 ALS harness fixed")
