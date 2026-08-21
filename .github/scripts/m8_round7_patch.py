from pathlib import Path


def section(text, start, end, replacement, label):
    start_index = text.find(start)
    if start_index < 0:
        raise SystemExit(f"missing start marker: {label}")
    end_index = text.find(end, start_index)
    if end_index < 0:
        raise SystemExit(f"missing end marker: {label}")
    return text[:start_index] + replacement + text[end_index:]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)


contract_path = Path("src/contract-attacks.js")
text = contract_path.read_text()

if "captureEvaluatorInstanceSemantics" in text and Path("test/m8-codex-round7.test.js").exists():
    print("Round 7 already applied")
    raise SystemExit(0)

text = replace_once(
    text,
    "const reflectApply =\n  Reflect.apply;\n",
    "const reflectApply =\n  Reflect.apply;\n\nconst reflectConstruct =\n  Reflect.construct;\n",
    "capture Reflect.construct"
)

text = replace_once(
    text,
    "const functionToString =\n  Function.prototype.toString;\n",
    "const functionToString =\n  Function.prototype.toString;\n\nconst objectConstructorSource =\n  reflectApply(\n    functionToString,\n    ObjectConstructor,\n    []\n  );\n\nconst arrayConstructorSource =\n  reflectApply(\n    functionToString,\n    ArrayConstructor,\n    []\n  );\n",
    "capture constructor sources"
)

text = replace_once(
    text,
    "const weakMapPrototype =\n  WeakMapConstructor.prototype;\n",
    "const weakMapPrototype =\n  WeakMapConstructor.prototype;\n\nconst weakMapGet =\n  WeakMapConstructor.prototype.get;\n\nconst weakMapSet =\n  WeakMapConstructor.prototype.set;\n\nconst weakSetHas =\n  WeakSetConstructor.prototype.has;\n\nconst weakSetAdd =\n  WeakSetConstructor.prototype.add;\n\nconst arrayIterator =\n  arrayPrototype[Symbol.iterator];\n\nconst stringIterator =\n  stringPrototype[Symbol.iterator];\n\nconst arrayIteratorPrototype =\n  getPrototypeOf(\n    reflectApply(\n      arrayIterator,\n      [],\n      []\n    )\n  );\n\nconst stringIteratorPrototype =\n  getPrototypeOf(\n    reflectApply(\n      stringIterator,\n      \"\",\n      []\n    )\n  );\n\nconst sharedIteratorPrototype =\n  getPrototypeOf(\n    arrayIteratorPrototype\n  );\n",
    "capture weak/iterator intrinsics"
)

