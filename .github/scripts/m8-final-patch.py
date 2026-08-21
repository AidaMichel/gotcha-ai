from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f"{label} marker missing")
    return text.replace(old, new, 1)


# ---------------- ai-data.js ----------------
path = Path("src/ai-data.js")
text = path.read_text()

old = '''const weakRefDeref =
  capturePrototypeMethod(
'''
new = '''const additionalHostBrandMethodProbes =
  Object.freeze(
    [
      {
        method:
          capturePrototypeMethod(
            captureGlobalConstructor(
              "Headers"
            ),
            "get"
          ),
        args: [
          "__gotcha_brand_probe__"
        ]
      },
      {
        method:
          capturePrototypeMethod(
            captureGlobalConstructor(
              "FormData"
            ),
            "get"
          ),
        args: [
          "__gotcha_brand_probe__"
        ]
      }
    ].filter(
      (probe) =>
        probe.method !== null
    )
  );

const weakRefDeref =
  capturePrototypeMethod(
'''
text = replace_once(
    text,
    old,
    new,
    "ai-data host method probes",
)

old = '''const webAssemblyInstanceExportsGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Instance ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Instance,
        "exports"
      )
    : null;
'''
new = old + '''
const webAssemblyMemoryBufferGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Memory ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Memory,
        "buffer"
      )
    : null;

const webAssemblyTableLengthGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Table ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Table,
        "length"
      )
    : null;

const webAssemblyGlobalValueGetter =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Global ===
    "function"
    ? capturePrototypeGetter(
        WebAssembly.Global,
        "value"
      )
    : null;
'''
text = replace_once(
    text,
    old,
    new,
    "ai-data WebAssembly probes",
)

old = '''function hasUnsupportedAdditionalBrand(
  value
) {
  if (weakRefDeref !== null) {
'''
new = '''function hasUnsupportedAdditionalBrand(
  value
) {
  for (
    const probe of
      additionalHostBrandMethodProbes
  ) {
    try {
      reflectApply(
        probe.method,
        value,
        probe.args
      );

      return true;
    } catch {}
  }

  for (
    const getter of [
      webAssemblyMemoryBufferGetter,
      webAssemblyTableLengthGetter,
      webAssemblyGlobalValueGetter
    ]
  ) {
    if (getter === null) {
      continue;
    }

    try {
      reflectApply(
        getter,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (weakRefDeref !== null) {
'''
text = replace_once(
    text,
    old,
    new,
    "ai-data additional brand checks",
)

path.write_text(text)


# ---------------- contract-attacks.js ----------------
path = Path("src/contract-attacks.js")
text = path.read_text()

text = replace_once(
    text,
    '''const defineProperty =
  Object.defineProperty;

const isExtensible =
''',
    '''const defineProperty =
  Object.defineProperty;

const setPrototypeOf =
  Object.setPrototypeOf;

const isExtensible =
''',
    "contract setPrototypeOf",
)

text = replace_once(
    text,
    '''const objectFreeze =
  Object.freeze;

const promisePrototype =
''',
    '''const objectFreeze =
  Object.freeze;

const arrayMap =
  Array.prototype.map;

const arrayFind =
  Array.prototype.find;

const promisePrototype =
''',
    "contract captured array intrinsics",
)

text = replace_once(
    text,
    '''const promiseSpeciesDescriptor =
  getOwnPropertyDescriptor(
    promiseConstructor,
    promiseSpecies
  );

const hasOwnProperty =
''',
    '''const promiseSpeciesDescriptor =
  getOwnPropertyDescriptor(
    promiseConstructor,
    promiseSpecies
  );

const safePromiseSpeciesContainer = {};

defineProperty(
  safePromiseSpeciesContainer,
  promiseSpecies,
  {
    value:
      promiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  }
);

objectFreeze(
  safePromiseSpeciesContainer
);

const hasOwnProperty =
''',
    "contract safe Promise species container",
)

