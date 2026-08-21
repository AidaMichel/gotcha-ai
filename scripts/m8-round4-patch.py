from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 regex match, found {count}")
    return updated


# ---------------- ai-data.js ----------------
ai_path = ROOT / "src" / "ai-data.js"
ai = ai_path.read_text()

if 'const vm =\n  require("node:vm");' not in ai:
    ai = replace_once(
        ai,
        'const workerThreads =\n  require("node:worker_threads");\n',
        'const workerThreads =\n  require("node:worker_threads");\n\nconst vm =\n  require("node:vm");\n',
        "ai-data vm import",
    )

if 'const objectFreeze =\n  Object.freeze;' not in ai:
    ai = replace_once(
        ai,
        'const defineProperty =\n  Object.defineProperty;\n',
        'const defineProperty =\n  Object.defineProperty;\n\nconst objectFreeze =\n  Object.freeze;\n\nconst arrayIsArray =\n  Array.isArray;\n\nconst objectIs =\n  Object.is;\n\nconst numberIsFinite =\n  Number.isFinite;\n\nconst numberIsInteger =\n  Number.isInteger;\n\nconst WeakSetConstructor =\n  WeakSet;\n\nconst WeakMapConstructor =\n  WeakMap;\n\nconst ArrayConstructor =\n  Array;\n',
        "ai-data captured intrinsics",
    )

ai = ai.replace('Object.freeze(', 'objectFreeze(')
ai = ai.replace('Array.isArray(', 'arrayIsArray(')
ai = ai.replace('Object.is(', 'objectIs(')
ai = ai.replace('Number.isFinite(', 'numberIsFinite(')
ai = ai.replace('Number.isInteger(', 'numberIsInteger(')
ai = ai.replace('new WeakSet()', 'new WeakSetConstructor()')
ai = ai.replace('new WeakMap()', 'new WeakMapConstructor()')
ai = ai.replace('new Array(entries.length)', 'new ArrayConstructor(entries.length)')

if 'function captureMethodFromPrototype(' not in ai:
    marker = '\nfunction captureGlobalConstructor(\n'
    helper = '''\nfunction captureMethodFromPrototype(\n  prototype,\n  propertyName\n) {\n  if (\n    prototype === null ||\n    typeof prototype !== "object" ||\n    utilTypes.isProxy(prototype)\n  ) {\n    return null;\n  }\n\n  const descriptor =\n    getOwnPropertyDescriptor(\n      prototype,\n      propertyName\n    );\n\n  return (\n    descriptor !== undefined &&\n    "value" in descriptor &&\n    typeof descriptor.value ===\n      "function"\n  )\n    ? descriptor.value\n    : null;\n}\n\n'''
    ai = replace_once(ai, marker, helper + marker.lstrip('\n'), "ai-data prototype method helper")

if 'const vmScriptCreateCachedData =' not in ai:
    marker = '\nfunction hasUnsupportedHostBrand(\n'
    block = '''\nconst vmScriptBasePrototype =\n  typeof vm.Script === "function" &&\n  vm.Script.prototype !== null &&\n  typeof vm.Script.prototype ===\n    "object"\n    ? getPrototypeOf(\n        vm.Script.prototype\n      )\n    : null;\n\nconst vmScriptCreateCachedData =\n  captureMethodFromPrototype(\n    vmScriptBasePrototype,\n    "createCachedData"\n  );\n\n'''
    ai = replace_once(ai, marker, block + marker.lstrip('\n'), "ai-data vm Script probe capture")

if 'vmScriptCreateCachedData !== null' not in ai:
    marker = '  return false;\n}\n\nfunction isStructuredCloneProbeSafe(\n'
    block = '''  if (vmScriptCreateCachedData !== null) {\n    try {\n      reflectApply(\n        vmScriptCreateCachedData,\n        value,\n        []\n      );\n\n      return true;\n    } catch {}\n  }\n\n  return false;\n}\n\nfunction isStructuredCloneProbeSafe(\n'''
    ai = replace_once(ai, marker, block, "ai-data vm Script brand check")

