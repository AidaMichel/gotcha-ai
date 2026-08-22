from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    return text.replace(old, new, 1)


source_path = Path("src/contract-attacks.js")
source = source_path.read_text()

old = '''function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
  const byNode =
    new WeakMapConstructor();
  const identityShadows =
    new WeakMapConstructor();

  if (
'''
new = '''function buildEvaluatorPrototypePlan(
  fallback,
  sourceRoot,
  canonicalRoot
) {
  const byNode =
    new WeakMapConstructor();
  const expectedNodes =
    new WeakSetConstructor();
  const localIdentityNodes =
    new WeakSetConstructor();
  const identityShadows =
    new WeakMapConstructor();

  const localArrayCanBridge =
    canInstallEvaluatorInstanceSemantic(
      ArrayConstructor,
      getOwnPropertyDescriptor(
        ArrayConstructor,
        arrayHasInstanceSymbol
      )
    );
  const localObjectCanBridge =
    canInstallEvaluatorInstanceSemantic(
      ObjectConstructor,
      getOwnPropertyDescriptor(
        ObjectConstructor,
        arrayHasInstanceSymbol
      )
    );

  const localObjectIdentityShadow =
    localObjectCanBridge
      ? undefined
      : getForeignIdentityShadow(
          identityShadows,
          objectPrototype,
          false
        );
  const localArrayIdentityShadow =
    localArrayCanBridge &&
    localObjectCanBridge
      ? undefined
      : getForeignIdentityShadow(
          identityShadows,
          arrayPrototype,
          true
        );

  let candidateObjectPrototype =
    localObjectIdentityShadow !== undefined
      ? localObjectIdentityShadow
      : safeCallbackObjectPrototype;
  let candidateArrayPrototype =
    localArrayIdentityShadow !== undefined
      ? localArrayIdentityShadow
      : safeCallbackArrayPrototype;
  let candidateObjectIsLocal = true;
  let candidateArrayIsLocal = true;
  let candidateForeignObjectPrototype = null;

  if (
'''
source = replace_once(source, old, new, "prototype-plan preamble")

old = '''      reflectApply(
        weakSetAdd,
        seen,
        [pair.source]
      );

      const foreignPrototype =
'''
new = '''      reflectApply(
        weakSetAdd,
        seen,
        [pair.source]
      );
      reflectApply(
        weakSetAdd,
        expectedNodes,
        [pair.canonical]
      );

      const foreignPrototype =
'''
source = replace_once(source, old, new, "expected node tracking")

old = '''      if (foreignPrototype !== undefined) {
        const identityShadow =
          getForeignIdentityShadow(
            identityShadows,
            foreignPrototype,
            arrayIsArray(pair.source)
          );

        reflectApply(
          weakMapSet,
          byNode,
          [
            pair.canonical,
            identityShadow
          ]
        );
      }

      const sourceDescriptors =
'''
new = '''      if (foreignPrototype !== undefined) {
        const sourceIsArray =
          arrayIsArray(pair.source);
        const identityShadow =
          getForeignIdentityShadow(
            identityShadows,
            foreignPrototype,
            sourceIsArray
          );

        reflectApply(
          weakMapSet,
          byNode,
          [
            pair.canonical,
            identityShadow
          ]
        );

        if (pair.source === sourceRoot) {
          if (sourceIsArray) {
            candidateArrayPrototype =
              identityShadow;
            candidateArrayIsLocal = false;

            const parentForeignObjectPrototype =
              getPrototypeOf(
                foreignPrototype
              );

            if (
              parentForeignObjectPrototype !== null &&
              !utilIsProxy(
                parentForeignObjectPrototype
              ) &&
              captureNativeRealmConstructor(
                parentForeignObjectPrototype,
                objectConstructorSource
              ) !== null &&
              isPristineIntrinsicPrototype(
                parentForeignObjectPrototype,
                objectPrototype
              )
            ) {
              candidateForeignObjectPrototype =
                parentForeignObjectPrototype;
              candidateObjectPrototype =
                getForeignIdentityShadow(
                  identityShadows,
                  parentForeignObjectPrototype,
                  false
                );
              candidateObjectIsLocal = false;
            }
          } else {
            candidateForeignObjectPrototype =
              foreignPrototype;
            candidateObjectPrototype =
              identityShadow;
            candidateObjectIsLocal = false;
          }
        } else if (
          sourceIsArray &&
          candidateForeignObjectPrototype !== null &&
          getPrototypeOf(foreignPrototype) ===
            candidateForeignObjectPrototype
        ) {
          candidateArrayPrototype =
            identityShadow;
          candidateArrayIsLocal = false;
        }
      } else {
        const sourcePrototype =
          getPrototypeOf(pair.source);
        const sourceIsArray =
          arrayIsArray(pair.source);
        let localIdentityShadow;

        if (
          sourceIsArray &&
          sourcePrototype === arrayPrototype
        ) {
          localIdentityShadow =
            localArrayIdentityShadow;
        } else if (
          !sourceIsArray &&
          sourcePrototype === objectPrototype
        ) {
          localIdentityShadow =
            localObjectIdentityShadow;
        }

        if (localIdentityShadow !== undefined) {
          reflectApply(
            weakMapSet,
            byNode,
            [
              pair.canonical,
              localIdentityShadow
            ]
          );
          reflectApply(
            weakSetAdd,
            localIdentityNodes,
            [pair.canonical]
          );
        }
      }

      const sourceDescriptors =
'''
source = replace_once(source, old, new, "prototype-plan identity mapping")

