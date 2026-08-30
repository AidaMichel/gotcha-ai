from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
CORE = ROOT / "src" / "ai-data-core.js"
TEST = ROOT / "test" / "m8-runtime-brand-authority.test.js"

core = CORE.read_text()
test = TEST.read_text()


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing exact seam: {label}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"expected one regex seam for {label}, got {count}")
    return updated


core = replace_once(
    core,
'''const {
  types: utilTypes,
  inspect
} = require("node:util");''',
'''const nodeUtil =
  require("node:util");

const {
  types: utilTypes,
  inspect
} = nodeUtil;''',
    "node util capture",
)

core = replace_once(
    core,
'''const workerThreads =
  require("node:worker_threads");

const nodeCrypto =
  require("node:crypto");''',
'''const workerThreads =
  require("node:worker_threads");

const nodeUrl =
  require("node:url");

const nodeBuffer =
  require("node:buffer");

let streamWeb = null;

try {
  streamWeb =
    require("node:stream/web");
} catch {}

const nodeCrypto =
  require("node:crypto");

const nodeProcess =
  require("node:process");''',
    "trusted host modules",
)

core = replace_once(
    core,
'''const numberIsInteger =
  Number.isInteger;''',
'''const numberIsInteger =
  Number.isInteger;

const numberParseInt =
  Number.parseInt;''',
    "number parse capture",
)

core = replace_once(
    core,
'''const functionToString =
  Function.prototype.toString;

const structuredCloneFunction =
  typeof globalThis.structuredClone ===
    "function"
    ? globalThis.structuredClone
    : null;''',
'''const functionToString =
  vm.runInNewContext(
    "Function.prototype.toString"
  );

const stringIncludes =
  vm.runInNewContext(
    "String.prototype.includes"
  );''',
    "pristine source intrinsics",
)

core = sub_once(
    core,
    r'''function captureNavigatorLocks\(\) \{.*?const navigatorLocks =\n  captureNavigatorLocks\(\);''',
'''function captureNavigatorSingleton() {
  try {
    const value =
      globalThis.navigator;

    return (
      value !== null &&
      typeof value === "object" &&
      !utilTypePredicates.isProxy(value)
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

const navigatorSingleton =
  captureNavigatorSingleton();

function captureNavigatorLocks() {
  if (navigatorSingleton === null) {
    return null;
  }

  try {
    const locks =
      navigatorSingleton.locks;

    return (
      locks !== null &&
      typeof locks === "object" &&
      !utilTypePredicates.isProxy(locks)
    )
      ? locks
      : null;
  } catch {
    return null;
  }
}

const navigatorLocks =
  captureNavigatorLocks();''',
    "navigator singleton",
)

core = replace_once(
    core,
'''function captureCryptoSubtleSingleton() {
  try {
    const cryptoObject =
      globalThis.crypto;''',
'''function captureCryptoSingleton() {
  try {
    const value =
      globalThis.crypto;

    return (
      value !== null &&
      typeof value === "object" &&
      !utilTypePredicates.isProxy(value)
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

const cryptoSingleton =
  captureCryptoSingleton();

function captureCryptoSubtleSingleton() {
  try {
    const cryptoObject =
      cryptoSingleton;''',
    "crypto singleton",
)

core = replace_once(
    core,
'''      workerThreads.locks,
      navigatorLocks,
      cryptoSubtleSingleton,
      nodeCryptoSubtleSingleton''',
'''      workerThreads.locks,
      navigatorSingleton,
      navigatorLocks,
      cryptoSingleton,
      cryptoSubtleSingleton,
      nodeCryptoSubtleSingleton''',
    "host singleton list",
)

core = sub_once(
    core,
    r'''function capturePrototypeGetter\(.*?\nfunction captureMethodFromPrototype\(''',
'''function captureConstructorPrototype(
  constructor
) {
  if (
    typeof constructor !== "function" ||
    utilTypePredicates.isProxy(constructor)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        constructor,
        "prototype"
      );
  } catch {
    return null;
  }

  if (
    descriptor === undefined ||
    "get" in descriptor ||
    "set" in descriptor ||
    descriptor.value === null ||
    typeof descriptor.value !== "object" ||
    utilTypePredicates.isProxy(
      descriptor.value
    )
  ) {
    return null;
  }

  return descriptor.value;
}

function captureGetterFromPrototypeObject(
  prototype,
  propertyName
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    typeof descriptor.get === "function" &&
    !utilTypePredicates.isProxy(
      descriptor.get
    )
  )
    ? descriptor.get
    : null;
}

function captureMethodFromPrototypeObject(
  prototype,
  propertyName
) {
  if (
    prototype === null ||
    typeof prototype !== "object" ||
    utilTypePredicates.isProxy(prototype)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value === "function" &&
    !utilTypePredicates.isProxy(
      descriptor.value
    )
  )
    ? descriptor.value
    : null;
}

function capturePrototypeGetter(
  constructor,
  propertyName
) {
  return captureGetterFromPrototypeObject(
    captureConstructorPrototype(constructor),
    propertyName
  );
}

function capturePrototypeMethod(
  constructor,
  propertyName
) {
  return captureMethodFromPrototypeObject(
    captureConstructorPrototype(constructor),
    propertyName
  );
}

function captureMethodFromPrototype(''',
    "proxy-safe prototype capture",
)