structured_replacement = '''function isStructuredCloneProbeSafe(\n  value\n) {\n  if (\n    value === null ||\n    typeof value !== "object" ||\n    utilTypes.isProxy(value)\n  ) {\n    return false;\n  }\n\n  let descriptors;\n\n  try {\n    descriptors =\n      getOwnPropertyDescriptors(\n        value\n      );\n  } catch {\n    return false;\n  }\n\n  for (\n    const key of ownKeys(descriptors)\n  ) {\n    if (typeof key === "symbol") {\n      return false;\n    }\n\n    const descriptor =\n      descriptors[key];\n\n    if (\n      "get" in descriptor ||\n      "set" in descriptor\n    ) {\n      return false;\n    }\n\n    const child =\n      descriptor.value;\n\n    if (\n      typeof child === "function" ||\n      typeof child === "symbol" ||\n      (\n        child !== null &&\n        typeof child === "object"\n      )\n    ) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\nfunction hasUncloneableStructuredCloneBrand(\n  value\n) {\n  if (\n    structuredCloneFunction === null ||\n    !isStructuredCloneProbeSafe(value)\n  ) {\n    return false;\n  }\n\n  try {\n    reflectApply(\n      structuredCloneFunction,\n      globalThis,\n      [value]\n    );\n\n    return false;\n  } catch (error) {\n    return (\n      error !== null &&\n      typeof error === "object" &&\n      error.name === "DataCloneError"\n    );\n  }\n}\n\nfunction isUnsupportedRuntimeObject'''

ai = regex_once(
    ai,
    r'function isStructuredCloneProbeSafe\(\n  value\n\) \{.*?\n\}\n\nfunction hasUncloneableStructuredCloneBrand\(\n  value\n\) \{.*?\n\}\n\nfunction isUnsupportedRuntimeObject',
    structured_replacement,
    "ai-data shallow structuredClone probe",
)

ai_path.write_text(ai)


# ---------------- contract-attacks.js ----------------
ca_path = ROOT / "src" / "contract-attacks.js"
ca = ca_path.read_text()

if 'const objectCreate =\n  Object.create;' not in ca:
    ca = replace_once(
        ca,
        'const getPrototypeOf =\n  Object.getPrototypeOf;\n',
        'const getPrototypeOf =\n  Object.getPrototypeOf;\n\nconst objectCreate =\n  Object.create;\n\nconst objectPrototype =\n  Object.prototype;\n\nconst arrayPrototype =\n  Array.prototype;\n\nconst arrayIsArray =\n  Array.isArray;\n\nconst functionToString =\n  Function.prototype.toString;\n\nconst SetConstructor =\n  Set;\n\nconst MapConstructor =\n  Map;\n\nconst WeakSetConstructor =\n  WeakSet;\n',
        "contract captured intrinsics",
    )

ca = ca.replace('Array.isArray(', 'arrayIsArray(')
ca = ca.replace('new Set()', 'new SetConstructor()')
ca = ca.replace('new WeakSet()', 'new WeakSetConstructor()')
ca = ca.replace('new Map(', 'new MapConstructor(')

if 'const promiseConstructorSource =' not in ca:
    marker = 'const safePromiseSpeciesContainer = {};\n'
    block = '''const promiseConstructorSource =\n  reflectApply(\n    functionToString,\n    promiseConstructor,\n    []\n  );\n\nconst promiseSpeciesGetterSource =\n  promiseSpeciesDescriptor !== undefined &&\n  typeof promiseSpeciesDescriptor.get ===\n    "function"\n    ? reflectApply(\n        functionToString,\n        promiseSpeciesDescriptor.get,\n        []\n      )\n    : null;\n\n'''
    ca = replace_once(ca, marker, block + marker, "contract Promise source captures")

