from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()

# Guard Node's own lazy internal bootstrap from an accessor-backed util.inspect.
# If the accessor is configurable, replace it with an inert local data function
# only while pristine VM intrinsics are captured, then restore the exact original
# descriptor before Gotcha authenticates inspect authority. The accessor is never
# invoked by this path.
marker = '''const { runInNewContext } = require("node:vm");\n\n'''
insert = marker + '''const bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\nconst bootstrapDefineProperty = Object.defineProperty;\nlet bootstrapInspectDescriptor = null;\nlet bootstrapInspectNeutralized = false;\ntry {\n  const descriptor = bootstrapGetOwnPropertyDescriptor(nodeUtil, "inspect");\n  if (\n    descriptor !== undefined &&\n    ("get" in descriptor || "set" in descriptor) &&\n    descriptor.configurable === true\n  ) {\n    bootstrapInspectDescriptor = descriptor;\n    bootstrapDefineProperty(nodeUtil, "inspect", {\n      value: function inspect() { return ""; },\n      writable: true,\n      enumerable: descriptor.enumerable,\n      configurable: true\n    });\n    bootstrapInspectNeutralized = true;\n  }\n} catch {\n  bootstrapInspectDescriptor = null;\n  bootstrapInspectNeutralized = false;\n}\n\n'''
if marker not in text:
    raise SystemExit("runtime-authority vm import marker missing")
text = text.replace(marker, insert, 1)

# The Round-6 primary patch puts every runInNewContext capture before the local
# Function prototype anchor. Restore the caller's exact inspect descriptor here,
# before the descriptor-based authority check runs.
marker = '''const localFunctionPrototype = pristineReflectApply(\n'''
restore = '''if (bootstrapInspectNeutralized) {\n  try {\n    bootstrapDefineProperty(\n      nodeUtil,\n      "inspect",\n      bootstrapInspectDescriptor\n    );\n  } catch {\n    // If restoration itself is blocked, inspect authority below remains\n    // unavailable and the public surface fails closed.\n  }\n}\n\n''' + marker
if marker not in text:
    raise SystemExit("runtime-authority local Function anchor missing")
text = text.replace(marker, restore, 1)
path.write_text(text)

# Strengthen the inspect regression back to the package entrypoint now that the
# production bootstrap neutralizes Node's own lazy internal read as well.
path = Path("test/m13-review-remediation.test.js")
text = path.read_text()
start = text.index('test("round6 util.inspect accessor is never invoked during package bootstrap"')
end = text.index('\ntest("round6 Buffer.isBuffer accessor', start)
block = text[start:end]
block = block.replace(
    'const modulePath = path.join(repoRoot, "src", "runtime-authority.js");',
    'const modulePath = path.join(repoRoot, "src", "index.js");',
    1
)
path.write_text(text[:start] + block + text[end:])

print("round6 inspect bootstrap neutralization applied")
