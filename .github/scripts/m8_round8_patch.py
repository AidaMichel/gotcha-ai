from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Could not find {label}")
    return text.replace(old, new, 1)


contract_path = Path("src/contract-attacks.js")
contract = contract_path.read_text()

old_surface_block = '''function restoreCallbackIntrinsicSurfaces(
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
}
'''

new_surface_block = '''function restoreCallbackIntrinsicSurfaces(
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

let callbackIntrinsicScopeBaseline = null;
let callbackIntrinsicScopeCount = 0;

function enterCallbackIntrinsicScope() {
  if (callbackIntrinsicScopeCount === 0) {
    callbackIntrinsicScopeBaseline =
      captureCallbackIntrinsicSurfaces();
  } else {
    restoreCallbackIntrinsicSurfaces(
      callbackIntrinsicScopeBaseline
    );
  }

  callbackIntrinsicScopeCount += 1;

  return {
    closed: false
  };
}

function closeCallbackIntrinsicScope(
  scope
) {
  if (
    scope === null ||
    typeof scope !== "object" ||
    scope.closed === true
  ) {
    return;
  }

  const baseline =
    callbackIntrinsicScopeBaseline;

  if (
    baseline === null ||
    callbackIntrinsicScopeCount <= 0
  ) {
    scope.closed = true;
    throw new Error(
      "Callback intrinsic scope is not active."
    );
  }

  let restoreError = null;

  try {
    restoreCallbackIntrinsicSurfaces(
      baseline
    );
  } catch (error) {
    restoreError = error;
  }

  scope.closed = true;
  callbackIntrinsicScopeCount -= 1;

  if (callbackIntrinsicScopeCount === 0) {
    callbackIntrinsicScopeBaseline = null;
  }

  if (restoreError !== null) {
    throw restoreError;
  }
}

function withRestoredCallbackIntrinsicSurfaces(
  callback,
  thisArg,
  args
) {
  const scope =
    enterCallbackIntrinsicScope();

  try {
    return reflectApply(
      callback,
      thisArg,
      args
    );
  } finally {
    closeCallbackIntrinsicScope(
      scope
    );
  }
}
'''

contract = replace_once(
    contract,
    old_surface_block,
    new_surface_block,
    "callback intrinsic surface coordinator block",
)

old_evaluator_semantics = '''function withSafeEvaluatorInstanceSemantics(
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
}
'''

new_evaluator_semantics = '''function canInstallEvaluatorInstanceSemantic(
  constructor,
  previousDescriptor
) {
  if (previousDescriptor === undefined) {
    return isExtensible(constructor);
  }

  return previousDescriptor.configurable === true;
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

      if (
        !canInstallEvaluatorInstanceSemantic(
          constructor,
          previousDescriptor
        )
      ) {
        continue;
      }

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
}
'''

contract = replace_once(
    contract,
    old_evaluator_semantics,
    new_evaluator_semantics,
    "evaluator instance semantics block",
)

old_safe_promise = '''  const ownConstructor =
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
    if (
      !("get" in ownConstructor) &&
      !("set" in ownConstructor) &&
      (
        ownConstructor.value ===
          promiseConstructor ||
        ownConstructor.value ===
          undefined
      )
    ) {
      requirePromiseIntrinsicIntegrity();
      return callback();
    }

    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }

  const prototype =
    getPrototypeOf(value);
'''

new_safe_promise = '''  const ownConstructor =
    getOwnPropertyDescriptor(
      value,
      "constructor"
    );

  const prototype =
    getPrototypeOf(value);

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
    if (
      !("get" in ownConstructor) &&
      !("set" in ownConstructor) &&
      (
        ownConstructor.value ===
          promiseConstructor ||
        ownConstructor.value ===
          undefined ||
        isAuthenticatedStandardPromisePrototype(
          prototype,
          ownConstructor
        )
      )
    ) {
      requirePromiseIntrinsicIntegrity();
      return callback();
    }

    throw new Error(
      "Native Promise cannot be observed safely."
    );
  }
'''