if 'function buildSafeCallbackPrototype(' not in ca:
    marker = 'const MAX_RULES = 7;\n'
    block = '''function buildSafeCallbackPrototype(\n  sourcePrototype,\n  parentPrototype\n) {\n  const target =\n    objectCreate(parentPrototype);\n\n  const descriptors =\n    getOwnPropertyDescriptors(\n      sourcePrototype\n    );\n\n  for (\n    const key of ownKeys(descriptors)\n  ) {\n    if (\n      key === "constructor" ||\n      key === "__proto__" ||\n      key === Symbol.unscopables\n    ) {\n      continue;\n    }\n\n    const descriptor =\n      descriptors[key];\n\n    if (\n      !("value" in descriptor) ||\n      typeof descriptor.value !==\n        "function"\n    ) {\n      continue;\n    }\n\n    defineProperty(\n      target,\n      key,\n      {\n        value:\n          descriptor.value,\n        writable: false,\n        enumerable:\n          descriptor.enumerable,\n        configurable: false\n      }\n    );\n  }\n\n  return objectFreeze(target);\n}\n\nconst safeCallbackObjectPrototype =\n  buildSafeCallbackPrototype(\n    objectPrototype,\n    null\n  );\n\nconst safeCallbackArrayPrototype =\n  buildSafeCallbackPrototype(\n    arrayPrototype,\n    safeCallbackObjectPrototype\n  );\n\n'''
    ca = replace_once(ca, marker, block + marker, "contract safe callback prototypes")

if 'function isAuthenticatedStandardPromisePrototype(' not in ca:
    marker = 'function restorePromiseConstructor(\n'
    block = '''function isAuthenticatedStandardPromisePrototype(\n  prototype,\n  constructorDescriptor\n) {\n  if (\n    prototype === null ||\n    typeof prototype !== "object" ||\n    utilTypes.isProxy(prototype) ||\n    constructorDescriptor === undefined ||\n    "get" in constructorDescriptor ||\n    "set" in constructorDescriptor ||\n    typeof constructorDescriptor.value !==\n      "function" ||\n    utilTypes.isProxy(\n      constructorDescriptor.value\n    ) ||\n    promiseSpeciesGetterSource === null\n  ) {\n    return false;\n  }\n\n  const constructor =\n    constructorDescriptor.value;\n\n  let constructorSource;\n  let prototypeDescriptor;\n  let speciesDescriptor;\n  let speciesGetterSource;\n\n  try {\n    constructorSource =\n      reflectApply(\n        functionToString,\n        constructor,\n        []\n      );\n\n    prototypeDescriptor =\n      getOwnPropertyDescriptor(\n        constructor,\n        "prototype"\n      );\n\n    speciesDescriptor =\n      getOwnPropertyDescriptor(\n        constructor,\n        promiseSpecies\n      );\n\n    speciesGetterSource =\n      speciesDescriptor !== undefined &&\n      typeof speciesDescriptor.get ===\n        "function" &&\n      !utilTypes.isProxy(\n        speciesDescriptor.get\n      )\n        ? reflectApply(\n            functionToString,\n            speciesDescriptor.get,\n            []\n          )\n        : null;\n  } catch {\n    return false;\n  }\n\n  return (\n    constructorSource ===\n      promiseConstructorSource &&\n    prototypeDescriptor !==\n      undefined &&\n    !("get" in prototypeDescriptor) &&\n    !("set" in prototypeDescriptor) &&\n    prototypeDescriptor.value ===\n      prototype &&\n    speciesDescriptor !== undefined &&\n    !("value" in speciesDescriptor) &&\n    speciesDescriptor.set === undefined &&\n    speciesGetterSource ===\n      promiseSpeciesGetterSource\n  );\n}\n\n'''
    ca = replace_once(ca, marker, block + marker, "contract foreign Promise authentication")

