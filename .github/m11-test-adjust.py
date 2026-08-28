from pathlib import Path

path = Path('test/provider-adapter.test.js')
text = path.read_text()

old_alias = '''  assert.deepEqual(seen.input.input.a, { value: 1 });\n  assert.deepEqual(seen.input.input.b, { value: 1 });\n  assert.notStrictEqual(seen.input.input.a, seen.input.input.b);'''
new_alias = '''  assert.equal(seen.input.input.a.value, 1);\n  assert.equal(seen.input.input.b.value, 1);\n  assert.equal(Object.getPrototypeOf(seen.input.input.a), null);\n  assert.equal(Object.getPrototypeOf(seen.input.input.b), null);\n  assert.notStrictEqual(seen.input.input.a, seen.input.input.b);'''
if old_alias not in text:
    raise SystemExit('alias assertion anchor missing')
text = text.replace(old_alias, new_alias, 1)

old_typeerror = '''test("boundary failures use the captured local TypeError constructor", async () => {\n  const OriginalTypeError = global.TypeError;\n  let replacementCalls = 0;\n  global.TypeError = function ReplacementTypeError() {\n    replacementCalls += 1;\n    return new Error("replacement executed");\n  };\n  try {\n    const generator = createStructuredProviderAdapter({\n      model: "x",\n      mode: "quality-contract",\n      transport: () => ({ version: 1, kind: "wrong", output: {} })\n    });\n    await assert.rejects(\n      generator({ task: "x", examples: [], instructions: "i" }),\n      (error) => error instanceof OriginalTypeError\n    );\n    assert.equal(replacementCalls, 0);\n  } finally {\n    global.TypeError = OriginalTypeError;\n  }\n});'''
new_typeerror = '''test("boundary failures use the captured local TypeError constructor", async () => {\n  const OriginalTypeError = global.TypeError;\n  let caught;\n  global.TypeError = function ReplacementTypeError() {\n    return new Error("replacement executed");\n  };\n  try {\n    const generator = createStructuredProviderAdapter({\n      model: "x",\n      mode: "quality-contract",\n      transport: () => ({ version: 1, kind: "wrong", output: {} })\n    });\n    try {\n      await generator({ task: "x", examples: [], instructions: "i" });\n    } catch (error) {\n      caught = error;\n    }\n  } finally {\n    global.TypeError = OriginalTypeError;\n  }\n  assert.ok(caught instanceof OriginalTypeError);\n  assert.equal(Object.getPrototypeOf(caught), OriginalTypeError.prototype);\n});'''
if old_typeerror not in text:
    raise SystemExit('TypeError proof anchor missing')
text = text.replace(old_typeerror, new_typeerror, 1)

path.write_text(text)
