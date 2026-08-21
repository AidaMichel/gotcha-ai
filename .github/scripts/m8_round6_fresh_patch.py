from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


contract_path = Path("src/contract-attacks.js")
contract = contract_path.read_text()

if "withRestoredCallbackIntrinsicSurfaces" not in contract:
    contract = replace_once(
        contract,
        "const objectPrototype =\n  Object.prototype;",
        "const objectPrototype =\n  Object.prototype;\n\nconst ObjectConstructor =\n  Object;\n\nconst NumberConstructor =\n  Number;",
        "capture constructors",
    )

    contract = replace_once(
        contract,
        "const WeakSetConstructor =\n  WeakSet;",
        "const WeakSetConstructor =\n  WeakSet;\n\nconst WeakMapConstructor =\n  WeakMap;",
        "capture weak map",
    )

    contract = replace_once(
        contract,
        "const arrayFind =\n  Array.prototype.find;",
        "const arrayFind =\n  Array.prototype.find;\n\nconst arrayPush =\n  Array.prototype.push;\n\nconst arrayPop =\n  Array.prototype.pop;\n\nconst stringPrototype =\n  String.prototype;\n\nconst stringTrim =\n  String.prototype.trim;\n\nconst numberIsFinite =\n  Number.isFinite;\n\nconst mapPrototype =\n  MapConstructor.prototype;\n\nconst mapGet =\n  MapConstructor.prototype.get;\n\nconst setPrototype =\n  SetConstructor.prototype;\n\nconst setHas =\n  SetConstructor.prototype.has;\n\nconst setAdd =\n  SetConstructor.prototype.add;\n\nconst weakSetPrototype =\n  WeakSetConstructor.prototype;\n\nconst weakMapPrototype =\n  WeakMapConstructor.prototype;",
        "capture post-callback intrinsics",
    )

    contract = contract.replace(
        'value.trim() === ""',
        'reflectApply(\n      stringTrim,\n      value,\n      []\n    ) === ""',
    )
    contract = contract.replace(
        "!Number.isFinite(value)",
        "!numberIsFinite(value)",
    )

    old_instance_block = '''function restoreArrayHasInstance() {
  if (
    arrayHasInstanceDescriptor ===
      undefined
  ) {
    deleteProperty(
      ArrayConstructor,
      arrayHasInstanceSymbol
    );

    return;
  }

  defineProperty(
    ArrayConstructor,
    arrayHasInstanceSymbol,
    arrayHasInstanceDescriptor
  );
}

function withSafeArrayHasInstance(
  callback
) {
  defineProperty(
    ArrayConstructor,
    arrayHasInstanceSymbol,
    {
      value:
        safeArrayHasInstance,
      writable: false,
      enumerable: false,
      configurable: true
    }
  );

  try {
    return callback();
  } finally {
    restoreArrayHasInstance();
  }
}
'''

    new_instance_block = '''function safeObjectHasInstance(
  value
) {
  if (
    value !== null &&
    typeof value === "object"
  ) {
    return true;
  }

  return reflectApply(
    functionHasInstance,
    ObjectConstructor,
    [value]
  );
}

function restoreOwnDescriptor(
  holder,
  key,
  descriptor
) {
  if (descriptor === undefined) {
    deleteProperty(holder, key);
    return;
  }

  defineProperty(
    holder,
    key,
    descriptor
  );
}

function withSafeEvaluatorInstanceSemantics(
  callback
) {
  const previousArrayDescriptor =
    getOwnPropertyDescriptor(
      ArrayConstructor,
      arrayHasInstanceSymbol
    );

  const previousObjectDescriptor =
    getOwnPropertyDescriptor(
      ObjectConstructor,
      arrayHasInstanceSymbol
    );

  defineProperty(
    ArrayConstructor,
    arrayHasInstanceSymbol,
    {
      value:
        safeArrayHasInstance,
      writable: false,
      enumerable: false,
      configurable: true
    }
  );

  defineProperty(
    ObjectConstructor,
    arrayHasInstanceSymbol,
    {
      value:
        safeObjectHasInstance,
      writable: false,
      enumerable: false,
      configurable: true
    }
  );

  try {
    return callback();
  } finally {
    restoreOwnDescriptor(
      ObjectConstructor,
      arrayHasInstanceSymbol,
      previousObjectDescriptor
    );
    restoreOwnDescriptor(
      ArrayConstructor,
      arrayHasInstanceSymbol,
      previousArrayDescriptor
    );
  }
}
'''

    contract = replace_once(
        contract,
        old_instance_block,
        new_instance_block,
        "nesting-safe instanceof bridge",
    )

    surface_guard = '''function captureIntrinsicSurface(
  holder
) {
  return {
    holder,
    descriptors:
      getOwnPropertyDescriptors(holder)
  };
}

function captureCallbackIntrinsicSurfaces() {
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
}

function restoreIntrinsicSurface(
  surface
) {
  const holder =
    surface.holder;
  const expected =
    surface.descriptors;
  const current =
    getOwnPropertyDescriptors(holder);

  const currentKeys = ownKeys(current);
  for (
    let index = 0;
    index < currentKeys.length;
    index += 1
  ) {
    const key = currentKeys[index];

    if (!hasOwn(expected, key)) {
      if (!deleteProperty(holder, key)) {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
  }

  const expectedKeys = ownKeys(expected);
  for (
    let index = 0;
    index < expectedKeys.length;
    index += 1
  ) {
    const key = expectedKeys[index];
    const currentDescriptor =
      getOwnPropertyDescriptor(
        holder,
        key
      );
    const expectedDescriptor =
      expected[key];

    if (
      !samePropertyDescriptor(
        currentDescriptor,
        expectedDescriptor
      )
    ) {
      try {
        defineProperty(
          holder,
          key,
          expectedDescriptor
        );
      } catch {
        throw new Error(
          "Callback intrinsic surface could not be restored."
        );
      }
    }
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
}

'''

    contract = replace_once(
        contract,
        "function requirePromiseIntrinsicIntegrity() {",
        surface_guard + "function requirePromiseIntrinsicIntegrity() {",
        "callback surface guard",
    )

    contract = replace_once(
        contract,
        '''  if (ownConstructor !== undefined) {
    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }
''',
        '''  if (ownConstructor !== undefined) {
    if (
      !("get" in ownConstructor) &&
      !("set" in ownConstructor) &&
      ownConstructor.value ===
        promiseConstructor
    ) {
      requirePromiseIntrinsicIntegrity();
      return callback();
    }

    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }
''',
        "safe nonconfig promise constructor",
    )

    contract = replace_once(
        contract,
        '''    const result =
      withSafeArrayHasInstance(
        () =>
          reflectApply(
            evaluator,
            undefined,
            [evaluatorOutput]
          )
      );''',
        '''    const result =
      withSafeEvaluatorInstanceSemantics(
        () =>
          withRestoredCallbackIntrinsicSurfaces(
            evaluator,
            undefined,
            [evaluatorOutput]
          )
      );''',
        "safe evaluator invocation",
    )

    contract = replace_once(
        contract,
        '''  const returned =
    reflectApply(
      generator,
      undefined,
      [argumentsObject]
    );''',
        '''  const returned =
    withRestoredCallbackIntrinsicSurfaces(
      generator,
      undefined,
      [argumentsObject]
    );''',
        "safe generator invocation",
    )

    contract = replace_once(
        contract,
        '''  const id = rule.id;
  const statement = rule.statement;
  const kind = rule.kind;
  const severity = rule.severity;''',
        '''  for (
    const key of [
      "id",
      "statement",
      "kind",
      "severity"
    ]
  ) {
    requireOwnDataProperty(
      rule,
      key,
      label
    );
  }

  const id = rule.id;
  const statement = rule.statement;
  const kind = rule.kind;
  const severity = rule.severity;''',
        "own contract rule fields",
    )

    contract = replace_once(
        contract,
        '''  requirePlainSnapshotObject(
    snapshot,
    "Quality Contract"
  );

  if (
    snapshot.version !==''',
        '''  requirePlainSnapshotObject(
    snapshot,
    "Quality Contract"
  );

  for (
    const key of [
      "version",
      "status",
      "task",
      "rules"
    ]
  ) {
    requireOwnDataProperty(
      snapshot,
      key,
      "Quality Contract"
    );
  }

  if (
    snapshot.version !==''',
        "own confirmed contract fields",
    )

    contract = replace_once(
        contract,
        '''  const rules =
    snapshot.rules.map(
      (rule, index) =>
        normalizeRule(
          rule,
          index,
          ids
        )
    );''',
        '''  const rules =
    reflectApply(
      arrayMap,
      snapshot.rules,
      [
        (rule, index) =>
          normalizeRule(
            rule,
            index,
            ids
          )
      ]
    );''',
        "captured contract map",
    )

    contract = contract.replace(
        "if (ids.has(id)) {",
        "if (\n    reflectApply(\n      setHas,\n      ids,\n      [id]\n    )\n  ) {",
    )
    contract = contract.replace(
        "  ids.add(id);",
        "  reflectApply(\n    setAdd,\n    ids,\n    [id]\n  );",
    )
    contract = contract.replace(
        "if (attackIds.has(id)) {",
        "if (\n    reflectApply(\n      setHas,\n      attackIds,\n      [id]\n    )\n  ) {",
    )
    contract = contract.replace(
        "  attackIds.add(id);",
        "  reflectApply(\n    setAdd,\n    attackIds,\n    [id]\n  );",
    )

    contract = replace_once(
        contract,
        '''  const rule =
    ruleById.get(ruleId);''',
        '''  const rule =
    reflectApply(
      mapGet,
      ruleById,
      [ruleId]
    );''',
        "captured map get",
    )

    contract = replace_once(
        contract,
        "  const normalizedScores = {};",
        "  const normalizedScores =\n    objectCreate(null);",
        "null-prototype scores",
    )

    contract_path.write_text(contract)


ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