undici_helpers = r'''const nodeMajorVersion =
  numberParseInt(
    nodeProcess.versions.node,
    10
  );

const undiciRuntimeExpected =
  numberIsFinite(nodeMajorVersion) &&
  nodeMajorVersion >= 18;

let undiciHostBrandAuthorityAvailable =
  true;

function captureUndiciNativeSource() {
  if (!undiciRuntimeExpected) {
    return null;
  }

  let bindingDescriptor;

  try {
    bindingDescriptor =
      getOwnPropertyDescriptor(
        nodeProcess,
        "binding"
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    bindingDescriptor === undefined ||
    "get" in bindingDescriptor ||
    "set" in bindingDescriptor ||
    typeof bindingDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      bindingDescriptor.value
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let natives;

  try {
    natives =
      reflectApply(
        bindingDescriptor.value,
        nodeProcess,
        ["natives"]
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    natives === null ||
    typeof natives !== "object" ||
    utilTypePredicates.isProxy(natives)
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let sourceDescriptor;

  try {
    sourceDescriptor =
      getOwnPropertyDescriptor(
        natives,
        "internal/deps/undici/undici"
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    sourceDescriptor === undefined ||
    "get" in sourceDescriptor ||
    "set" in sourceDescriptor ||
    typeof sourceDescriptor.value !== "string" ||
    sourceDescriptor.value === ""
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  return sourceDescriptor.value;
}

const undiciNativeSource =
  captureUndiciNativeSource();

function sourceBelongsToUndiciBundle(
  callable
) {
  if (
    undiciNativeSource === null ||
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable)
  ) {
    return false;
  }

  let source;

  try {
    source =
      reflectApply(
        functionToString,
        callable,
        []
      );

    return reflectApply(
      stringIncludes,
      undiciNativeSource,
      [source]
    );
  } catch {
    return false;
  }
}

function hasExpectedCallableMetadata(
  callable,
  expectedName,
  expectedLength
) {
  let nameDescriptor;
  let lengthDescriptor;

  try {
    nameDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "name"
      );
    lengthDescriptor =
      getOwnPropertyDescriptor(
        callable,
        "length"
      );
  } catch {
    return false;
  }

  return (
    nameDescriptor !== undefined &&
    !("get" in nameDescriptor) &&
    !("set" in nameDescriptor) &&
    nameDescriptor.value === expectedName &&
    lengthDescriptor !== undefined &&
    !("get" in lengthDescriptor) &&
    !("set" in lengthDescriptor) &&
    lengthDescriptor.value === expectedLength
  );
}

function captureRequiredUndiciProbe(
  constructorName,
  propertyName,
  kind,
  expectedLength,
  args
) {
  if (!undiciRuntimeExpected) {
    return null;
  }

  if (undiciNativeSource === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let globalDescriptor;

  try {
    globalDescriptor =
      getOwnPropertyDescriptor(
        globalThis,
        constructorName
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    globalDescriptor === undefined ||
    "get" in globalDescriptor ||
    "set" in globalDescriptor ||
    typeof globalDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      globalDescriptor.value
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const constructor =
    globalDescriptor.value;

  if (
    !hasExpectedCallableMetadata(
      constructor,
      constructorName,
      constructor.length
    ) ||
    !sourceBelongsToUndiciBundle(
      constructor
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const prototype =
    captureConstructorPrototype(
      constructor
    );

  if (prototype === null) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  let constructorDescriptor;
  let probeDescriptor;

  try {
    constructorDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        "constructor"
      );
    probeDescriptor =
      getOwnPropertyDescriptor(
        prototype,
        propertyName
      );
  } catch {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  if (
    constructorDescriptor === undefined ||
    "get" in constructorDescriptor ||
    "set" in constructorDescriptor ||
    constructorDescriptor.value !== constructor ||
    probeDescriptor === undefined
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  const callable =
    kind === "getter"
      ? probeDescriptor.get
      : probeDescriptor.value;

  const expectedName =
    kind === "getter"
      ? `get ${propertyName}`
      : propertyName;

  if (
    typeof callable !== "function" ||
    utilTypePredicates.isProxy(callable) ||
    !hasExpectedCallableMetadata(
      callable,
      expectedName,
      expectedLength
    ) ||
    !sourceBelongsToUndiciBundle(
      callable
    )
  ) {
    undiciHostBrandAuthorityAvailable = false;
    return null;
  }

  return {
    constructor,
    method: callable,
    args
  };
}

function captureIntlConstructor('''