old_fallback = '''  if (\n    !canInstallSafePromiseConstructor(\n      prototype,\n      prototypeConstructor\n    )\n  ) {\n    throw new Error(\n      "Native Promise cannot be observed safely."\n    );\n  }\n\n  return withTemporarySafePromiseConstructor(\n    prototype,\n    prototypeConstructor,\n    callback\n  );\n'''
new_fallback = '''  if (\n    canInstallSafePromiseConstructor(\n      prototype,\n      prototypeConstructor\n    )\n  ) {\n    return withTemporarySafePromiseConstructor(\n      prototype,\n      prototypeConstructor,\n      callback\n    );\n  }\n\n  if (\n    isAuthenticatedStandardPromisePrototype(\n      prototype,\n      prototypeConstructor\n    )\n  ) {\n    return callback();\n  }\n\n  throw new Error(\n    "Native Promise cannot be observed safely."\n  );\n'''
if old_fallback in ca:
    ca = replace_once(ca, old_fallback, new_fallback, "contract frozen foreign Promise fallback")
elif new_fallback not in ca:
    raise SystemExit("contract frozen foreign Promise fallback: neither old nor new block found")

if 'function createEvaluatorSnapshot(' not in ca:
    marker = 'function createSafeEvaluator(\n'
    block = '''function createEvaluatorSnapshot(\n  value\n) {\n  const cloned =\n    cloneAiData(\n      value,\n      "Evaluator output"\n    );\n\n  if (\n    cloned === null ||\n    typeof cloned !== "object"\n  ) {\n    return cloned;\n  }\n\n  const seen =\n    new WeakSetConstructor();\n\n  const stack = [cloned];\n\n  while (stack.length > 0) {\n    const current =\n      stack.pop();\n\n    if (\n      current === null ||\n      typeof current !== "object" ||\n      seen.has(current)\n    ) {\n      continue;\n    }\n\n    seen.add(current);\n\n    const descriptors =\n      getOwnPropertyDescriptors(\n        current\n      );\n\n    for (\n      const key of ownKeys(descriptors)\n    ) {\n      const descriptor =\n        descriptors[key];\n\n      if (\n        descriptor !== undefined &&\n        "value" in descriptor &&\n        descriptor.value !== null &&\n        typeof descriptor.value ===\n          "object"\n      ) {\n        stack.push(\n          descriptor.value\n        );\n      }\n    }\n\n    setPrototypeOf(\n      current,\n      arrayIsArray(current)\n        ? safeCallbackArrayPrototype\n        : safeCallbackObjectPrototype\n    );\n\n    objectFreeze(current);\n  }\n\n  return cloned;\n}\n\n'''
    ca = replace_once(ca, marker, block + marker, "contract evaluator snapshot isolation")

old_eval = '''    const result =\n      reflectApply(\n        evaluator,\n        undefined,\n        [output]\n      );\n'''
new_eval = '''    const evaluatorOutput =\n      createEvaluatorSnapshot(\n        output\n      );\n\n    const result =\n      reflectApply(\n        evaluator,\n        undefined,\n        [evaluatorOutput]\n      );\n'''
if old_eval in ca:
    ca = replace_once(ca, old_eval, new_eval, "contract isolated evaluator call")
elif new_eval not in ca:
    raise SystemExit("contract isolated evaluator call: neither old nor new block found")

ca_path.write_text(ca)


# ---------------- round-4 regressions ----------------
test_path = ROOT / "test" / "m8-codex-round4.test.js"
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const {
  cloneAiData,
  snapshotAiData
} = require("../src/ai-data");

const {
  runContractAttacks
} = require("../src/contract-attacks");

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