old_instance_start = "function withSafeEvaluatorInstanceSemantics(\n  callback\n) {"
old_instance_end = "\n\nconst MAX_RULES = 7;"
new_instance = r'''function captureNativeRealmConstructor(
  prototype,
  expectedSource
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilIsProxy(prototype)
  ) {
    return null;
  }

  const descriptor =
    getOwnPropertyDescriptor(
      prototype,
      "constructor"
    );

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    typeof descriptor.value !==
      "function" ||
    utilIsProxy(descriptor.value)
  ) {
    return null;
  }

  const constructor =
    descriptor.value;

  try {
    const source =
      reflectApply(
        functionToString,
        constructor,
        []
      );

    const prototypeDescriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );

    if (
      source !== expectedSource ||
      prototypeDescriptor === undefined ||
      "get" in prototypeDescriptor ||
      "set" in prototypeDescriptor ||
      prototypeDescriptor.value !==
        prototype
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return constructor;
}

function addEvaluatorInstanceSemantic(
  semantics,
  constructor,
  hasInstance
) {
  if (constructor === null) {
    return;
  }

  for (
    let index = 0;
    index < semantics.length;
    index += 1
  ) {
    if (
      semantics[index].constructor ===
        constructor
    ) {
      return;
    }
  }

  reflectApply(
    arrayPush,
    semantics,
    [{ constructor, hasInstance }]
  );
}

function captureEvaluatorInstanceSemantics(
  value
) {
  const semantics = [];

  addEvaluatorInstanceSemantic(
    semantics,
    ArrayConstructor,
    safeArrayHasInstance
  );

  addEvaluatorInstanceSemantic(
    semantics,
    ObjectConstructor,
    safeObjectHasInstance
  );

  if (
    value === null ||
    typeof value !== "object" ||
    utilIsProxy(value)
  ) {
    return semantics;
  }

  const seen =
    new WeakSetConstructor();
  const stack = [value];

  while (stack.length > 0) {
    const current =
      reflectApply(
        arrayPop,
        stack,
        []
      );

    if (
      current === null ||
      typeof current !== "object" ||
      reflectApply(
        weakSetHas,
        seen,
        [current]
      ) ||
      utilIsProxy(current)
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      seen,
      [current]
    );

    let prototype;
    let descriptors;

    try {
      prototype =
        getPrototypeOf(current);
      descriptors =
        getOwnPropertyDescriptors(
          current
        );
    } catch {
      continue;
    }

    if (arrayIsArray(current)) {
      addEvaluatorInstanceSemantic(
        semantics,
        captureNativeRealmConstructor(
          prototype,
          arrayConstructorSource
        ),
        safeArrayHasInstance
      );

      const objectPrototype =
        prototype === null
          ? null
          : getPrototypeOf(prototype);

      addEvaluatorInstanceSemantic(
        semantics,
        captureNativeRealmConstructor(
          objectPrototype,
          objectConstructorSource
        ),
        safeObjectHasInstance
      );
    } else {
      addEvaluatorInstanceSemantic(
        semantics,
        captureNativeRealmConstructor(
          prototype,
          objectConstructorSource
        ),
        safeObjectHasInstance
      );
    }

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
        reflectApply(
          arrayPush,
          stack,
          [descriptor.value]
        );
      }
    }
  }

  return semantics;
}

function withSafeEvaluatorInstanceSemantics(
  semantics,
  callback
) {
  const installed = [];

  try {
    for (
      let index = 0;
      index < semantics.length;
      index += 1
    ) {
      const semantic =
        semantics[index];
      const constructor =
        semantic.constructor;
      const previousDescriptor =
        getOwnPropertyDescriptor(
          constructor,
          arrayHasInstanceSymbol
        );

      defineProperty(
        constructor,
        arrayHasInstanceSymbol,
        {
          value:
            semantic.hasInstance,
          writable: false,
          enumerable: false,
          configurable: true
        }
      );

      reflectApply(
        arrayPush,
        installed,
        [{
          constructor,
          previousDescriptor
        }]
      );
    }

    return callback();
  } finally {
    while (installed.length > 0) {
      const entry =
        reflectApply(
          arrayPop,
          installed,
          []
        );

      restoreOwnDescriptor(
        entry.constructor,
        arrayHasInstanceSymbol,
        entry.previousDescriptor
      );
    }
  }
}'''
text = section(text, old_instance_start, old_instance_end, new_instance, "instance semantics")

old_capture = r'''function captureCallbackIntrinsicSurfaces() {
  return [
    captureIntrinsicSurface(
      objectPrototype
    ),
    captureIntrinsicSurface(
      arrayPrototype
    ),
    captureIntrinsicSurface(
      stringPrototype
    ),
    captureIntrinsicSurface(
      mapPrototype
    ),
    captureIntrinsicSurface(
      setPrototype
    ),
    captureIntrinsicSurface(
      weakMapPrototype
    ),
    captureIntrinsicSurface(
      weakSetPrototype
    ),
    captureIntrinsicSurface(
      ObjectConstructor
    ),
    captureIntrinsicSurface(
      ArrayConstructor
    ),
    captureIntrinsicSurface(
      NumberConstructor
    )
  ];
}'''
new_capture = r'''function captureCallbackIntrinsicSurfaces() {
  return [
    captureIntrinsicSurface(
      objectPrototype
    ),
    captureIntrinsicSurface(
      arrayPrototype
    ),
    captureIntrinsicSurface(
      stringPrototype
    ),
    captureIntrinsicSurface(
      mapPrototype
    ),
    captureIntrinsicSurface(
      setPrototype
    ),
    captureIntrinsicSurface(
      weakMapPrototype
    ),
    captureIntrinsicSurface(
      weakSetPrototype
    ),
    captureIntrinsicSurface(
      arrayIteratorPrototype
    ),
    captureIntrinsicSurface(
      stringIteratorPrototype
    ),
    captureIntrinsicSurface(
      sharedIteratorPrototype
    ),
    captureIntrinsicSurface(
      ObjectConstructor
    ),
    captureIntrinsicSurface(
      ArrayConstructor
    ),
    captureIntrinsicSurface(
      NumberConstructor
    )
  ];
}'''
text = replace_once(text, old_capture, new_capture, "iterator surfaces")

