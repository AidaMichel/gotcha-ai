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


path = Path("src/contract-attacks.js")
text = path.read_text()

start = "async function invokeGenerator(\n  generator,\n  argumentsObject\n) {"
end = "\n\nfunction normalizeGeneratorAttack("
replacement = r'''function invokeGenerator(
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

    return {
      isNativePromise: false,
      returned
    };
  }

  let bridged;

  try {
    bridged =
      bridgeNativePromise(
        returned
      );
  } catch (error) {
    restoreCallbackIntrinsicSurfaces(
      surfaces
    );
    throw error;
  }

  let integrityError = null;

  try {
    requirePromiseIntrinsicIntegrity();
  } catch (error) {
    integrityError = error;
  }

  return {
    isNativePromise: true,
    returned: bridged,
    surfaces,
    integrityError
  };
}'''
text = section(text, start, end, replacement, "invokeGenerator non-assimilating wrapper")

old_run = r'''  const rawGeneratorOutput =
    await invokeGenerator(
      generator,
      generatorArguments
    );'''
new_run = r'''  const generatorInvocation =
    invokeGenerator(
      generator,
      generatorArguments
    );

  let rawGeneratorOutput;

  if (generatorInvocation.isNativePromise) {
    let settledValue;
    let settlementError;
    let rejected = false;

    try {
      settledValue =
        await generatorInvocation.returned;
    } catch (error) {
      rejected = true;
      settlementError = error;
    }

    restoreCallbackIntrinsicSurfaces(
      generatorInvocation.surfaces
    );

    if (
      generatorInvocation.integrityError !==
        null
    ) {
      throw generatorInvocation.integrityError;
    }

    requirePromiseIntrinsicIntegrity();

    if (rejected) {
      throw settlementError;
    }

    rawGeneratorOutput =
      settledValue;
  } else {
    rawGeneratorOutput =
      generatorInvocation.returned;
  }'''
text = replace_once(text, old_run, new_run, "runContractAttacks generator settlement")
path.write_text(text)


test_path = Path("test/m8-codex-round3.test.js")
test_text = test_path.read_text()
old_test = r'''test("generator data does not expose shared Object or Array prototypes", async () => {
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
});'''
new_test = r'''test("generator data uses detached safe prototypes without exposing shared built-ins", async () => {
  const result = await runContractAttacks(
    makeOptions(
      ({ contract, input, expectedOutput }) => {
        const inputPrototype = Object.getPrototypeOf(input);
        const contractPrototype = Object.getPrototypeOf(contract);
        const rulesPrototype = Object.getPrototypeOf(contract.rules);
        const outputPrototype = Object.getPrototypeOf(expectedOutput);

        assert.notEqual(inputPrototype, Array.prototype);
        assert.notEqual(rulesPrototype, Array.prototype);
        assert.notEqual(contractPrototype, Object.prototype);
        assert.notEqual(outputPrototype, Object.prototype);

        assert.equal(typeof input.map, "function");
        assert.equal(typeof contract.rules.map, "function");

        assert.equal(
          Object.getPrototypeOf(
            Object.getPrototypeOf(inputPrototype)
          ),
          null
        );
        assert.equal(
          Object.getPrototypeOf(contractPrototype),
          null
        );
        assert.equal(
          Object.getPrototypeOf(outputPrototype),
          null
        );

        return validGeneratorOutput();
      },
      ["3 PM"]
    )
  );

  assert.equal(result.generatedAttacks.length, 1);
});'''

test_text = replace_once(test_text, old_test, new_test, "round3 generator prototype expectation")
test_path.write_text(test_text)

print("Round 7 thenable and legacy prototype compatibility fixed")