function validGeneratorOutput(mutatedOutput = { time: "4 PM" }) {
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
        mutatedOutput,
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

function makeOptions({
  generator,
  evaluator = () => true,
  input = { request: "3 PM" },
  expectedOutput = { time: "3 PM" }
}) {
  return {
    contract: makeContract(),
    input,
    expectedOutput,
    evaluator,
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

test("rejected non-extensible foreign Promises with frozen standard prototypes are observed", async () => {
  const unhandled = await captureUnhandled(async () => {
    const promise = vm.runInNewContext(`
      (() => {
        const value = Promise.reject(new Error("frozen foreign rejection"));
        Object.preventExtensions(value);
        Object.freeze(Promise.prototype);
        return value;
      })()
    `);

    await assert.rejects(
      runContractAttacks(
        makeOptions({
          generator: () => promise
        })
      ),
      /frozen foreign rejection/
    );
  });

  assert.equal(unhandled, null);
});

test("prototype-tampered vm.Script remains an unsupported runtime object without executing code", () => {
  const marker = `__gotcha_vm_script_${Date.now()}_${Math.random()}`;
  const script = new vm.Script(`globalThis[${JSON.stringify(marker)}] = true`);

  delete script.sourceURL;
  delete script.sourceMapURL;
  script.foo = "bar";
  Object.setPrototypeOf(script, Object.prototype);

  assert.throws(
    () => cloneAiData(script),
    /unsupported runtime object/
  );

  assert.equal(globalThis[marker], undefined);
});

test("deep acyclic AI-safe objects remain supported without recursive structuredClone probing", () => {
  const root = {};
  let cursor = root;

  for (let index = 0; index < 2500; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }

  cursor.value = "ok";

  const cloned = cloneAiData(root);
  const snapshot = snapshotAiData(root);

  for (const candidate of [cloned, snapshot]) {
    let current = candidate;

    for (let index = 0; index < 2500; index += 1) {
      current = current.next;
    }

    assert.equal(current.value, "ok");
  }
});

test("evaluator-facing arrays cannot expose or mutate the process Array.prototype", async () => {
  let sawAttack = false;

  const result = await runContractAttacks(
    makeOptions({
      input: ["3 PM"],
      expectedOutput: ["3 PM"],
      generator: () => validGeneratorOutput(["4 PM"]),
      evaluator(output) {
        if (Array.isArray(output) && output[0] === "4 PM") {
          sawAttack = true;
          const prototype = Object.getPrototypeOf(output);

          assert.notEqual(prototype, Array.prototype);
          assert.equal(
            Reflect.set(
              prototype,
              "filter",
              () => []
            ),
            false
          );
        }

        return true;
      }
    })
  );

  assert.equal(sawAttack, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.equal(result.topFinding.id, "wrong-time");
  assert.equal(Array.prototype.filter.call([1], () => true).length, 1);
});

test("callback-time Object.freeze tampering cannot disable detached frozen snapshots", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const modulePath = path.resolve(__dirname, "../src/contract-attacks.js");

  const script = `
    "use strict";
    const { runContractAttacks } = require(${JSON.stringify(modulePath)});

    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved time.",
      rules: [{
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "critical"
      }]
    };

    function generatorOutput() {
      return {
        version: 1,
        task: "Return the approved time.",
        attacks: [{
          id: "wrong-time",
          ruleId: "time-rule",
          type: "wrong-time",
          description: "Changes the approved time.",
          rationale: "Proposed violation.",
          mutatedOutput: { time: "4 PM" },
          scores: { realism: 1, subtlety: 1, novelty: 1, fixability: 1 }
        }]
      };
    }

    runContractAttacks({
      contract,
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator(output) {
        if (output.time === "4 PM") {
          if (Reflect.set(output, "time", "9 PM")) {
            throw new Error("evaluator output was mutable");
          }
        }
        return true;
      },
      generator() {
        Object.freeze = (value) => value;
        return generatorOutput();
      }
    }).then(
      (result) => {
        if (result.generatedAttacks[0].output.time !== "4 PM") {
          throw new Error("generated attack snapshot mutated");
        }
        if (result.attack.results[0].output.time !== "4 PM") {
          throw new Error("stored attack result mutated");
        }
      },
      (error) => {
        console.error(error);
        process.exitCode = 2;
      }
    );
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

print("✅ M8 round-4 source and regression patch applied.")