core = sub_once(
    core,
    r'''function hasTrustedHostProbeCallableShape\(.*?\nfunction captureIntlConstructor\(''',
    undici_helpers,
    "undici authority helpers",
)

host_probe_block = r'''function captureModuleConstructor(
  moduleObject,
  name
) {
  if (
    moduleObject === null ||
    typeof moduleObject !== "object" ||
    utilTypePredicates.isProxy(moduleObject)
  ) {
    return null;
  }

  let descriptor;

  try {
    descriptor =
      getOwnPropertyDescriptor(
        moduleObject,
        name
      );
  } catch {
    return null;
  }

  return (
    descriptor !== undefined &&
    "value" in descriptor &&
    typeof descriptor.value === "function" &&
    !utilTypePredicates.isProxy(
      descriptor.value
    )
  )
    ? descriptor.value
    : null;
}

function captureAbortBrandGetters() {
  let factoryDescriptor;

  try {
    factoryDescriptor =
      getOwnPropertyDescriptor(
        nodeUtil,
        "transferableAbortController"
      );
  } catch {
    return {
      controller: null,
      signal: null
    };
  }

  if (
    factoryDescriptor === undefined ||
    "get" in factoryDescriptor ||
    "set" in factoryDescriptor ||
    typeof factoryDescriptor.value !== "function" ||
    utilTypePredicates.isProxy(
      factoryDescriptor.value
    )
  ) {
    return {
      controller: null,
      signal: null
    };
  }

  let controller;

  try {
    controller =
      reflectApply(
        factoryDescriptor.value,
        nodeUtil,
        []
      );
  } catch {
    return {
      controller: null,
      signal: null
    };
  }

  const controllerGetter =
    captureGetterFromPrototypeObject(
      getPrototypeOf(controller),
      "signal"
    );

  if (controllerGetter === null) {
    return {
      controller: null,
      signal: null
    };
  }

  let signal;

  try {
    signal =
      reflectApply(
        controllerGetter,
        controller,
        []
      );
  } catch {
    return {
      controller: controllerGetter,
      signal: null
    };
  }

  return {
    controller: controllerGetter,
    signal:
      captureGetterFromPrototypeObject(
        getPrototypeOf(signal),
        "aborted"
      )
  };
}

const abortBrandGetters =
  captureAbortBrandGetters();

const trustedHostBrandGetters =
  objectFreeze(
    [
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUtil,
          "TextEncoder"
        ),
        "encoding"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUtil,
          "TextDecoder"
        ),
        "encoding"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeUrl,
          "URL"
        ),
        "href"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeBuffer,
          "Blob"
        ),
        "size"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          nodeBuffer,
          "File"
        ),
        "name"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "ReadableStream"
        ),
        "locked"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "WritableStream"
        ),
        "locked"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "TransformStream"
        ),
        "readable"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "TextEncoderStream"
        ),
        "readable"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "TextDecoderStream"
        ),
        "readable"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "CompressionStream"
        ),
        "readable"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "DecompressionStream"
        ),
        "readable"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "CountQueuingStrategy"
        ),
        "highWaterMark"
      ),
      capturePrototypeGetter(
        captureModuleConstructor(
          streamWeb,
          "ByteLengthQueuingStrategy"
        ),
        "highWaterMark"
      ),
      abortBrandGetters.controller,
      abortBrandGetters.signal
    ].filter(
      (getter) =>
        getter !== null
    )
  );

const trustedHostBrandMethods =
  objectFreeze(
    [
      capturePrototypeMethod(
        captureModuleConstructor(
          nodeUrl,
          "URLSearchParams"
        ),
        "toString"
      )
    ].filter(
      (method) =>
        method !== null
    )
  );

const headersBrandProbe =
  captureRequiredUndiciProbe(
    "Headers",
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const formDataBrandProbe =
  captureRequiredUndiciProbe(
    "FormData",
    "get",
    "method",
    1,
    ["__gotcha_brand_probe__"]
  );

const requestBrandProbe =
  captureRequiredUndiciProbe(
    "Request",
    "url",
    "getter",
    0,
    []
  );

const responseBrandProbe =
  captureRequiredUndiciProbe(
    "Response",
    "status",
    "getter",
    0,
    []
  );

const additionalHostBrandMethodAuthorityAvailable =
  !undiciRuntimeExpected ||
  (
    undiciHostBrandAuthorityAvailable &&
    headersBrandProbe !== null &&
    formDataBrandProbe !== null &&
    requestBrandProbe !== null &&
    responseBrandProbe !== null
  );

const additionalHostBrandMethodProbes =
  objectFreeze(
    [
      headersBrandProbe,
      formDataBrandProbe,
      requestBrandProbe,
      responseBrandProbe
    ].filter(
      (probe) =>
        probe !== null
    )
  );

const pristineWeakRefConstructor =
  vm.runInNewContext(
    "typeof WeakRef === 'function' ? WeakRef : null"
  );

const pristineFinalizationRegistryConstructor =
  vm.runInNewContext(
    "typeof FinalizationRegistry === 'function' ? FinalizationRegistry : null"
  );

const weakRefDeref =
  capturePrototypeMethod(
    pristineWeakRefConstructor,
    "deref"
  );

const finalizationRegistryUnregister =
  capturePrototypeMethod(
    pristineFinalizationRegistryConstructor,
    "unregister"
  );

const finalizationRegistryProbeToken =
  objectFreeze({});

const intlResolvedOptionMethods ='''