old = '''  return {
    byNode,
    objectPrototype:
      safeCallbackObjectPrototype,
    arrayPrototype:
      safeCallbackArrayPrototype,
    foreignSurfaces:
      fallback.foreignSurfaces
  };
}
'''
new = '''  return {
    byNode,
    expectedNodes,
    localIdentityNodes,
    objectPrototype:
      safeCallbackObjectPrototype,
    arrayPrototype:
      safeCallbackArrayPrototype,
    candidateObjectPrototype,
    candidateArrayPrototype,
    candidateObjectIsLocal,
    candidateArrayIsLocal,
    foreignSurfaces:
      fallback.foreignSurfaces
  };
}
'''
source = replace_once(source, old, new, "prototype-plan return")

old = '''    const sourcePrototype =
      getPrototypeOf(source);
    const plannedPrototype =
      reflectApply(
        weakMapGet,
        prototypePlan.byNode,
        [source]
      );
    const currentIsArray =
      arrayIsArray(current);

    if (plannedPrototype === undefined) {
      if (currentIsArray) {
        reflectApply(
          weakSetAdd,
          instanceState.localArrayInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      } else if (sourcePrototype !== null) {
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      }
    }

    setPrototypeOf(
      current,
      plannedPrototype !== undefined
        ? plannedPrototype
        : currentIsArray
          ? prototypePlan.arrayPrototype
          : sourcePrototype === null
            ? null
            : prototypePlan.objectPrototype
    );
'''
new = '''    const sourcePrototype =
      getPrototypeOf(source);
    const plannedPrototype =
      reflectApply(
        weakMapGet,
        prototypePlan.byNode,
        [source]
      );
    const currentIsArray =
      arrayIsArray(current);
    const isExpectedNode =
      reflectApply(
        weakSetHas,
        prototypePlan.expectedNodes,
        [source]
      );
    const usesLocalIdentity =
      isExpectedNode &&
      reflectApply(
        weakSetHas,
        prototypePlan.localIdentityNodes,
        [source]
      );

    let effectivePrototype =
      plannedPrototype;
    let treatAsLocal = false;

    if (isExpectedNode) {
      treatAsLocal =
        plannedPrototype === undefined ||
        usesLocalIdentity;
    } else if (sourcePrototype !== null) {
      if (currentIsArray) {
        effectivePrototype =
          prototypePlan.candidateArrayPrototype;
        treatAsLocal =
          prototypePlan.candidateArrayIsLocal;
      } else {
        effectivePrototype =
          prototypePlan.candidateObjectPrototype;
        treatAsLocal =
          prototypePlan.candidateObjectIsLocal;
      }
    }

    if (treatAsLocal) {
      if (currentIsArray) {
        reflectApply(
          weakSetAdd,
          instanceState.localArrayInstances,
          [current]
        );
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      } else if (sourcePrototype !== null) {
        reflectApply(
          weakSetAdd,
          instanceState.localObjectInstances,
          [current]
        );
      }
    }

    setPrototypeOf(
      current,
      effectivePrototype !== undefined
        ? effectivePrototype
        : currentIsArray
          ? prototypePlan.arrayPrototype
          : sourcePrototype === null
            ? null
            : prototypePlan.objectPrototype
    );
'''
source = replace_once(source, old, new, "candidate prototype selection")

