"use strict";

const fs = require("node:fs");

const corePath = "src/ai-data-core.js";
const testPath = "test/m8-runtime-brand-authority.test.js";

let core = fs.readFileSync(corePath, "utf8");
let tests = fs.readFileSync(testPath, "utf8");

const anchor = `function captureMethodFromPrototype(\n  prototype,\n  propertyName\n) {\n  if (\n    prototype === null ||\n    typeof prototype !== "object" ||\n    utilTypePredicates.isProxy(prototype)\n  ) {\n    return null;\n  }\n\n  const descriptor =\n    getOwnPropertyDescriptor(\n      prototype,\n      propertyName\n    );\n\n  return (\n    descriptor !== undefined &&\n    "value" in descriptor &&\n    typeof descriptor.value ===\n      "function"\n  )\n    ? descriptor.value\n    : null;\n}\n\nlet globalHostBrandAuthorityAvailable = true;`;

const replacement = `function captureMethodFromPrototype(\n  prototype,\n  propertyName\n) {\n  if (\n    prototype === null ||\n    typeof prototype !== "object" ||\n    utilTypePredicates.isProxy(prototype)\n  ) {\n    return null;\n  }\n\n  const descriptor =\n    getOwnPropertyDescriptor(\n      prototype,\n      propertyName\n    );\n\n  return (\n    descriptor !== undefined &&\n    "value" in descriptor &&\n    typeof descriptor.value ===\n      "function"\n  )\n    ? descriptor.value\n    : null;\n}\n\nfunction hasTrustedHostProbeCallableShape(\n  callable,\n  expectedName,\n  expectedLength,\n  sourcePrefix\n) {\n  if (\n    typeof callable !== "function" ||\n    utilTypePredicates.isProxy(callable)\n  ) {\n    return false;\n  }\n\n  let prototypeDescriptor;\n  let nameDescriptor;\n  let lengthDescriptor;\n  let source;\n\n  try {\n    prototypeDescriptor =\n      getOwnPropertyDescriptor(\n        callable,\n        "prototype"\n      );\n    nameDescriptor =\n      getOwnPropertyDescriptor(\n        callable,\n        "name"\n      );\n    lengthDescriptor =\n      getOwnPropertyDescriptor(\n        callable,\n        "length"\n      );\n    source =\n      reflectApply(\n        functionToString,\n        callable,\n        []\n      );\n  } catch {\n    return false;\n  }\n\n  if (\n    prototypeDescriptor !== undefined ||\n    nameDescriptor === undefined ||\n    "get" in nameDescriptor ||\n    "set" in nameDescriptor ||\n    nameDescriptor.value !== expectedName ||\n    lengthDescriptor === undefined ||\n    "get" in lengthDescriptor ||\n    "set" in lengthDescriptor ||\n    lengthDescriptor.value !== expectedLength\n  ) {\n    return false;\n  }\n\n  return (\n    source.includes("[native code]") ||\n    source.startsWith(sourcePrefix)\n  );\n}\n\nlet globalHostBrandAuthorityAvailable = true;`;

if (!core.includes(anchor)) {
  throw new Error("core helper anchor not found");
}
core = core.replace(anchor, replacement);

const oldCaptureBlock = `function captureGlobalConstructor(\n  name\n) {\n  let value;\n\n  try {\n    value = globalThis[name];\n  } catch {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  if (typeof value !== "function") {\n    return null;\n  }\n\n  if (utilTypePredicates.isProxy(value)) {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  return value;\n}\n\nfunction captureIntlConstructor(`;