start = text.index("function restorePromiseConstructor(\n")
end = text.index("function passPromiseValue(\n", start)
current_block = text[start:end]
if "function canInstallSafePromiseConstructor" not in current_block:
    replacement = '''function restorePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(
      holder,
      "constructor"
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    descriptor
  );
}

function canInstallSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    return isExtensible(holder);
  }

  if (descriptor.configurable) {
    return true;
  }

  return (
    !("get" in descriptor) &&
    !("set" in descriptor) &&
    descriptor.writable
  );
}

function installSafePromiseConstructor(
  holder,
  descriptor
) {
  if (descriptor === undefined) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable: false,
        configurable: true
      }
    );

    return;
  }

  if (descriptor.configurable) {
    defineProperty(
      holder,
      "constructor",
      {
        value:
          safePromiseSpeciesContainer,
        writable: true,
        enumerable:
          descriptor.enumerable,
        configurable: true
      }
    );

    return;
  }

  defineProperty(
    holder,
    "constructor",
    {
      value:
        safePromiseSpeciesContainer
    }
  );
}

function withTemporarySafePromiseConstructor(
  holder,
  descriptor,
  callback
) {
  installSafePromiseConstructor(
    holder,
    descriptor
  );

  try {
    return callback();
  } finally {
    restorePromiseConstructor(
      holder,
      descriptor
    );
  }
}

function withSafePromiseConstructor(
  value,
  callback
) {
  if (
    !utilTypes.isPromise(value) ||
    utilTypes.isProxy(value)
  ) {
    throw new Error(
      "Generator native Promise must be a genuine Promise object."
    );
  }

  const ownConstructor =
    getOwnPropertyDescriptor(
      value,
      "constructor"
    );

  if (
    canInstallSafePromiseConstructor(
      value,
      ownConstructor
    )
  ) {
    return withTemporarySafePromiseConstructor(
      value,
      ownConstructor,
      callback
    );
  }

  if (ownConstructor !== undefined) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototype =
    getPrototypeOf(value);

  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypes.isProxy(prototype)
  ) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototypeConstructor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    !canInstallSafePromiseConstructor(
      prototype,
      prototypeConstructor
    )
  ) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  return withTemporarySafePromiseConstructor(
    prototype,
    prototypeConstructor,
    callback
  );
}

'''
    text = text[:start] + replacement + text[end:]

old = '''function bridgeNativePromise(
  value
) {
  return withSafePromiseConstructor(
    value,
    () =>
      reflectApply(
        promiseThen,
        value,
        [
          passPromiseValue,
          rethrowPromiseReason
        ]
      )
  );
}
'''
new = '''function bridgeNativePromise(
  value
) {
  return new promiseConstructor(
    (resolve, reject) => {
      withSafePromiseConstructor(
        value,
        () =>
          reflectApply(
            promiseThen,
            value,
            [
              resolve,
              reject
            ]
          )
      );
    }
  );
}
'''
text = replace_once(
    text,
    old,
    new,
    "contract native Promise bridge",
)

if "observeNativePromise(result);\n      requirePromiseIntrinsicIntegrity();" not in text:
    old = '''    if (utilTypes.isPromise(result)) {
      observeNativePromise(result);

      throw new Error(
'''
    new = '''    if (utilTypes.isPromise(result)) {
      observeNativePromise(result);
      requirePromiseIntrinsicIntegrity();

      throw new Error(
'''
    text = replace_once(
        text,
        old,
        new,
        "contract evaluator Promise post-check",
    )

if '''    requirePromiseIntrinsicIntegrity();

    if (typeof result !== "boolean") {''' not in text:
    old = '''    if (typeof result !== "boolean") {
'''
    new = '''    requirePromiseIntrinsicIntegrity();

    if (typeof result !== "boolean") {
'''
    text = replace_once(
        text,
        old,
        new,
        "contract evaluator boolean post-check",
    )

if "function isolateGeneratorData" not in text:
    old = '''function buildGeneratorArguments(
  contract,
  input,
  expectedOutput
) {
  return {
'''
    new = '''function isolateGeneratorData(
  value
) {
  const seen =
    new WeakSet();

  const stack = [value];

  while (stack.length > 0) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    seen.add(current);

    const descriptors =
      getOwnPropertyDescriptors(
        current
      );

    for (
      const key of ownKeys(descriptors)
    ) {
      const descriptor =
        descriptors[key];

      if (
        descriptor !== undefined &&
        "value" in descriptor &&
        descriptor.value !== null &&
        typeof descriptor.value ===
          "object"
      ) {
        stack.push(
          descriptor.value
        );
      }
    }

    setPrototypeOf(
      current,
      null
    );
  }

  return value;
}

function buildGeneratorArguments(
  contract,
  input,
  expectedOutput
) {
  return isolateGeneratorData({
'''
    text = replace_once(
        text,
        old,
        new,
        "contract generator prototype isolation",
    )
    text = replace_once(
        text,
        '''    instructions:
      GENERATOR_INSTRUCTIONS
  };
}
''',
        '''    instructions:
      GENERATOR_INSTRUCTIONS
  });
}
''',
        "contract generator isolation return",
    )