contract = replace_once(
    contract,
    old_safe_promise,
    new_safe_promise,
    "foreign Promise constructor authentication",
)

old_create_safe_evaluator = '''    const result =
      withSafeEvaluatorInstanceSemantics(
        instanceSemantics,
        () =>
          withRestoredCallbackIntrinsicSurfaces(
            evaluator,
            undefined,
            [evaluatorOutput]
          )
      );
'''

new_create_safe_evaluator = '''    const result =
      withRestoredCallbackIntrinsicSurfaces(
        () =>
          withSafeEvaluatorInstanceSemantics(
            instanceSemantics,
            () =>
              reflectApply(
                evaluator,
                undefined,
                [evaluatorOutput]
              )
          ),
        undefined,
        []
      );
'''

contract = replace_once(
    contract,
    old_create_safe_evaluator,
    new_create_safe_evaluator,
    "evaluator callback coordination order",
)

old_invoke_generator = '''function invokeGenerator(
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
}
'''

new_invoke_generator = '''function invokeGenerator(
  generator,
  argumentsObject
) {
  const scope =
    enterCallbackIntrinsicScope();

  let returned;

  try {
    returned =
      reflectApply(
        generator,
        undefined,
        [argumentsObject]
      );
  } catch (error) {
    closeCallbackIntrinsicScope(
      scope
    );
    throw error;
  }

  const isNativePromise =
    utilIsPromise(returned);

  if (!isNativePromise) {
    closeCallbackIntrinsicScope(
      scope
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
    closeCallbackIntrinsicScope(
      scope
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
    scope,
    integrityError
  };
}
'''

contract = replace_once(
    contract,
    old_invoke_generator,
    new_invoke_generator,
    "generator callback scope block",
)

contract = replace_once(
    contract,
    '''    restoreCallbackIntrinsicSurfaces(
      generatorInvocation.surfaces
    );''',
    '''    closeCallbackIntrinsicScope(
      generatorInvocation.scope
    );''',
    "async generator scope close",
)

contract_path.write_text(contract)

ai_path = Path("src/ai-data.js")
ai = ai_path.read_text()

old_als_capture = '''const asyncLocalStorageGetStore =
  capturePrototypeMethod(
    AsyncLocalStorage,
    "getStore"
  );
'''

new_als_capture = '''const asyncLocalStorageGetStore =
  capturePrototypeMethod(
    AsyncLocalStorage,
    "getStore"
  );

const messagePortHasRef =
  typeof workerThreads.MessagePort ===
    "function"
    ? capturePrototypeMethod(
        workerThreads.MessagePort,
        "hasRef"
      )
    : null;
'''

ai = replace_once(
    ai,
    old_als_capture,
    new_als_capture,
    "MessagePort brand capture",
)

old_als_probe = '''  if (asyncLocalStorageGetStore !== null) {
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

  return false;
}
'''

new_als_probe = '''  if (messagePortHasRef !== null) {
    try {
      reflectApply(
        messagePortHasRef,
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

  return false;
}
'''

ai = replace_once(
    ai,
    old_als_probe,
    new_als_probe,
    "MessagePort brand probe",
)

ai_path.write_text(ai)

round8 = r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const workerThreads = require("node:worker_threads");

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