core = sub_once(
    core,
    r'''const HOST_BRAND_GETTER_SPECS =.*?const intlResolvedOptionMethods =''',
    host_probe_block,
    "trusted host probe block",
)

core = replace_once(
    core,
'''function hasUnsupportedHostBrand(
  value
) {
  for (
    const getter of
      unsupportedHostBrandGetters
  ) {''',
'''function hasUnsupportedHostBrand(
  value
) {
  for (
    const getter of
      trustedHostBrandGetters
  ) {''',
    "host getter loop",
)

core = replace_once(
    core,
'''  return false;
}

function samePropertyDescriptor(''',
'''  for (
    const method of
      trustedHostBrandMethods
  ) {
    try {
      reflectApply(
        method,
        value,
        []
      );

      return true;
    } catch {}
  }

  return false;
}

function samePropertyDescriptor(''',
    "host method loop",
)

core = replace_once(
    core,
'''  if (
    !globalHostBrandAuthorityAvailable ||
    !additionalHostBrandMethodAuthorityAvailable
  ) {''',
'''  if (
    !additionalHostBrandMethodAuthorityAvailable
  ) {''',
    "undici authority gate",
)

message_probe = r'''function captureMessagePortCloneProbe() {
  if (
    typeof workerThreads.MessageChannel !==
      "function" ||
    typeof workerThreads.receiveMessageOnPort !==
      "function"
  ) {
    return null;
  }

  const postMessage =
    capturePrototypeMethod(
      workerThreads.MessagePort,
      "postMessage"
    );

  if (postMessage === null) {
    return null;
  }

  let channel;

  try {
    channel =
      new workerThreads.MessageChannel();

    if (
      typeof channel.port1.unref ===
        "function"
    ) {
      channel.port1.unref();
    }

    if (
      typeof channel.port2.unref ===
        "function"
    ) {
      channel.port2.unref();
    }
  } catch {
    return null;
  }

  return objectFreeze({
    postMessage,
    sendPort: channel.port1,
    receivePort: channel.port2,
    receiveMessageOnPort:
      workerThreads.receiveMessageOnPort
  });
}

const messagePortCloneProbe =
  captureMessagePortCloneProbe();

'''

core = replace_once(
    core,
'''const messagePortHasRef =
  typeof workerThreads.MessagePort ===
    "function"
    ? capturePrototypeMethod(
        workerThreads.MessagePort,
        "hasRef"
      )
    : null;

function hasUnsupportedHostBrand(''',
'''const messagePortHasRef =
  typeof workerThreads.MessagePort ===
    "function"
    ? capturePrototypeMethod(
        workerThreads.MessagePort,
        "hasRef"
      )
    : null;

''' + message_probe + '''function hasUnsupportedHostBrand(''',
    "message port clone probe",
)

