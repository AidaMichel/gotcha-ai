from pathlib import Path

# provider-adapter-m13.js
p = Path('src/provider-adapter-m13.js')
s = p.read_text()
s = s.replace('const TypeErrorConstructor = TypeError;\n', '')
old = '''let capturedAmbientPromiseConstructor = null;
try {
  capturedAmbientPromiseConstructor = globalThis.Promise;
} catch {
  capturedAmbientPromiseConstructor = null;
}
'''
new = '''let capturedAmbientPromiseConstructor = null;
try {
  const ambientPromiseDescriptor = getOwnPropertyDescriptor(globalThis, "Promise");
  if (
    ambientPromiseDescriptor !== undefined &&
    !("get" in ambientPromiseDescriptor) &&
    !("set" in ambientPromiseDescriptor) &&
    typeof ambientPromiseDescriptor.value === "function" &&
    !isProxy(ambientPromiseDescriptor.value)
  ) {
    capturedAmbientPromiseConstructor = ambientPromiseDescriptor.value;
  }
} catch {
  capturedAmbientPromiseConstructor = null;
}
'''
if old not in s:
    raise SystemExit('provider ambient Promise target missing')
s = s.replace(old, new, 1)
old = '''function boundaryError(message) {
  return new TypeErrorConstructor(message);
}

async function rejectAdapterBoundaryPromise(error) {
  throw error;
}

function isLocalTypeError(error) {
  return (
    error !== null &&
    (typeof error === "object" || typeof error === "function") &&
    reflectApply(functionHasInstance, TypeErrorConstructor, [error])
  );
}
'''
new = '''const adapterTypeErrorPrototype = (() => {
  try {
    null.m13AdapterBoundary;
  } catch (error) {
    return getPrototypeOf(error);
  }
  return null;
})();

function boundaryError() {
  try {
    null.m13AdapterBoundary;
  } catch (error) {
    return error;
  }
  return null;
}

async function rejectAdapterBoundaryPromise(error) {
  throw error;
}

function isLocalTypeError(error) {
  return (
    error !== null &&
    typeof error === "object" &&
    adapterTypeErrorPrototype !== null &&
    getPrototypeOf(error) === adapterTypeErrorPrototype
  );
}
'''
if old not in s:
    raise SystemExit('provider TypeError target missing')
s = s.replace(old, new, 1)
old = '''function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");
  if (constructorDescriptor !== undefined && constructorDescriptor.configurable !== true) {
    throw boundaryError("transport Promise has an unshieldable constructor property.");
  }
  if (constructorDescriptor === undefined && !isExtensible(promise)) {
    throw boundaryError("transport Promise cannot be safely observed.");
  }
  defineProperty(promise, "constructor", {
    value: safePromiseConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  try {
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
  } finally {
    if (constructorDescriptor === undefined) {
      deleteProperty(promise, "constructor");
    } else {
      defineProperty(promise, "constructor", constructorDescriptor);
    }
  }
}
'''
new = '''function constructorDescriptorIsTrusted(descriptor) {
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === trustedPromiseConstructor
  );
}

function prototypeConstructorIsTrusted(promise) {
  if (getPrototypeOf(promise) !== trustedPromisePrototype) return false;
  return constructorDescriptorIsTrusted(
    getOwnPropertyDescriptor(trustedPromisePrototype, "constructor")
  );
}

function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  const constructorDescriptor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    constructorDescriptor !== undefined &&
    constructorDescriptor.configurable !== true
  ) {
    if (!constructorDescriptorIsTrusted(constructorDescriptor)) throw boundaryError();
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
  if (
    constructorDescriptor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!prototypeConstructorIsTrusted(promise)) throw boundaryError();
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
  defineProperty(promise, "constructor", {
    value: safePromiseConstructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let restored = false;
  try {
    reflectApply(trustedPromiseThen, promise, [onFulfilled, onRejected]);
  } finally {
    if (constructorDescriptor === undefined) {
      restored = deleteProperty(promise, "constructor") === true;
    } else {
      try {
        defineProperty(promise, "constructor", constructorDescriptor);
        restored = true;
      } catch {
        restored = false;
      }
    }
  }
  if (!restored) throw boundaryError();
}
'''
if old not in s:
    raise SystemExit('provider observe target missing')