old_wrapper = r'''function withRestoredCallbackIntrinsicSurfaces(
  callback,
  thisArg,
  args
) {
  const surfaces =
    captureCallbackIntrinsicSurfaces();

  try {
    return reflectApply(
      callback,
      thisArg,
      args
    );
  } finally {
    for (
      let index = 0;
      index < surfaces.length;
      index += 1
    ) {
      restoreIntrinsicSurface(
        surfaces[index]
      );
    }
  }
}'''
new_wrapper = r'''function restoreCallbackIntrinsicSurfaces(
  surfaces
) {
  for (
    let index = 0;
    index < surfaces.length;
    index += 1
  ) {
    restoreIntrinsicSurface(
      surfaces[index]
    );
  }
}

function withRestoredCallbackIntrinsicSurfaces(
  callback,
  thisArg,
  args
) {
  const surfaces =
    captureCallbackIntrinsicSurfaces();

  try {
    return reflectApply(
      callback,
      thisArg,
      args
    );
  } finally {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
  }
}'''
text = replace_once(text, old_wrapper, new_wrapper, "surface restoration helper")

text = replace_once(
    text,
    '''      ownConstructor.value ===\n        promiseConstructor\n    ) {\n      requirePromiseIntrinsicIntegrity();\n      return callback();\n    }''',
    '''      (\n        ownConstructor.value ===\n          promiseConstructor ||\n        ownConstructor.value ===\n          undefined\n      )\n    ) {\n      requirePromiseIntrinsicIntegrity();\n      return callback();\n    }''',
    "safe undefined Promise constructor"
)

text = replace_once(
    text,
    "function createSafeEvaluator(\n  evaluator\n) {",
    "function createSafeEvaluator(\n  evaluator,\n  instanceSemantics\n) {",
    "safe evaluator signature"
)

text = replace_once(
    text,
    '''      withSafeEvaluatorInstanceSemantics(\n        () =>\n          withRestoredCallbackIntrinsicSurfaces(''',
    '''      withSafeEvaluatorInstanceSemantics(\n        instanceSemantics,\n        () =>\n          withRestoredCallbackIntrinsicSurfaces(''',
    "safe evaluator realm semantics"
)

text = replace_once(
    text,
    '''    setPrototypeOf(\n      current,\n      null\n    );''',
    '''    setPrototypeOf(\n      current,\n      arrayIsArray(current)\n        ? safeCallbackArrayPrototype\n        : safeCallbackObjectPrototype\n    );''',
    "generator safe prototypes"
)

invoke_start = "function invokeGenerator(\n  generator,\n  argumentsObject\n) {"
invoke_end = "\n\nfunction normalizeGeneratorAttack("
new_invoke = r'''async function invokeGenerator(
  generator,
  argumentsObject
) {
  const surfaces =
    captureCallbackIntrinsicSurfaces();

  let returned;

  try {
    returned =
      reflectApply(
        generator,
        undefined,
        [argumentsObject]
      );
  } catch (error) {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    throw error;
  }

  const isNativePromise =
    utilIsPromise(returned);

  if (!isNativePromise) {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    requirePromiseIntrinsicIntegrity();
    return returned;
  }

  let bridged;

  try {
    bridged =
      bridgeNativePromise(
        returned
      );
    requirePromiseIntrinsicIntegrity();
  } catch (error) {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    throw error;
  }

  try {
    const settled =
      await bridged;

    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    requirePromiseIntrinsicIntegrity();

    return settled;
  } catch (error) {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    requirePromiseIntrinsicIntegrity();
    throw error;
  }
}'''
text = section(text, invoke_start, invoke_end, new_invoke, "async generator lifecycle")

text = replace_once(
    text,
    "function isAiDataEqual(\n  left,\n  right\n) {\n  const stack = [[left, right]];",
    "function isAiDataEqual(\n  left,\n  right\n) {\n  const stack = [[left, right]];\n  const compared =\n    new WeakMapConstructor();",
    "equality pair memo init"
)

memo_anchor = r'''    if (
      arrayIsArray(leftValue) !==
        arrayIsArray(rightValue)
    ) {
      return false;
    }

    const leftKeys ='''
memo_replacement = r'''    if (
      arrayIsArray(leftValue) !==
        arrayIsArray(rightValue)
    ) {
      return false;
    }

    let comparedRights =
      reflectApply(
        weakMapGet,
        compared,
        [leftValue]
      );

    if (comparedRights === undefined) {
      comparedRights =
        new WeakSetConstructor();
      reflectApply(
        weakMapSet,
        compared,
        [
          leftValue,
          comparedRights
        ]
      );
    } else if (
      reflectApply(
        weakSetHas,
        comparedRights,
        [rightValue]
      )
    ) {
      continue;
    }

    reflectApply(
      weakSetAdd,
      comparedRights,
      [rightValue]
    );

    const leftKeys ='''
text = replace_once(text, memo_anchor, memo_replacement, "equality pair memo")