const newCaptureBlock = `function captureGlobalConstructor(\n  name\n) {\n  let value;\n\n  try {\n    value = globalThis[name];\n  } catch {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  if (typeof value !== "function") {\n    return null;\n  }\n\n  if (utilTypePredicates.isProxy(value)) {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  return value;\n}\n\nfunction captureGlobalHostBrandGetter(\n  constructorName,\n  propertyName\n) {\n  const constructor =\n    captureGlobalConstructor(\n      constructorName\n    );\n\n  if (constructor === null) {\n    return null;\n  }\n\n  const getter =\n    capturePrototypeGetter(\n      constructor,\n      propertyName\n    );\n\n  if (\n    getter === null ||\n    !hasTrustedHostProbeCallableShape(\n      getter,\n      \`get \${propertyName}\`,\n      0,\n      \`get \${propertyName}(\`\n    )\n  ) {\n    globalHostBrandAuthorityAvailable = false;\n    return null;\n  }\n\n  return getter;\n}\n\nfunction captureGlobalHostBrandMethod(\n  constructorName,\n  propertyName,\n  expectedLength\n) {\n  const constructor =\n    captureGlobalConstructor(\n      constructorName\n    );\n\n  if (constructor === null) {\n    return {\n      constructor: null,\n      method: null\n    };\n  }\n\n  const method =\n    capturePrototypeMethod(\n      constructor,\n      propertyName\n    );\n\n  if (\n    method === null ||\n    !hasTrustedHostProbeCallableShape(\n      method,\n      propertyName,\n      expectedLength,\n      \`\${propertyName}(\`\n    )\n  ) {\n    globalHostBrandAuthorityAvailable = false;\n    return {\n      constructor,\n      method: null\n    };\n  }\n\n  return {\n    constructor,\n    method\n  };\n}\n\nfunction captureIntlConstructor(`;

if (!core.includes(oldCaptureBlock)) {
  throw new Error("global capture block not found");
}
core = core.replace(oldCaptureBlock, newCaptureBlock);

const oldGetterMap = `const unsupportedHostBrandGetters =\n  objectFreeze(\n    HOST_BRAND_GETTER_SPECS\n      .map(\n        ([constructorName, propertyName]) =>\n          capturePrototypeGetter(\n            captureGlobalConstructor(\n              constructorName\n            ),\n            propertyName\n          )\n      )\n      .filter(\n        (getter) =>\n          getter !== null\n      )\n  );`;

const newGetterMap = `const unsupportedHostBrandGetters =\n  objectFreeze(\n    HOST_BRAND_GETTER_SPECS\n      .map(\n        ([constructorName, propertyName]) =>\n          captureGlobalHostBrandGetter(\n            constructorName,\n            propertyName\n          )\n      )\n      .filter(\n        (getter) =>\n          getter !== null\n      )\n  );`;

if (!core.includes(oldGetterMap)) {
  throw new Error("host getter map not found");
}
core = core.replace(oldGetterMap, newGetterMap);

const oldMethods = `const headersConstructor =\n  captureGlobalConstructor("Headers");\n\nconst formDataConstructor =\n  captureGlobalConstructor("FormData");\n\nconst headersBrandMethod =\n  capturePrototypeMethod(\n    headersConstructor,\n    "get"\n  );\n\nconst formDataBrandMethod =\n  capturePrototypeMethod(\n    formDataConstructor,\n    "get"\n  );\n\nconst additionalHostBrandMethodAuthorityAvailable =\n  (\n    headersConstructor === null ||\n    headersBrandMethod !== null\n  ) &&\n  (\n    formDataConstructor === null ||\n    formDataBrandMethod !== null\n  );`;

const newMethods = `const headersBrandProbe =\n  captureGlobalHostBrandMethod(\n    "Headers",\n    "get",\n    1\n  );\n\nconst formDataBrandProbe =\n  captureGlobalHostBrandMethod(\n    "FormData",\n    "get",\n    1\n  );\n\nconst headersConstructor =\n  headersBrandProbe.constructor;\n\nconst formDataConstructor =\n  formDataBrandProbe.constructor;\n\nconst headersBrandMethod =\n  headersBrandProbe.method;\n\nconst formDataBrandMethod =\n  formDataBrandProbe.method;\n\nconst additionalHostBrandMethodAuthorityAvailable =\n  (\n    headersConstructor === null ||\n    headersBrandMethod !== null\n  ) &&\n  (\n    formDataConstructor === null ||\n    formDataBrandMethod !== null\n  );`;