s = s.replace(old, new, 1)
p.write_text(s)

# contract-protection-proposal.js
p = Path('src/contract-protection-proposal.js')
s = p.read_text()
old = '''function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  if (
    isProxy(promise) === true ||
    !isPromiseBrand(promise) ||
    getPrototypeOf(promise) !== promisePrototype
  ) throw boundaryError();

  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");
  if (previousConstructor === undefined) {
    if (isExtensible(promise) !== true) throw boundaryError();
  } else if (previousConstructor.configurable !== true) {
    throw boundaryError();
  }

  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });

  let observationEstablished = false;
  try {
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    observationEstablished = true;
  } finally {
    if (previousConstructor === undefined) {
      if (deleteProperty(promise, "constructor") !== true) {
        observationEstablished = false;
      }
    } else {
      try {
        defineProperty(promise, "constructor", previousConstructor);
      } catch {
        observationEstablished = false;
      }
    }
  }
  if (!observationEstablished) throw boundaryError();
}
'''
new = '''function trustedPromiseConstructorDescriptor(descriptor) {
  return (
    descriptor !== undefined &&
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.value === trustedPromiseConstructor
  );
}

function observeAcceptedPromise(promise, onFulfilled, onRejected) {
  if (
    isProxy(promise) === true ||
    !isPromiseBrand(promise) ||
    getPrototypeOf(promise) !== promisePrototype
  ) throw boundaryError();

  const previousConstructor = getOwnPropertyDescriptor(promise, "constructor");
  if (
    previousConstructor !== undefined &&
    previousConstructor.configurable !== true
  ) {
    if (!trustedPromiseConstructorDescriptor(previousConstructor)) throw boundaryError();
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    return;
  }
  if (
    previousConstructor === undefined &&
    isExtensible(promise) !== true
  ) {
    if (!trustedPromiseConstructorDescriptor(
      getOwnPropertyDescriptor(promisePrototype, "constructor")
    )) throw boundaryError();
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    return;
  }

  defineProperty(promise, "constructor", {
    value: safePromiseSpeciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });
  let observationEstablished = false;
  try {
    reflectApply(promiseThen, promise, [onFulfilled, onRejected]);
    observationEstablished = true;
  } finally {
    if (previousConstructor === undefined) {
      if (deleteProperty(promise, "constructor") !== true) observationEstablished = false;
    } else {
      try {
        defineProperty(promise, "constructor", previousConstructor);
      } catch {
        observationEstablished = false;
      }
    }
  }
  if (!observationEstablished) throw boundaryError();
}
'''
if old not in s:
    raise SystemExit('proposal observe target missing')
s = s.replace(old, new, 1)
p.write_text(s)

# contract-quality-loop.js
p = Path('src/contract-quality-loop.js')
s = p.read_text()
if 'const { runInNewContext } = require("node:vm");' not in s:
    s = s.replace('const { Buffer } = require("node:buffer");\n', 'const { Buffer } = require("node:buffer");\nconst { runInNewContext } = require("node:vm");\n')
if 'const functionToString = Function.prototype.toString;' not in s:
    s = s.replace('const deleteProperty = Reflect.deleteProperty;\n', 'const deleteProperty = Reflect.deleteProperty;\nconst functionToString = Function.prototype.toString;\n')