text = replace_once(
    text,
    '''  const safeEvaluator =\n    createSafeEvaluator(evaluator);\n\n  if (!hasOwn(optionDescriptors, "input")) {''',
    '''  if (!hasOwn(optionDescriptors, "input")) {''',
    "delay safe evaluator creation"
)

safe_eval_insert = r'''  const evaluatorInstanceSemantics =
    captureEvaluatorInstanceSemantics(
      expectedOutputInput
    );

  const safeEvaluator =
    createSafeEvaluator(
      evaluator,
      evaluatorInstanceSemantics
    );

  const contract ='''
text = replace_once(
    text,
    "  const contract =\n    validateConfirmedContract(\n      contractInput\n    );",
    safe_eval_insert + "\n    validateConfirmedContract(\n      contractInput\n    );",
    "create evaluator with realm semantics"
)

old_gen_run = r'''  const generatorInvocation =
    invokeGenerator(
      generator,
      generatorArguments
    );

  const rawGeneratorOutput =
    generatorInvocation.isNativePromise
      ? await generatorInvocation.returned
      : generatorInvocation.returned;'''
new_gen_run = r'''  const rawGeneratorOutput =
    await invokeGenerator(
      generator,
      generatorArguments
    );'''
text = replace_once(text, old_gen_run, new_gen_run, "await generator lifecycle")

contract_path.write_text(text)

ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

ai = replace_once(
    ai,
    "const reflectApply =\n  Reflect.apply;\n",
    "const reflectApply =\n  Reflect.apply;\n\nconst reflectConstruct =\n  Reflect.construct;\n",
    "ai Reflect.construct"
)

wasm_anchor = r'''const webAssemblyGlobalValueGetter =
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
wasm_extra = wasm_anchor + r'''
const webAssemblyTagProbeSentinel =
  objectFreeze({});

const webAssemblyExceptionConstructor =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Exception ===
    "function"
    ? WebAssembly.Exception
    : null;

const webAssemblyTagProbeValues =
  webAssemblyExceptionConstructor !== null
    ? new Proxy(
        [],
        {
          get(target, key) {
            if (key === "length") {
              throw webAssemblyTagProbeSentinel;
            }

            return target[key];
          }
        }
      )
    : null;

const webAssemblyProbeTag =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Tag === "function"
    ? new WebAssembly.Tag({
        parameters: []
      })
    : null;

const webAssemblyExceptionIs =
  typeof WebAssembly === "object" &&
  WebAssembly !== null &&
  typeof WebAssembly.Exception ===
    "function"
    ? capturePrototypeMethod(
        WebAssembly.Exception,
        "is"
      )
    : null;