core = sub_once(
    core,
    r'''function hasUncloneableStructuredCloneBrand\(\n  value\n\) \{.*?\n\}\n\nfunction isUnsupportedRuntimeObject''',
'''function hasUncloneableStructuredCloneBrand(
  value
) {
  if (
    messagePortCloneProbe === null ||
    !isStructuredCloneProbeSafe(value)
  ) {
    return false;
  }

  try {
    reflectApply(
      messagePortCloneProbe.postMessage,
      messagePortCloneProbe.sendPort,
      [value]
    );

    reflectApply(
      messagePortCloneProbe.receiveMessageOnPort,
      undefined,
      [
        messagePortCloneProbe.receivePort
      ]
    );

    return false;
  } catch (error) {
    return (
      error !== null &&
      typeof error === "object" &&
      (
        error.name === "DataCloneError" ||
        error.name === "TypeError"
      )
    );
  }
}

function isUnsupportedRuntimeObject''',
    "trusted clone probe",
)

# The old stateful accessor test is stronger now: the accessor is never invoked.
test = replace_once(
    test,
'''    assert.equal(reads, 1);
    assert.throws(() => cloneAiData(saved));''',
'''    assert.equal(reads, 0);
    assert.throws(() => cloneAiData(saved));''',
    "stateful accessor expectation",
)

regressions = r'''

test("concise spoofed Headers brand method is rejected without execution", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Constructor = globalThis.Headers;
    if (typeof Constructor !== "function") process.exit(0);

    const saved = new Constructor();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let calls = 0;
    Constructor.prototype.get = ({
      get(name) {
        calls += 1;
        throw new Error("spoofed concise method executed");
      }
    }).get;

    globalThis.structuredClone = undefined;
    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});

    assert.throws(() => cloneAiData(saved));
    assert.equal(calls, 0);
  `);
});

test("replacement Headers constructor cannot borrow the genuine prototype authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    const Replacement = OriginalHeaders.bind(null);
    Object.defineProperty(Replacement, "prototype", {
      value: OriginalHeaders.prototype
    });
    globalThis.Headers = Replacement;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("module-owned URL probe survives a missing ambient URL constructor", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalURL = globalThis.URL;
    if (typeof OriginalURL !== "function") process.exit(0);

    const saved = new OriginalURL("https://example.com/");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URL = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("proxy-backed replacement constructor prototype is never inspected", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const OriginalHeaders = globalThis.Headers;
    if (typeof OriginalHeaders !== "function") process.exit(0);

    const saved = new OriginalHeaders();
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    let trapCalls = 0;
    function Replacement() {}
    Replacement.prototype = new Proxy({}, {
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("prototype descriptor trap executed");
      },
      get() {
        trapCalls += 1;
        throw new Error("prototype get trap executed");
      }
    });

    globalThis.Headers = Replacement;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
    assert.equal(trapCalls, 0);
  `);
});

test("poisoned String includes is not probe authority", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const originalIncludes = String.prototype.includes;
    let calls = 0;
    String.prototype.includes = function poisonedIncludes() {
      calls += 1;
      throw new Error("ambient String.includes executed");
    };

    let cloneAiData;
    try {
      ({ cloneAiData } = require(${JSON.stringify(aiDataPath)}));
    } finally {
      String.prototype.includes = originalIncludes;
    }

    assert.equal(calls, 0);
    assert.deepEqual(
      cloneAiData({ safe: true }),
      { safe: true }
    );
  `);
});

test("module-owned URLSearchParams probe works without the ambient constructor", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Original = globalThis.URLSearchParams;
    if (typeof Original !== "function") process.exit(0);

    const saved = new Original("a=1");
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URLSearchParams = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});

test("URLPattern brand detection does not depend on its ambient getter shape", () => {
  runIsolated(`
    "use strict";
    const assert = require("node:assert/strict");

    const Original = globalThis.URLPattern;
    if (typeof Original !== "function") process.exit(0);

    const saved = new Original({ pathname: "/x" });
    saved.foo = "bar";
    Object.setPrototypeOf(saved, Object.prototype);

    globalThis.URLPattern = undefined;
    globalThis.structuredClone = undefined;

    const { cloneAiData } = require(${JSON.stringify(aiDataPath)});
    assert.throws(() => cloneAiData(saved));
  `);
});
'''

if "concise spoofed Headers brand method" in test:
    raise SystemExit("review4 regressions already present")

test = test.rstrip() + regressions + "\n"

CORE.write_text(core)
TEST.write_text(test)
print("applied final M8 host authority remediation")