old = '''const PromiseConstructor =
  PromiseConstructorDescriptor !== undefined &&
  !("get" in PromiseConstructorDescriptor) &&
  !("set" in PromiseConstructorDescriptor) &&
  typeof PromiseConstructorDescriptor.value === "function"
    ? PromiseConstructorDescriptor.value
    : null;
const PromiseThen =
  PromiseThenDescriptor !== undefined &&
  !("get" in PromiseThenDescriptor) &&
  !("set" in PromiseThenDescriptor) &&
  typeof PromiseThenDescriptor.value === "function"
    ? PromiseThenDescriptor.value
    : null;
const PromiseSpecies = Symbol.species;
const TypeErrorConstructor = TypeError;
'''
new = '''let PromiseConstructor = null;
let PromiseThen = null;
try {
  const pristinePromiseConstructorSource = runInNewContext(
    "Function.prototype.toString.call(Promise)"
  );
  const pristinePromiseThenSource = runInNewContext(
    "Function.prototype.toString.call(Promise.prototype.then)"
  );
  const constructorCandidate =
    PromiseConstructorDescriptor !== undefined &&
    !("get" in PromiseConstructorDescriptor) &&
    !("set" in PromiseConstructorDescriptor)
      ? PromiseConstructorDescriptor.value
      : null;
  const thenCandidate =
    PromiseThenDescriptor !== undefined &&
    !("get" in PromiseThenDescriptor) &&
    !("set" in PromiseThenDescriptor)
      ? PromiseThenDescriptor.value
      : null;
  if (
    typeof constructorCandidate === "function" &&
    isProxy(constructorCandidate) !== true &&
    reflectApply(functionToString, constructorCandidate, []) === pristinePromiseConstructorSource &&
    typeof thenCandidate === "function" &&
    isProxy(thenCandidate) !== true &&
    reflectApply(functionToString, thenCandidate, []) === pristinePromiseThenSource
  ) {
    PromiseConstructor = constructorCandidate;
    PromiseThen = thenCandidate;
  }
} catch {
  PromiseConstructor = null;
  PromiseThen = null;
}
const PromiseSpecies = Symbol.species;
'''
if old not in s:
    raise SystemExit('M12 Promise target missing')
s = s.replace(old, new, 1)
s = s.replace('  TypeErrorConstructor,\n', '')
old = '''function boundaryError() {
  return new TypeErrorConstructor("Invalid M12 contract-quality-loop boundary.");
}
'''
new = '''function boundaryError() {
  try {
    null.m12QualityLoopBoundary;
  } catch (error) {
    return error;
  }
  return null;
}

async function rejectQualityLoopBoundary(error) {
  throw error;
}
'''
if old not in s:
    raise SystemExit('M12 boundary target missing')
s = s.replace(old, new, 1)
old = '''function createPublicPromise(start) {
  return new PromiseConstructor((resolve, reject) => {
    try {
      start(resolve, reject);
    } catch {
      reject(boundaryError());
    }
  });
}
'''
new = '''function createPublicPromise(start) {
  if (typeof PromiseConstructor !== "function") {
    return rejectQualityLoopBoundary(boundaryError());
  }
  return new PromiseConstructor((resolve, reject) => {
    try {
      start(resolve, reject);
    } catch {
      reject(boundaryError());
    }
  });
}
'''
if old not in s:
    raise SystemExit('M12 public Promise target missing')
s = s.replace(old, new, 1)
p.write_text(s)

# mutation-pack.js
p = Path('src/mutation-pack.js')
s = p.read_text()
if 'const { runInNewContext } = require("node:vm");' not in s:
    s = s.replace('const { types: utilTypes } = require("node:util");\n', 'const { types: utilTypes } = require("node:util");\nconst { runInNewContext } = require("node:vm");\n')