'''
ai = replace_once(ai, wasm_anchor, wasm_extra, "WebAssembly Tag/Exception probes")

additional_anchor = r'''  for (
    const getter of [
      webAssemblyMemoryBufferGetter,
      webAssemblyTableLengthGetter,
      webAssemblyGlobalValueGetter
    ]
  ) {'''
additional_replacement = r'''  if (
    webAssemblyExceptionConstructor !== null &&
    webAssemblyTagProbeValues !== null
  ) {
    try {
      reflectConstruct(
        webAssemblyExceptionConstructor,
        [
          value,
          webAssemblyTagProbeValues
        ]
      );

      return true;
    } catch (error) {
      if (
        error ===
          webAssemblyTagProbeSentinel
      ) {
        return true;
      }
    }
  }

  if (
    webAssemblyExceptionIs !== null &&
    webAssemblyProbeTag !== null
  ) {
    try {
      reflectApply(
        webAssemblyExceptionIs,
        value,
        [webAssemblyProbeTag]
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
  ) {'''
ai = replace_once(ai, additional_anchor, additional_replacement, "apply WebAssembly Tag/Exception probes")

ai_path.write_text(ai)

spec_path = Path("docs/M8_AI_ATTACKS_SPEC.md")
spec = spec_path.read_text()
spec_anchor = "Callbacks should remain deterministic and side-effect free. M8 restores the core built-in prototype surfaces around callback invocation as defense in depth so ordinary accidental prototype mutation cannot corrupt later validation or ranking, but M8 does not claim containment of deliberate irreversible sabotage of the host JavaScript realm by trusted callback code."
spec_replacement = spec_anchor + "\n\nFor asynchronous generators, that restoration boundary extends through settlement of the returned native Promise, so code after `await` cannot leave temporary built-in mutations behind before generator data is validated. Evaluator snapshots preserve ordinary local and authenticated cross-realm `instanceof Array` / `instanceof Object` behavior while keeping their exposed prototype graph detached."
spec = replace_once(spec, spec_anchor, spec_replacement, "spec async/cross-realm boundary")
spec_path.write_text(spec)

round7 = r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");

const {
  runContractAttacks
} = require("../src");

const {
  cloneAiData
} = require("../src/ai-data");

function confirmedContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved value.",
    rules: [
      {
        id: "value-rule",
        statement: "Return the approved value.",
        kind: "required",
        severity: "critical"
      }
    ]
  };
}

function attackOutput(mutatedOutput = { value: "wrong" }) {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: [
      {
        id: "wrong-value",
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
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

test("async generator intrinsic mutations are restored after settlement", async () => {
  const originalFilter = Array.prototype.filter;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    async generator() {
      await Promise.resolve();
      Array.prototype.filter = () => [];
      return attackOutput();
    }
  });

  assert.equal(Array.prototype.filter, originalFilter);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("non-configurable undefined Promise constructors are safely observed", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    (async () => {
      try {
        await runContractAttacks({
          contract,
          input: { request: "approved" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator() {
            const promise = Promise.reject(new Error("undefined constructor rejection"));
            Object.defineProperty(promise, "constructor", {
              value: undefined,
              writable: false,
              enumerable: false,
              configurable: false
            });
            return promise;
          }
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/undefined constructor rejection/.test(String(error && error.message))) {
          throw error;
        }
      }
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["--unhandled-rejections=strict", "-e", source],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

function sharedDag(depth, leafValue) {
  let node = { value: leafValue };

  for (let index = 0; index < depth; index += 1) {
    node = { left: node, right: node };
  }

  return node;
}

test("iterative equality memoizes shared object pairs", { timeout: 3000 }, async () => {
  const expectedOutput = sharedDag(24, "same");
  const mutatedOutput = sharedDag(24, "same");
  const startedAt = Date.now();

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator: () => true,
    generator: () => attackOutput(mutatedOutput)
  });

  assert.equal(result.generatedAttacks.length, 0);
  assert.equal(result.discardedAttacks[0].reason, "unchanged-output");
  assert.ok(Date.now() - startedAt < 2500);
});

test("generator arguments retain detached standard array methods", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: ["approved"],
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator({ contract, input }) {
      const ruleIds = contract.rules.map((rule) => rule.id);
      const copiedInput = input.map((value) => value);
      assert.deepEqual(ruleIds, ["value-rule"]);
      assert.deepEqual(copiedInput, ["approved"]);
      return attackOutput();
    }
  });

  assert.equal(result.generatedAttacks.length, 1);
});

test("cross-realm evaluators preserve ordinary instanceof Array semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext("[1, 2]", context);
  const evaluator = vm.runInContext("(output) => output instanceof Array", context);
  let generatorCalled = false;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      generatorCalled = true;
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: []
      };
    }
  });

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("prototype-tampered WebAssembly.Tag values fail closed", (t) => {
  if (typeof WebAssembly.Tag !== "function") {
    t.skip("WebAssembly.Tag is unavailable on this runtime");
    return;
  }

  const tag = new WebAssembly.Tag({ parameters: ["i32"] });
  tag.foo = { bar: 1 };
  Object.setPrototypeOf(tag, Object.prototype);

  assert.throws(
    () => cloneAiData(tag, "tag"),
    /unsupported runtime object/
  );
});

test("prototype-tampered WebAssembly.Exception values fail closed", (t) => {
  if (
    typeof WebAssembly.Tag !== "function" ||
    typeof WebAssembly.Exception !== "function"
  ) {
    t.skip("WebAssembly.Exception is unavailable on this runtime");
    return;
  }

  const tag = new WebAssembly.Tag({ parameters: [] });
  const exception = new WebAssembly.Exception(tag, []);
  exception.foo = { bar: 1 };
  Object.setPrototypeOf(exception, Object.prototype);

  assert.throws(
    () => cloneAiData(exception, "exception"),
    /unsupported runtime object/
  );
});

test("shared array iterator prototypes are restored after evaluators", async () => {
  const iteratorPrototype =
    Object.getPrototypeOf([][Symbol.iterator]());
  const originalNext = iteratorPrototype.next;

  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: [],
    expectedOutput: [],
    evaluator(output) {
      const iterator = output.values();
      Object.getPrototypeOf(iterator).next = () => ({ done: true });
      return true;
    },
    generator: () => ({
      version: 1,
      task: "Return the approved value.",
      attacks: []
    })
  });

  assert.equal(iteratorPrototype.next, originalNext);
  assert.equal(result.baselinePassed, true);
});
'''
Path("test/m8-codex-round7.test.js").write_text(round7)

print("Round 7 patch applied")
