from pathlib import Path

path = Path("src/index.js")
text = path.read_text()

marker = 'require("./runtime-authority");\n\n'
if not text.startswith(marker):
    raise SystemExit("runtime authority must already be first in src/index.js")

prefix = '''"use strict";\n\nconst bootstrapNodeUtil = require("node:util");\nconst bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;\nconst bootstrapDefineProperty = Object.defineProperty;\nlet bootstrapInspectDescriptor = null;\nlet bootstrapInspectNeutralized = false;\n\ntry {\n  const descriptor = bootstrapGetOwnPropertyDescriptor(\n    bootstrapNodeUtil,\n    "inspect"\n  );\n\n  if (\n    descriptor !== undefined &&\n    ("get" in descriptor || "set" in descriptor) &&\n    descriptor.configurable === true\n  ) {\n    bootstrapInspectDescriptor = descriptor;\n    bootstrapDefineProperty(bootstrapNodeUtil, "inspect", {\n      value: function inspect() { return ""; },\n      writable: true,\n      enumerable: descriptor.enumerable,\n      configurable: true\n    });\n    bootstrapInspectNeutralized = true;\n  }\n} catch {\n  bootstrapInspectDescriptor = null;\n  bootstrapInspectNeutralized = false;\n}\n\ntry {\n'''

suffix = '''\n} finally {\n  if (bootstrapInspectNeutralized) {\n    bootstrapDefineProperty(\n      bootstrapNodeUtil,\n      "inspect",\n      bootstrapInspectDescriptor\n    );\n  }\n}\n'''

path.write_text(prefix + text + suffix)
print("package entrypoint now holds util.inspect guard across the full import graph")
