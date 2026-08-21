from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


contract_path = Path("src/contract-attacks.js")
contract = contract_path.read_text()

contract = replace_once(
    contract,
    '''const {
  types: utilTypes,
  isDeepStrictEqual
} = require("node:util");''',
    '''const {
  types: utilTypes
} = require("node:util");

const utilIsPromise =
  utilTypes.isPromise;

const utilIsProxy =
  utilTypes.isProxy;''',
    "capture util predicates",
)

contract = contract.replace("utilTypes.isPromise", "utilIsPromise")
contract = contract.replace("utilTypes.isProxy", "utilIsProxy")

contract = replace_once(
    contract,
    '''const arrayIsArray =
  Array.isArray;''',
    '''const arrayIsArray =
  Array.isArray;

const ArrayConstructor =
  Array;

const arrayHasInstanceSymbol =
  Symbol.hasInstance;

const functionHasInstance =
  Function.prototype[
    Symbol.hasInstance
  ];

const arrayHasInstanceDescriptor =
  getOwnPropertyDescriptor(
    ArrayConstructor,
    arrayHasInstanceSymbol
  );

const objectKeys =
  Object.keys;''',
    "capture array/equality intrinsics",
)

contract = replace_once(
    contract,
    '''const safeCallbackArrayPrototype =
  buildSafeCallbackPrototype(
    arrayPrototype,
    safeCallbackObjectPrototype
  );''',
    '''const safeCallbackArrayPrototype =
  buildSafeCallbackPrototype(
    arrayPrototype,
    safeCallbackObjectPrototype
  );

function safeArrayHasInstance(
  value
) {
  if (arrayIsArray(value)) {
    return true;
  }

  return reflectApply(
    functionHasInstance,
    ArrayConstructor,
    [value]
  );
}

function restoreArrayHasInstance() {
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
}''',
    "safe Array instanceof bridge",
)

contract = replace_once(
    contract,
    '''function hasOwn(
  value,
  key
) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}''',
    '''function hasOwn(
  value,
  key
) {
  return reflectApply(
    hasOwnProperty,
    value,
    [key]
  );
}

function requireOwnDataProperty(
  value,
  key,
  label
) {
  const descriptor =
    getOwnPropertyDescriptor(
      value,
      key
    );

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor
  ) {
    throw new Error(
      `${label} must include own data property ${key}.`
    );
  }
}''',
    "own data property helper",
)

contract = replace_once(
    contract,
    '''    const result =
      reflectApply(
        evaluator,
        undefined,
        [evaluatorOutput]
      );''',
    '''    const result =
      withSafeArrayHasInstance(
        () =>
          reflectApply(
            evaluator,
            undefined,
            [evaluatorOutput]
          )
      );''',
    "evaluator Array instanceof compatibility",
)

contract = replace_once(
    contract,
    '''  requirePlainSnapshotObject(
    attackCandidate,
    label
  );

  const id = attackCandidate.id;''',
    '''  requirePlainSnapshotObject(
    attackCandidate,
    label
  );

  for (
    const key of [
      "id",
      "ruleId",
      "type",
      "description",
      "rationale",
      "mutatedOutput",
      "scores"
    ]
  ) {
    requireOwnDataProperty(
      attackCandidate,
      key,
      label
    );
  }

  const id = attackCandidate.id;''',
    "attack own schema fields",
)

contract = replace_once(
    contract,
    '''  for (const scoreKey of SCORE_KEYS) {
    const score =
      scores[scoreKey];''',
    '''  for (const scoreKey of SCORE_KEYS) {
    requireOwnDataProperty(
      scores,
      scoreKey,
      `${label} scores`
    );

    const score =
      scores[scoreKey];''',
    "score own schema fields",
)

contract = replace_once(
    contract,
    '''  requirePlainSnapshotObject(
    snapshot,
    "Generator output"
  );

  if (
    snapshot.version !==''',
    '''  requirePlainSnapshotObject(
    snapshot,
    "Generator output"
  );

  for (
    const key of [
      "version",
      "task",
      "attacks"
    ]
  ) {
    requireOwnDataProperty(
      snapshot,
      key,
      "Generator output"
    );
  }

  if (
    snapshot.version !==''',
    "generator top-level own schema fields",
)

contract = replace_once(
    contract,
    '''function findDuplicateAttack(
  retained,
  candidate
) {''',
    '''function isAiDataEqual(
  left,
  right
) {
  const stack = [[left, right]];

  while (stack.length > 0) {
    const pair = stack.pop();
    const leftValue = pair[0];
    const rightValue = pair[1];

    if (leftValue === rightValue) {
      continue;
    }

    if (
      leftValue === null ||
      rightValue === null ||
      typeof leftValue !==
        typeof rightValue
    ) {
      return false;
    }

    if (
      typeof leftValue !== "object"
    ) {
      return false;
    }

    if (
      arrayIsArray(leftValue) !==
        arrayIsArray(rightValue)
    ) {
      return false;
    }

    const leftKeys =
      reflectApply(
        objectKeys,
        Object,
        [leftValue]
      );

    const rightKeys =
      reflectApply(
        objectKeys,
        Object,
        [rightValue]
      );

    if (
      leftKeys.length !==
        rightKeys.length
    ) {
      return false;
    }

    for (const key of leftKeys) {
      if (!hasOwn(rightValue, key)) {
        return false;
      }

      const leftDescriptor =
        getOwnPropertyDescriptor(
          leftValue,
          key
        );

      const rightDescriptor =
        getOwnPropertyDescriptor(
          rightValue,
          key
        );

      if (
        leftDescriptor === undefined ||
        rightDescriptor === undefined ||
        !("value" in leftDescriptor) ||
        !("value" in rightDescriptor)
      ) {
        return false;
      }

      stack.push([
        leftDescriptor.value,
        rightDescriptor.value
      ]);
    }
  }

  return true;
}

function findDuplicateAttack(
  retained,
  candidate
) {''',
    "stack-safe AI data equality",
)