start = s.index('const mutationPromiseConstructorDescriptor =')
end = s.index('\n\nconst callbackReceiver', start)
replacement = '''const mutationPromiseConstructorDescriptor =
  getOwnPropertyDescriptor(mutationPromisePrototype, "constructor");
const mutationPromiseThenDescriptor =
  getOwnPropertyDescriptor(mutationPromisePrototype, "then");
let promiseThen = null;
try {
  const thenCandidate =
    mutationPromiseThenDescriptor !== undefined &&
    !("get" in mutationPromiseThenDescriptor) &&
    !("set" in mutationPromiseThenDescriptor)
      ? mutationPromiseThenDescriptor.value
      : null;
  const pristinePromiseThenSource = runInNewContext(
    "Function.prototype.toString.call(Promise.prototype.then)"
  );
  if (
    typeof thenCandidate === "function" &&
    utilTypes.isProxy(thenCandidate) !== true &&
    Reflect.apply(functionToString, thenCandidate, []) === pristinePromiseThenSource
  ) {
    promiseThen = thenCandidate;
  }
} catch {
  promiseThen = null;
}

const safePromiseSpecies = Object.freeze({
  [Symbol.species]: null
});'''
s = s[:start] + replacement + s[end:]
old = '''  consumeNativePromiseRejection(
    value
  );

  throw new Error(
'''
new = '''  if (typeof promiseThen === "function") {
    consumeNativePromiseRejection(
      value
    );
  }

  throw new Error(
'''
if old not in s:
    raise SystemExit('mutation reject target missing')
s = s.replace(old, new, 1)
p.write_text(s)

# Permanent regressions
p = Path('test/m13-review-remediation.test.js')
s = p.read_text()
marker = 'test("accessor-backed global Promise is rejected without getter execution"'
if marker not in s:
    s += r'''

test("accessor-backed global Promise is rejected without getter execution", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const original = Object.getOwnPropertyDescriptor(globalThis, "Promise");
    let getterCalls = 0;
    Object.defineProperty(globalThis, "Promise", {
      get() { getterCalls += 1; return NativePromise; }, configurable: true
    });
    let api;
    try { api = require(${JSON.stringify(modulePath)}); } catch (error) {
      console.error(error); process.exit(7);
    }
    Object.defineProperty(globalThis, "Promise", original);
    if (getterCalls !== 0) process.exitCode = 2;
    try { api.createStructuredProviderAdapter({}); } catch (error) {
      if (!(error instanceof TypeError)) process.exitCode = 3;
    }
    if (getterCalls !== 0) process.exitCode = 4;
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("poisoned global TypeError is never used by M13 provider adapter boundaries", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativeTypeError = TypeError;
    let poisonCalls = 0;
    global.TypeError = function PoisonTypeError() { poisonCalls += 1; return new Error("poison"); };
    const api = require(${JSON.stringify(modulePath)});
    global.TypeError = NativeTypeError;
    try { api.createStructuredProviderAdapter({}); } catch (error) {
      if (!(error instanceof NativeTypeError)) process.exitCode = 2;
    }
    if (poisonCalls !== 0) process.exitCode = 3;
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});

test("M12 rejects pre-load Promise constructor Proxy authority without executing it", () => {
  const modulePath = path.join(repoRoot, "src", "index.js");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const descriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "constructor");
    let proxyCalls = 0;
    const ProxyPromise = new Proxy(NativePromise, {
      construct(target, args, newTarget) { proxyCalls += 1; return Reflect.construct(target, args, newTarget); }
    });
    Object.defineProperty(NativePromise.prototype, "constructor", {
      value: ProxyPromise, writable: true, enumerable: false, configurable: true
    });
    const api = require(${JSON.stringify(modulePath)});
    Object.defineProperty(NativePromise.prototype, "constructor", descriptor);
    const returned = api.prepareContractQualityLoop({});
    if (!(returned instanceof NativePromise)) process.exitCode = 2;
    returned.then(
      () => { process.exitCode = 3; },
      (error) => {
        if (!(error instanceof TypeError)) process.exitCode = 4;
        if (proxyCalls !== 0) process.exitCode = 5;
      }
    );
  `;
  const run = spawnSync(process.execPath, ["-e", code], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
});
'''
p.write_text(s)