if (!core.includes(oldMethods)) {
  throw new Error("Headers/FormData capture block not found");
}
core = core.replace(oldMethods, newMethods);

const oldWeakRef = `const weakRefDeref =\n  capturePrototypeMethod(\n    captureGlobalConstructor(\n      "WeakRef"\n    ),\n    "deref"\n  );\n\nconst finalizationRegistryUnregister =\n  capturePrototypeMethod(\n    captureGlobalConstructor(\n      "FinalizationRegistry"\n    ),\n    "unregister"\n  );`;

const newWeakRef = `const weakRefBrandProbe =\n  captureGlobalHostBrandMethod(\n    "WeakRef",\n    "deref",\n    0\n  );\n\nconst weakRefDeref =\n  weakRefBrandProbe.method;\n\nconst finalizationRegistryBrandProbe =\n  captureGlobalHostBrandMethod(\n    "FinalizationRegistry",\n    "unregister",\n    1\n  );\n\nconst finalizationRegistryUnregister =\n  finalizationRegistryBrandProbe.method;`;

if (!core.includes(oldWeakRef)) {
  throw new Error("WeakRef/FinalizationRegistry block not found");
}
core = core.replace(oldWeakRef, newWeakRef);

const extraTests = `\n\ntest("bound host constructor without usable probe fails closed", () => {\n  runIsolated(\`\n    "use strict";\n    const assert = require("node:assert/strict");\n\n    const OriginalURL = globalThis.URL;\n    if (typeof OriginalURL !== "function") process.exit(0);\n\n    const saved = new OriginalURL("https://example.com/");\n    saved.foo = "bar";\n    Object.setPrototypeOf(saved, Object.prototype);\n\n    globalThis.URL = OriginalURL.bind(null);\n    globalThis.structuredClone = undefined;\n\n    const { cloneAiData } = require(\${JSON.stringify(aiDataPath)});\n    assert.throws(() => cloneAiData(saved));\n  \`);\n});\n\ntest("proxy-backed Headers brand method is rejected without executing traps", () => {\n  runIsolated(\`\n    "use strict";\n    const assert = require("node:assert/strict");\n\n    const Constructor = globalThis.Headers;\n    if (typeof Constructor !== "function") process.exit(0);\n\n    const saved = new Constructor();\n    saved.foo = "bar";\n    Object.setPrototypeOf(saved, Object.prototype);\n\n    const originalGet = Constructor.prototype.get;\n    let trapCalls = 0;\n    Constructor.prototype.get = new Proxy(originalGet, {\n      apply() {\n        trapCalls += 1;\n        throw new Error("poisoned Headers.get executed");\n      }\n    });\n    globalThis.structuredClone = undefined;\n\n    const { cloneAiData } = require(\${JSON.stringify(aiDataPath)});\n    assert.throws(() => cloneAiData(saved));\n    assert.equal(trapCalls, 0);\n  \`);\n});\n\ntest("ordinary throwing Headers brand method is rejected before execution", () => {\n  runIsolated(\`\n    "use strict";\n    const assert = require("node:assert/strict");\n\n    const Constructor = globalThis.Headers;\n    if (typeof Constructor !== "function") process.exit(0);\n\n    const saved = new Constructor();\n    saved.foo = "bar";\n    Object.setPrototypeOf(saved, Object.prototype);\n\n    let calls = 0;\n    Constructor.prototype.get = function get() {\n      calls += 1;\n      throw new Error("poisoned Headers.get executed");\n    };\n    globalThis.structuredClone = undefined;\n\n    const { cloneAiData } = require(\${JSON.stringify(aiDataPath)});\n    assert.throws(() => cloneAiData(saved));\n    assert.equal(calls, 0);\n  \`);\n});\n`;

if (tests.includes('bound host constructor without usable probe fails closed')) {
  throw new Error("review3 tests already present");
}
tests += extraTests;

fs.writeFileSync(corePath, core);
fs.writeFileSync(testPath, tests);