if "asyncLocalStorageGetStore" not in ai:
    ai = replace_once(
        ai,
        '''const vm =
  require("node:vm");''',
        '''const vm =
  require("node:vm");

const {
  AsyncLocalStorage
} = require("node:async_hooks");''',
        "capture async local storage",
    )

    ai = replace_once(
        ai,
        '''const vmScriptCreateCachedData =
  captureMethodFromPrototype(
    vmScriptBasePrototype,
    "createCachedData"
  );''',
        '''const vmScriptCreateCachedData =
  captureMethodFromPrototype(
    vmScriptBasePrototype,
    "createCachedData"
  );

const asyncLocalStorageGetStore =
  capturePrototypeMethod(
    AsyncLocalStorage,
    "getStore"
  );''',
        "capture async local storage probe",
    )

    ai = replace_once(
        ai,
        '''  if (vmScriptCreateCachedData !== null) {
    try {
      reflectApply(
        vmScriptCreateCachedData,
        value,
        []
      );

      return true;
    } catch {}
  }

  return false;''',
        '''  if (vmScriptCreateCachedData !== null) {
    try {
      reflectApply(
        vmScriptCreateCachedData,
        value,
        []
      );

      return true;
    } catch {}
  }

  if (asyncLocalStorageGetStore !== null) {
    try {
      const store =
        reflectApply(
          asyncLocalStorageGetStore,
          value,
          []
        );

      if (store !== undefined) {
        return true;
      }
    } catch {}
  }

  return false;''',
        "probe async local storage",
    )

    ai_path.write_text(ai)