function attackOutput(id = "wrong-value") {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: [
      {
        id,
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput: { value: id },
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

test("overlapping async generators restore one coordinated intrinsic baseline", () => {
  const source = String.raw`
    "use strict";
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const attackOutput = (id) => ({
      version: 1,
      task: "Return the approved value.",
      attacks: [{
        id,
        ruleId: "value-rule",
        type: "wrong-value",
        description: "Changes the approved value.",
        rationale: "Proposed violation.",
        mutatedOutput: { value: id },
        scores: { realism: 1, subtlety: 1, novelty: 1, fixability: 1 }
      }]
    });
    const deferred = () => {
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      return { promise, resolve };
    };
    (async () => {
      const originalFilter = Array.prototype.filter;
      const aStarted = deferred();
      const bStarted = deferred();
      const releaseA = deferred();
      const releaseB = deferred();

      const runA = runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        async generator() {
          Array.prototype.filter = () => [];
          aStarted.resolve();
          await releaseA.promise;
          return attackOutput("attack-a");
        }
      });

      await aStarted.promise;

      const runB = runContractAttacks({
        contract,
        input: { request: "approved" },
        expectedOutput: { value: "approved" },
        evaluator: () => true,
        async generator() {
          bStarted.resolve();
          await releaseB.promise;
          return attackOutput("attack-b");
        }
      });

      await bStarted.promise;
      releaseA.resolve();
      const resultA = await runA;
      releaseB.resolve();
      const resultB = await runB;

      if (Array.prototype.filter !== originalFilter) {
        throw new Error("Array.prototype.filter was not restored");
      }
      if (!resultA.topFinding || !resultB.topFinding) {
        throw new Error("overlap lost a top finding");
      }
      if (resultB.attack.survivors.length !== 1) {
        throw new Error("overlap lost the surviving attack");
      }
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  const child = spawnSync(
    process.execPath,
    ["--unhandled-rejections=strict", "-e", source],
    { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }
  );

  assert.equal(child.status, 0, child.stderr || child.stdout);
});

test("non-configurable foreign standard Promise constructors are safely observed", () => {
  const source = String.raw`
    "use strict";
    const vm = require("node:vm");
    const { runContractAttacks } = require("./src");
    const contract = ${JSON.stringify(confirmedContract())};
    const context = vm.createContext({});
    const makePromise = vm.runInContext(
      \`() => {
        const promise = Promise.reject(new Error("foreign constructor rejection"));
        Object.defineProperty(promise, "constructor", {
          value: Promise,
          writable: false,
          enumerable: false,
          configurable: false
        });
        return promise;
      }\`,
      context
    );
    (async () => {
      try {
        await runContractAttacks({
          contract,
          input: { request: "approved" },
          expectedOutput: { value: "approved" },
          evaluator: () => true,
          generator: () => makePromise()
        });
        throw new Error("expected rejection");
      } catch (error) {
        if (!/foreign constructor rejection/.test(String(error && error.message))) {
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

test("frozen cross-realm constructors do not abort evaluators that need no override", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(
    "Object.freeze(Array); Object.freeze(Object); [1, 2]",
    context
  );
  const evaluator = vm.runInContext(
    "(output) => Array.isArray(output)",
    context
  );
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

test("prototype-tampered MessagePort values fail closed", (t) => {
  if (
    typeof workerThreads.MessageChannel !== "function" ||
    typeof workerThreads.MessagePort !== "function"
  ) {
    t.skip("MessagePort is unavailable on this runtime");
    return;
  }

  const { port1, port2 } =
    new workerThreads.MessageChannel();
  const close =
    workerThreads.MessagePort.prototype.close;

  try {
    for (const key of Reflect.ownKeys(port1)) {
      if (typeof key !== "symbol") {
        continue;
      }

      const descriptor =
        Object.getOwnPropertyDescriptor(
          port1,
          key
        );

      if (
        descriptor !== undefined &&
        descriptor.configurable
      ) {
        Reflect.deleteProperty(
          port1,
          key
        );
      }
    }

    port1.foo = { bar: 1 };
    Object.setPrototypeOf(
      port1,
      Object.prototype
    );

    assert.throws(
      () => cloneAiData(port1, "port"),
      /unsupported runtime object/
    );
  } finally {
    Reflect.apply(close, port1, []);
    Reflect.apply(close, port2, []);
  }
});
'''

Path("test/m8-codex-round8.test.js").write_text(round8)

print("Round 8 patch applied")
