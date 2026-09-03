from pathlib import Path

path = Path("src/runtime-authority.js")
text = path.read_text()

old = '''const nodeUtil = require("node:util");
const { Buffer: BufferConstructor } = require("node:buffer");
const { runInNewContext } = require("node:vm");

const bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const bootstrapDefineProperty = Object.defineProperty;
let bootstrapInspectDescriptor = null;
let bootstrapInspectNeutralized = false;
try {
  const descriptor = bootstrapGetOwnPropertyDescriptor(nodeUtil, "inspect");
  if (
    descriptor !== undefined &&
    ("get" in descriptor || "set" in descriptor) &&
    descriptor.configurable === true
  ) {
    bootstrapInspectDescriptor = descriptor;
    bootstrapDefineProperty(nodeUtil, "inspect", {
      value: function inspect() { return ""; },
      writable: true,
      enumerable: descriptor.enumerable,
      configurable: true
    });
    bootstrapInspectNeutralized = true;
  }
} catch {
  bootstrapInspectDescriptor = null;
  bootstrapInspectNeutralized = false;
}

'''
new = '''const nodeUtil = require("node:util");
const bootstrapGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const bootstrapDefineProperty = Object.defineProperty;
let bootstrapInspectDescriptor = null;
let bootstrapInspectNeutralized = false;
try {
  const descriptor = bootstrapGetOwnPropertyDescriptor(nodeUtil, "inspect");
  if (
    descriptor !== undefined &&
    ("get" in descriptor || "set" in descriptor) &&
    descriptor.configurable === true
  ) {
    bootstrapInspectDescriptor = descriptor;
    bootstrapDefineProperty(nodeUtil, "inspect", {
      value: function inspect() { return ""; },
      writable: true,
      enumerable: descriptor.enumerable,
      configurable: true
    });
    bootstrapInspectNeutralized = true;
  }
} catch {
  bootstrapInspectDescriptor = null;
  bootstrapInspectNeutralized = false;
}

const { Buffer: BufferConstructor } = require("node:buffer");
const { runInNewContext } = require("node:vm");

'''
if old not in text:
    raise SystemExit("round6 generated runtime-authority prefix marker missing")
text = text.replace(old, new, 1)
path.write_text(text)
print("round6 inspect guard now precedes node:vm bootstrap")