spec_path = Path("docs/M8_AI_ATTACKS_SPEC.md")
spec = spec_path.read_text()

trust_section = '''### 5.9 Trusted callback boundary\n\nThe evaluator and injected generator are **trusted local integration callbacks**.\n\nM8 is not a JavaScript sandbox for caller-supplied code. The security boundary is the structured data that crosses into and out of those callbacks, especially AI/model-produced generator data. Model-produced strings or objects are validated as declarative data and are never executed as code.\n\nCallbacks should remain deterministic and side-effect free. M8 restores the core built-in prototype surfaces around callback invocation as defense in depth so ordinary accidental prototype mutation cannot corrupt later validation or ranking, but M8 does not claim containment of deliberate irreversible sabotage of the host JavaScript realm by trusted callback code.\n\nThis distinction keeps the boundary testable: malformed or prototype-polluted **data** must fail closed, while arbitrary hostile JavaScript execution belongs to a separate sandboxing capability outside M8.\n\n---\n\n'''

if "### 5.9 Trusted callback boundary" not in spec:
    spec = replace_once(
        spec,
        "## 6. Case-Scoped Attack Generation",
        trust_section + "## 6. Case-Scoped Attack Generation",
        "document callback trust boundary",
    )
    spec_path.write_text(spec)


test_path = Path("test/m8-codex-round6.test.js")
if not test_path.exists():
    test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { AsyncLocalStorage } = require("node:async_hooks");

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

function attackOutput(overrides = {}) {
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
        mutatedOutput: { value: "wrong" },
        scores: {
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        },
        ...overrides
      }
    ]
  };
}

test("generator Map.prototype tampering cannot forge rule attribution", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Map.prototype.get = function forgedGet() {
          return confirmedContract().rules[0];
        };
        return attackOutput({ ruleId: "invented" });
      }
    }),
    /unknown Quality Contract rule id/
  );
});

