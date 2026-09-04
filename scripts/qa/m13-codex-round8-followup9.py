from pathlib import Path

path = Path("src/contract-attacks-core.js")
text = path.read_text()

old = '''"use strict";

const {
  types: utilTypes
} = require("node:util");
const {
  Buffer: BufferConstructor
} = require("node:buffer");
const {
  runInNewContext
} = require("node:vm");
const runtimeAuthority = require("./runtime-authority");
'''
new = '''"use strict";

// Capture Gotcha's frozen runtime authority before this legacy M8 core loads
// VM or other builtin helpers. Preloading the core must not make authority
// bootstrap observe VM as already loaded and fail closed before the package
// root has a chance to bind all consumers to the same generation.
const runtimeAuthority = require("./runtime-authority");
const {
  types: utilTypes
} = require("node:util");
const {
  Buffer: BufferConstructor
} = require("node:buffer");
const {
  runInNewContext
} = require("node:vm");
'''
if old not in text:
    raise SystemExit("missing contract-attacks-core bootstrap order")
text = text.replace(old, new, 1)
path.write_text(text)
print("Captured runtime authority before M8 core builtin bootstrap.")