source_path.write_text(source)

readme_path = Path("README.md")
readme = readme_path.read_text()

old = '''const {
  runGotcha,
  draftQualityContract,
  confirmQualityContract
} = require("gotcha-ai");
'''
new = '''const {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks
} = require("gotcha-ai");
'''
readme = replace_once(readme, old, new, "README public exports")

anchor = '''Not the Gotcha core.

## Bring your own business idea
'''
section = '''Not the Gotcha core.

## Attack from a confirmed Quality Contract

`runContractAttacks()` connects the confirmed contract to AI-assisted attack generation without coupling Gotcha to a model provider.

You provide:

- a confirmed Quality Contract
- the real input and known-good `expectedOutput`
- your synchronous boolean evaluator
- an injected generator that calls the model/provider you choose

```js
const {
  runContractAttacks
} = require("gotcha-ai");

const result = await runContractAttacks({
  contract: confirmed,
  input,
  expectedOutput,

  evaluator(output) {
    return currentEvaluator(output);
  },

  async generator({
    contract,
    input,
    expectedOutput,
    instructions
  }) {
    // Call the provider/model you choose, then return
    // the validated contract-attack schema.
    return providerGenerateAttacks({
      contract,
      input,
      expectedOutput,
      instructions
    });
  }
});
```

Gotcha owns the contract authority, generator instructions, schema validation, rule attribution, deterministic attack execution, survivor ranking, and data boundary. The caller still owns model credentials, provider selection, and provider-specific infrastructure.

The generator proposes declarative mutated outputs; it does **not** provide executable mutation code. Confirmed rule severity remains authoritative and is not delegated back to the generator.

## Bring your own business idea
'''
readme = replace_once(readme, anchor, section, "README contract attack section")

readme = replace_once(
    readme,
    "The long-term product connects those two halves into one continuous quality-improvement loop.",
    "`runContractAttacks()` now connects a confirmed Quality Contract to provider-independent AI-assisted attack generation, while the deterministic engine remains responsible for executing and ranking the attacks.",
    "README architecture bridge",
)

readme = replace_once(
    readme,
    "- explicit human confirmation\n- deterministic attacks",
    "- explicit human confirmation\n- confirmed-contract AI-assisted attack generation through an injected provider-independent generator\n- deterministic attacks",
    "README current scope",
)

readme = replace_once(
    readme,
    "- an AI-generated mutation system\n",
    "",
    "README obsolete exclusion",
)

start = readme.find("## What comes next\n")
end = readme.find("## Why Gotcha?\n")
if start < 0 or end < 0 or end <= start:
    raise SystemExit("missing README What comes next section")
next_section = '''## What comes next

The confirmed-contract attack bridge is implemented.

The current loop can now move from human-confirmed quality rules to provider-independent AI-assisted attack proposals, then hand those validated proposals back to Gotcha's deterministic engine for execution and ranking.

Future layers can focus on product integrations around that core — for example hosted provider adapters, production workflows, richer remediation, and collaboration — without moving model credentials or provider-specific logic into the deterministic engine.

The aim remains a system that keeps asking:

> **“What important failure are we still allowing through?”**

'''
readme = readme[:start] + next_section + readme[end:]