test("non-configurable safe Promise constructors remain observable", () => {
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
            const promise = Promise.reject(new Error("safe constructor rejection"));
            Object.defineProperty(promise, "constructor", {
              value: Promise,
              writable: false,
              enumerable: false,
              configurable: false
            });
            return promise;
          }
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/safe constructor rejection/.test(String(error && error.message))) {
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

test("evaluator-facing plain objects preserve instanceof Object", async () => {
  let generatorCalled = false;
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: (output) => output instanceof Object,
    generator() {
      generatorCalled = true;
      return attackOutput();
    }
  });
  assert.equal(generatorCalled, true);
  assert.equal(result.generatedAttacks.length, 1);
});

test("normalized scores ignore Object.prototype setters", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator() {
      Object.defineProperty(Object.prototype, "realism", {
        get() { return 999; },
        set() {},
        configurable: true
      });
      return attackOutput();
    }
  });
  assert.equal(result.generatedAttacks[0].realism, 1);
  assert.ok(result.attack.survivors[0].rankScore <= 1);
});

test("active AsyncLocalStorage objects fail the AI-data boundary", () => {
  const storage = new AsyncLocalStorage();
  storage.run({ secret: true }, () => {
    Object.setPrototypeOf(storage, Object.prototype);
    storage.foo = "bar";
    assert.throws(
      () => cloneAiData(storage, "storage"),
      /unsupported runtime object/
    );
  });
});

test("nested contract attacks preserve outer Array instanceof semantics", async () => {
  let nested = null;
  let nestedStarted = false;
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: [],
    expectedOutput: [],
    evaluator(output) {
      if (!nestedStarted) {
        nestedStarted = true;
        nested = runContractAttacks({
          contract: confirmedContract(),
          input: { request: "nested" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator: () => ({
            version: 1,
            task: "Return the approved value.",
            attacks: []
          })
        });
      }
      return output instanceof Array;
    },
    generator: () => ({
      version: 1,
      task: "Return the approved value.",
      attacks: []
    })
  });
  await nested;
  assert.equal(result.baselinePassed, true);
});

test("String.trim tampering cannot admit empty metadata", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        String.prototype.trim = () => "forged";
        return attackOutput({
          id: "",
          type: "",
          description: "",
          rationale: ""
        });
      }
    }),
    /non-empty string/
  );
});

test("confirmed contracts require own top-level fields", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    Object.prototype.version = 1;
    Object.prototype.status = "confirmed";
    Object.prototype.task = "Return the approved value.";
    Object.prototype.rules = ${JSON.stringify(confirmedContract().rules)};
    runContractAttacks({
      contract: {},
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator: () => ({ version: 1, task: "Return the approved value.", attacks: [] })
    }).then(
      () => { throw new Error("inherited contract accepted"); },
      (error) => {
        if (!/own data property/.test(String(error && error.message))) throw error;
      }
    ).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  const child = spawnSync(process.execPath, ["-e", source], {
    cwd: process.cwd(), encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("confirmed contract rules require own fields", async () => {
  const contract = confirmedContract();
  const inheritedRule = Object.create(contract.rules[0]);
  contract.rules = [inheritedRule];
  await assert.rejects(
    runContractAttacks({
      contract,
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator: () => ({ version: 1, task: contract.task, attacks: [] })
    }),
    /own data property/
  );
});

test("Set prototype tampering cannot bypass duplicate attack IDs", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Set.prototype.has = () => false;
        Set.prototype.add = function noAdd() { return this; };
        const first = attackOutput().attacks[0];
        return {
          version: 1,
          task: "Return the approved value.",
          attacks: [first, { ...first }]
        };
      }
    }),
    /Duplicate generated attack id/
  );
});

test("Number.isFinite tampering cannot admit invalid scores", async () => {
  await assert.rejects(
    runContractAttacks({
      contract: confirmedContract(),
      input: { request: "approved" },
      expectedOutput: { value: "approved" },
      evaluator: () => true,
      generator() {
        Number.isFinite = () => true;
        const output = attackOutput();
        output.attacks[0].scores.realism = Infinity;
        return output;
      }
    }),
    /finite number between 0 and 1/
  );
});

test("evaluator prototype tampering cannot corrupt engine aggregation", async () => {
  const result = await runContractAttacks({
    contract: confirmedContract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator(output) {
      Array.prototype.filter = () => [];
      return true;
    },
    generator: () => attackOutput()
  });
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});
''')

print("M8 round 6 fresh-eyes patch applied")