old = '''function invokeGenerator(
  generator,
  argumentsObject
) {
  const returned =
    reflectApply(
      generator,
      undefined,
      [argumentsObject]
    );

  const isNativePromise =
    utilTypes.isPromise(returned);

  return objectFreeze({
    returned:
      isNativePromise
        ? bridgeNativePromise(
            returned
          )
        : returned,
    isNativePromise
  });
}
'''
new = '''function invokeGenerator(
  generator,
  argumentsObject
) {
  const returned =
    reflectApply(
      generator,
      undefined,
      [argumentsObject]
    );

  const isNativePromise =
    utilTypes.isPromise(returned);

  const bridged =
    isNativePromise
      ? bridgeNativePromise(
          returned
        )
      : returned;

  try {
    requirePromiseIntrinsicIntegrity();
  } catch (error) {
    if (isNativePromise) {
      observeNativePromise(
        bridged
      );
    }

    throw error;
  }

  return objectFreeze({
    returned: bridged,
    isNativePromise
  });
}
'''
text = replace_once(
    text,
    old,
    new,
    "contract generator post-callback integrity",
)

old = '''  const ruleById =
    new Map(
      contract.rules.map(
        (rule) => [
          rule.id,
          rule
        ]
      )
    );

  const attackIds =
    new Set();

  const attacks =
    snapshot.attacks.map(
      (attackCandidate, index) =>
        normalizeGeneratorAttack(
          attackCandidate,
          index,
          attackIds,
          ruleById
        )
    );
'''
new = '''  const ruleById =
    new Map(
      reflectApply(
        arrayMap,
        contract.rules,
        [
          (rule) => [
            rule.id,
            rule
          ]
        ]
      )
    );

  const attackIds =
    new Set();

  const attacks =
    reflectApply(
      arrayMap,
      snapshot.attacks,
      [
        (attackCandidate, index) =>
          normalizeGeneratorAttack(
            attackCandidate,
            index,
            attackIds,
            ruleById
          )
      ]
    );
'''
text = replace_once(
    text,
    old,
    new,
    "contract captured validation maps",
)

old = '''  return retained.find(
    (existing) =>
      existing.ruleId ===
        candidate.ruleId &&
      isDeepStrictEqual(
        existing.mutatedOutput,
        candidate.mutatedOutput
      )
  );
'''
new = '''  return reflectApply(
    arrayFind,
    retained,
    [
      (existing) =>
        existing.ruleId ===
          candidate.ruleId &&
        isDeepStrictEqual(
          existing.mutatedOutput,
          candidate.mutatedOutput
        )
    ]
  );
'''
text = replace_once(
    text,
    old,
    new,
    "contract captured duplicate find",
)

old = '''function compileAllGeneratedAttacks(
  retained
) {
  return retained.map(
    (candidate) =>
      compileGeneratedAttack(candidate)
  );
}
'''
new = '''function compileAllGeneratedAttacks(
  retained
) {
  return reflectApply(
    arrayMap,
    retained,
    [
      (candidate) =>
        compileGeneratedAttack(
          candidate
        )
    ]
  );
}
'''
text = replace_once(
    text,
    old,
    new,
    "contract captured compile map",
)

path.write_text(text)


# ---------------- round-3 regression file ----------------
Path("test/m8-codex-round3.test.js").write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { cloneAiData } = require("../src/ai-data");
const { runContractAttacks } = require("../src/contract-attacks");

function makeContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "critical"
      }
    ]
  };
}

function validGeneratorOutput() {
  return {
    version: 1,
    task: "Return the approved time.",
    attacks: [
      {
        id: "wrong-time",
        ruleId: "time-rule",
        type: "wrong-time",
        description: "Changes the approved time.",
        rationale: "Proposed violation of the confirmed time rule.",
        mutatedOutput: { time: "4 PM" },
        scores: {
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        }
      }
    ]
  };
}