readme = replace_once(
    readme,
    "- human Quality Contract confirmation\n\nThe next product layer connects confirmed contracts to AI-assisted attack generation.",
    "- human Quality Contract confirmation\n- confirmed Quality Contracts connected to provider-independent AI-assisted attack generation via `runContractAttacks()`\n\nThe contract-to-attack bridge is implemented; future milestones can build integrations and workflows around this stable core.",
    "README status",
)

readme_path.write_text(readme)


test_path = Path("test/m8-final-closure.test.js")
test_path.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const { runContractAttacks } = require("../src");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved structured value.",
    rules: [{
      id: "value-rule",
      statement: "Return the approved structured value.",
      kind: "required",
      severity: "critical"
    }]
  };
}

function attack(mutatedOutput) {
  return {
    id: "structured-change",
    ruleId: "value-rule",
    type: "structured-change",
    description: "Changes the approved structured value.",
    rationale: "Exercises the confirmed rule.",
    mutatedOutput,
    scores: {
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.9
    }
  };
}

function options(expectedOutput, evaluator, mutatedOutput) {
  const confirmed = contract();
  return {
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [attack(mutatedOutput)]
      };
    }
  };
}

test("frozen local Array/Object constructors preserve positive control and candidate instanceof", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const script = String.raw`
    "use strict";
    const assert = require("node:assert/strict");
    const { runContractAttacks } = require("./src");

    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved structured value.",
      rules: [{
        id: "value-rule",
        statement: "Return the approved structured value.",
        kind: "required",
        severity: "critical"
      }]
    };

    Object.freeze(Object);
    Object.freeze(Array);

    let generatorCalled = false;

    runContractAttacks({
      contract,
      input: { request: "approved" },
      expectedOutput: { items: ["approved"] },
      evaluator(output) {
        return (
          output instanceof Object &&
          output.items instanceof Array
        );
      },
      generator() {
        generatorCalled = true;
        return {
          version: 1,
          task: contract.task,
          attacks: [{
            id: "structured-change",
            ruleId: "value-rule",
            type: "structured-change",
            description: "Changes the approved structured value.",
            rationale: "Exercises the confirmed rule.",
            mutatedOutput: { items: ["changed"] },
            scores: {
              realism: 0.9,
              subtlety: 0.8,
              novelty: 0.7,
              fixability: 0.9
            }
          }]
        };
      }
    }).then((result) => {
      assert.equal(generatorCalled, true);
      assert.equal(result.baselinePassed, true);
      assert.equal(result.attack.survivors.length, 1);
      assert.notEqual(result.topFinding, null);
    }).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  execFileSync(process.execPath, ["-e", script], {
    cwd: repoRoot,
    stdio: "pipe"
  });
});

test("generated candidates inherit a frozen foreign array realm semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    [{ value: "approved" }];
  `, context);
  const evaluator = vm.runInContext(
    "(output) => output instanceof Array && output[0] instanceof Object",
    context
  );

  const result = await runContractAttacks(
    options(
      expectedOutput,
      evaluator,
      [{ value: "changed" }]
    )
  );

  assert.equal(result.baselinePassed, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("generated candidates inherit matching foreign object and nested array semantics", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    ({ items: ["approved"] });
  `, context);
  const evaluator = vm.runInContext(
    "(output) => output instanceof Object && output.items instanceof Array",
    context
  );

  const result = await runContractAttacks(
    options(
      expectedOutput,
      evaluator,
      { items: ["changed"] }
    )
  );

  assert.equal(result.baselinePassed, true);
  assert.equal(result.attack.survivors.length, 1);
  assert.notEqual(result.topFinding, null);
});

test("README documents the public contract-attack bridge", () => {
  const readme = fs.readFileSync(
    path.resolve(__dirname, "..", "README.md"),
    "utf8"
  );

  assert.match(readme, /runContractAttacks/);
  assert.match(readme, /Attack from a confirmed Quality Contract/);
  assert.match(readme, /provider-independent AI-assisted attack generation/);
  assert.doesNotMatch(
    readme,
    /The next major bridge is to let confirmed Quality Contracts help generate and prioritize attacks\./
  );
  assert.doesNotMatch(readme, /an AI-generated mutation system/);
});
''')

print("Final closure patch prepared.")
