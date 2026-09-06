from pathlib import Path

path = Path("src/contract-experiment.js")
text = path.read_text()
old = '''  if (isArray) {
    descriptors =
      validateExactArraySurface(value);
  } else {
    descriptors =
      validateExactRecordSurface(value);
  }
'''
new = '''  if (isArray) {
    descriptors =
      validateExactArraySurface(value);
  } else {
    // M11's structured provider boundary deliberately detaches records onto a
    // null prototype. Those records are still validated data, and wire-value
    // capture must be able to canonicalize them into ordinary replay records.
    // Keep schema/contract record validation strict elsewhere; this allowance
    // is only for JSON-compatible wire values traversed by cloneWireValue().
    const prototype =
      getPrototypeOf(value);

    if (
      (
        prototype !== objectPrototype &&
        prototype !== null
      ) ||
      isExtensible(value) !== true
    ) {
      throw new Error("invalid-wire-record-surface");
    }

    if (isForbiddenBrand(value)) {
      throw new Error("invalid-wire-record-brand");
    }

    descriptors =
      getOwnPropertyDescriptors(value);
  }
'''
if old in text:
    path.write_text(text.replace(old, new, 1))
elif new in text:
    pass
else:
    raise SystemExit("target contract-experiment seam not found")