contract = contract.replace("isDeepStrictEqual(", "isAiDataEqual(")

contract_path.write_text(contract)


ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

ai = replace_once(
    ai,
    '''const vm =
  require("node:vm");''',
    '''const vm =
  require("node:vm");

const vmIsContext =
  typeof vm.isContext === "function"
    ? vm.isContext
    : null;''',
    "capture vm.isContext",
)

ai = replace_once(
    ai,
    '''function isUnsupportedRuntimeObject(
  value
) {
  return (
    utilTypes.isAnyArrayBuffer(value) ||''',
    '''function isUnsupportedRuntimeObject(
  value
) {
  return (
    (
      vmIsContext !== null &&
      reflectApply(
        vmIsContext,
        vm,
        [value]
      )
    ) ||
    utilTypes.isAnyArrayBuffer(value) ||''',
    "reject contextified vm objects",
)

ai_path.write_text(ai)


test_path = Path("test/m8-codex-round5.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

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

function generatorOutput(mutatedOutput) {
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

function deepValue(depth, leaf) {
  const root = {};
  let cursor = root;

  for (let index = 0; index < depth; index += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }

  cursor.value = leaf;
  return root;
}

test(
  "deep unchanged outputs use stack-safe equality",
  async () => {
    const expectedOutput =
      deepValue(2500, "approved");

    const result =
      await runContractAttacks({
        contract: confirmedContract(),
        input: { request: "approved" },
        expectedOutput,
        evaluator: () => true,
        generator: () =>
          generatorOutput(
            deepValue(2500, "approved")
          )
      });

    assert.equal(
      result.generatedAttacks.length,
      0
    );
    assert.equal(
      result.discardedAttacks.length,
      1
    );
    assert.equal(
      result.discardedAttacks[0].reason,
      "unchanged-output"
    );
  }
);

test(
  "contextified vm objects fail the AI-data boundary",
  () => {
    const context =
      vm.createContext({
        foo: "bar"
      });

    assert.equal(
      vm.isContext(context),
      true
    );

    assert.throws(
      () =>
        cloneAiData(
          context,
          "context"
        ),
      /unsupported runtime object/
    );
  }
);

test(
  "Promise detection survives callback tampering without unhandled rejection",
  () => {
    const source = String.raw`
      "use strict";
      const util = require("node:util");
      const { runContractAttacks } = require("./src");

      const contract = ${JSON.stringify(confirmedContract())};
      const original = util.types.isPromise;

      (async () => {
        try {
          await runContractAttacks({
            contract,
            input: { request: "approved" },
            expectedOutput: { value: "approved" },
            evaluator: () => true,
            generator() {
              util.types.isPromise = () => false;
              return Promise.reject(
                new Error("captured predicate rejection")
              );
            }
          });
          throw new Error("expected rejection");
        } catch (error) {
          if (!/captured predicate rejection/.test(String(error && error.message))) {
            throw error;
          }
        } finally {
          util.types.isPromise = original;
        }
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    const child = spawnSync(
      process.execPath,
      [
        "--unhandled-rejections=strict",
        "-e",
        source
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    assert.equal(
      child.status,
      0,
      child.stderr || child.stdout
    );
  }
);

test(
  "generator schema rejects inherited required fields",
  () => {
    const source = String.raw`
      "use strict";
      const { runContractAttacks } = require("./src");

      const contract = ${JSON.stringify(confirmedContract())};
      const descriptors = {
        version: Object.getOwnPropertyDescriptor(Object.prototype, "version"),
        task: Object.getOwnPropertyDescriptor(Object.prototype, "task"),
        attacks: Object.getOwnPropertyDescriptor(Object.prototype, "attacks")
      };

      function restore(key) {
        const descriptor = descriptors[key];
        if (descriptor === undefined) {
          delete Object.prototype[key];
        } else {
          Object.defineProperty(Object.prototype, key, descriptor);
        }
      }

      (async () => {
        try {
          await runContractAttacks({
            contract,
            input: { request: "approved" },
            expectedOutput: { value: "approved" },
            evaluator: () => true,
            generator() {
              Object.prototype.version = 1;
              Object.prototype.task = "Return the approved value.";
              Object.prototype.attacks = [${JSON.stringify(generatorOutput({ value: "wrong" }).attacks[0])}];
              return {};
            }
          });
          throw new Error("inherited generator schema was accepted");
        } catch (error) {
          if (!/own data property/.test(String(error && error.message))) {
            throw error;
          }
        } finally {
          restore("version");
          restore("task");
          restore("attacks");
        }
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    const child = spawnSync(
      process.execPath,
      ["-e", source],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    assert.equal(
      child.status,
      0,
      child.stderr || child.stdout
    );
  }
);

test(
  "evaluator-facing arrays preserve instanceof Array",
  async () => {
    let generatorCalled = false;

    const result =
      await runContractAttacks({
        contract: confirmedContract(),
        input: { request: "approved" },
        expectedOutput: [],
        evaluator: (output) =>
          output instanceof Array,
        generator: () => {
          generatorCalled = true;
          return generatorOutput(["wrong"]);
        }
      });

    assert.equal(generatorCalled, true);
    assert.equal(
      result.generatedAttacks.length,
      1
    );
    assert.equal(
      result.topFinding.id,
      "wrong-value"
    );
  }
);
''')

print("M8 round 5 patch applied")
