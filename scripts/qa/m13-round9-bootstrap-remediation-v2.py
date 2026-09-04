from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


runtime_path = Path("src/runtime-authority.js")
runtime = runtime_path.read_text()

runtime = replace_once(
    runtime,
    '''function loadModuleUtilTypesAuthority() {\n  try {\n    return require("node:util/types");\n  } catch {}\n  try {\n    return require("util/types");\n  } catch {\n    return null;\n  }\n}\n''',
    '''function loadModuleUtilTypesAuthority() {\n  // `node:util/types` may be served through the mutable `node:util.types`\n  // export. Read that export descriptor-safely instead of triggering an\n  // accessor while establishing lazy provider/runtime authority.\n  let utilModule;\n  try {\n    utilModule = require("node:util");\n  } catch {\n    return null;\n  }\n  const authority = bootstrapOwnDataValue(utilModule, "types");\n  return authority !== null && typeof authority === "object"\n    ? authority\n    : null;\n}\n''',
    "descriptor-safe util types authority",
)

runtime = replace_once(
    runtime,
    '''        propertiesResult === null ||\n        typeof propertiesResult !== "object" ||\n        !Array.isArray(propertiesResult.internalProperties)\n      ) {\n''',
    '''        propertiesResult === null ||\n        typeof propertiesResult !== "object" ||\n        propertiesResult.internalProperties === null ||\n        typeof propertiesResult.internalProperties !== "object" ||\n        typeof propertiesResult.internalProperties.length !== "number"\n      ) {\n''',
    "avoid ambient Array.isArray in inspector",
)

runtime = replace_once(
    runtime,
    '''const consumerStringIncludes = hasFreshVmAuthority\n  ? runInNewContext("String.prototype.includes")\n  : captureLocalNativeDataFunction(\n      consumerStringPrototype,\n      "includes",\n      "function includes() { [native code] }"\n    );\n''',
    '''const capturedConsumerStringIncludes = hasFreshVmAuthority\n  ? runInNewContext("String.prototype.includes")\n  : captureLocalNativeDataFunction(\n      consumerStringPrototype,\n      "includes",\n      "function includes() { [native code] }"\n    );\n\nfunction localPrimitiveStringIncludes(search) {\n  const source = this;\n  if (typeof source !== "string" || typeof search !== "string") return false;\n  const sourceLength = source.length;\n  const searchLength = search.length;\n  if (searchLength === 0) return true;\n  if (searchLength > sourceLength) return false;\n  const lastStart = sourceLength - searchLength;\n  for (let start = 0; start <= lastStart; start += 1) {\n    let matched = true;\n    for (let offset = 0; offset < searchLength; offset += 1) {\n      if (source[start + offset] !== search[offset]) {\n        matched = false;\n        break;\n      }\n    }\n    if (matched) return true;\n  }\n  return false;\n}\n\nconst consumerStringIncludes =\n  typeof capturedConsumerStringIncludes === "function"\n    ? capturedConsumerStringIncludes\n    : localPrimitiveStringIncludes;\n''',
    "safe string includes fallback",
)

runtime_path.write_text(runtime)

provider_path = Path("src/provider-adapter-m13.js")
provider = provider_path.read_text()
provider = replace_once(
    provider,
    'reflectApply(isPromise, utilTypes, [transportResult])',
    'reflectApply(isPromise, undefined, [transportResult])',
    "provider promise receiver",
)
provider_path.write_text(provider)

print("Applied Round-9 bootstrap remediation refinements.")