function makeOptions(generator, input = { request: "3 PM" }) {
  return {
    contract: makeContract(),
    input,
    expectedOutput: { time: "3 PM" },
    evaluator() {
      return true;
    },
    generator
  };
}

async function captureUnhandled(callback) {
  let unhandled = null;
  const listener = (reason) => {
    unhandled = reason;
  };
  process.once("unhandledRejection", listener);
  try {
    await callback();
    await new Promise((resolve) => setImmediate(resolve));
    return unhandled;
  } finally {
    process.removeListener("unhandledRejection", listener);
  }
}

test("Headers and FormData brands remain rejected when own data is added", () => {
  const candidates = [];
  if (typeof Headers === "function") {
    candidates.push(new Headers());
  }
  if (typeof FormData === "function") {
    candidates.push(new FormData());
  }

  for (const value of candidates) {
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);
    assert.throws(
      () => cloneAiData(value),
      /unsupported runtime object/
    );
  }
});

test("WebAssembly hidden-slot families fail closed without structuredClone fallback", () => {
  const candidates = [];
  if (typeof WebAssembly.Memory === "function") {
    candidates.push(new WebAssembly.Memory({ initial: 1 }));
  }
  if (typeof WebAssembly.Table === "function") {
    candidates.push(new WebAssembly.Table({ initial: 1, element: "anyfunc" }));
  }
  if (typeof WebAssembly.Global === "function") {
    candidates.push(new WebAssembly.Global({ value: "i32", mutable: true }, 1));
  }

  for (const value of candidates) {
    value.foo = "bar";
    Object.setPrototypeOf(value, Object.prototype);
    assert.throws(
      () => cloneAiData(value),
      /unsupported runtime object/
    );
  }
});

test("non-extensible cross-realm rejected Promises are observed", async () => {
  const unhandled = await captureUnhandled(async () => {
    const promise = vm.runInNewContext(`
      (() => {
        const value = Promise.reject(new Error("foreign rejection"));
        Object.preventExtensions(value);
        return value;
      })()
    `);

    await assert.rejects(
      runContractAttacks(
        makeOptions(() => promise)
      ),
      /foreign rejection/
    );
  });

  assert.equal(unhandled, null);
});

test("generator data does not expose shared Object or Array prototypes", async () => {
  const result = await runContractAttacks(
    makeOptions(
      ({ contract, input, expectedOutput }) => {
        assert.equal(Object.getPrototypeOf(input), null);
        assert.equal(Object.getPrototypeOf(contract), null);
        assert.equal(Object.getPrototypeOf(contract.rules), null);
        assert.equal(Object.getPrototypeOf(expectedOutput), null);
        return validGeneratorOutput();
      },
      ["3 PM"]
    )
  );

  assert.equal(result.generatedAttacks.length, 1);
});

test("callback-time Promise intrinsic tampering observes rejection before failing closed", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const modulePath = path.resolve(__dirname, "../src/contract-attacks.js");
  const script = `
    const { runContractAttacks } = require(${JSON.stringify(modulePath)});
    const species = Symbol.species;
    const originalSpecies = Object.getOwnPropertyDescriptor(Promise, species);
    let unhandled = false;
    process.on("unhandledRejection", () => { unhandled = true; });

    const options = {
      contract: {
        version: 1,
        status: "confirmed",
        task: "Return the approved time.",
        rules: [{
          id: "time-rule",
          statement: "Time must be 3 PM.",
          kind: "required",
          severity: "critical"
        }]
      },
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator() { return true; },
      generator() {
        Object.defineProperty(Promise, species, {
          configurable: true,
          get() { throw new Error("hostile species"); }
        });
        return Promise.reject(new Error("generator rejection"));
      }
    };

    const result = runContractAttacks(options);
    Object.defineProperty(Promise, species, originalSpecies);
    result.then(
      () => { console.error("unexpected resolve"); process.exitCode = 2; },
      (error) => {
        if (!/Promise intrinsic integrity check failed/.test(String(error && error.message))) {
          console.error(error);
          process.exitCode = 3;
        }
      }
    );

    setImmediate(() => {
      if (unhandled) {
        console.error("unhandled rejection leaked");
        process.exitCode = 4;
      }
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["-e", script],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});
''')

print("M8 final adversarial patch prepared.")
