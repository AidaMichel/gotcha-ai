from pathlib import Path

path = Path('src/contract-quality-loop.js')
text = path.read_text()
old = '''const ObjectPrototype = Object.prototype;\nconst PromiseConstructor = Promise;\nconst PromisePrototype = Promise.prototype;\nconst PromiseThen = Promise.prototype.then;\nconst PromiseSpecies = Symbol.species;\nconst TypeErrorConstructor = TypeError;\n'''
new = '''const ObjectPrototype = Object.prototype;\nconst qualityLoopPromiseProbe =\n  (async function qualityLoopPromiseProbe() {})();\nconst PromisePrototype =\n  getPrototypeOf(qualityLoopPromiseProbe);\nconst PromiseConstructorDescriptor =\n  getOwnPropertyDescriptor(PromisePrototype, "constructor");\nconst PromiseThenDescriptor =\n  getOwnPropertyDescriptor(PromisePrototype, "then");\nconst PromiseConstructor =\n  PromiseConstructorDescriptor !== undefined &&\n  !("get" in PromiseConstructorDescriptor) &&\n  !("set" in PromiseConstructorDescriptor) &&\n  typeof PromiseConstructorDescriptor.value === "function"\n    ? PromiseConstructorDescriptor.value\n    : null;\nconst PromiseThen =\n  PromiseThenDescriptor !== undefined &&\n  !("get" in PromiseThenDescriptor) &&\n  !("set" in PromiseThenDescriptor) &&\n  typeof PromiseThenDescriptor.value === "function"\n    ? PromiseThenDescriptor.value\n    : null;\nconst PromiseSpecies = Symbol.species;\nconst TypeErrorConstructor = TypeError;\n'''
if old not in text:
    raise SystemExit('quality-loop Promise capture marker missing')
path.write_text(text.replace(old, new, 1))
