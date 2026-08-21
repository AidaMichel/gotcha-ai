from pathlib import Path
import runpy

runpy.run_path(
    ".github/scripts/m8-final-patch.py",
    run_name="__main__",
)

path = Path("src/ai-data.js")
text = path.read_text()

old = '''function hasUncloneableZeroOwnKeyBrand(
  value
) {
  if (structuredCloneFunction === null) {
    return false;
  }

  let descriptors;

  try {
    descriptors =
      getOwnPropertyDescriptors(value);
  } catch {
    return false;
  }

  if (
    ownKeys(descriptors).length !== 0
  ) {
    return false;
  }

  try {
    reflectApply(
      structuredCloneFunction,
      globalThis,
      [value]
    );

    return false;
  } catch {
    return true;
  }
}
'''

new = '''function isStructuredCloneProbeSafe(
  value
) {
  const seen =
    new WeakSet();

  const stack = [value];

  while (stack.length > 0) {
    const current =
      stack.pop();

    if (
      current === null ||
      typeof current !== "object" ||
      seen.has(current)
    ) {
      continue;
    }

    if (utilTypes.isProxy(current)) {
      return false;
    }

    seen.add(current);

    let descriptors;

    try {
      descriptors =
        getOwnPropertyDescriptors(
          current
        );
    } catch {
      return false;
    }

    for (
      const key of ownKeys(descriptors)
    ) {
      if (typeof key === "symbol") {
        return false;
      }

      const descriptor =
        descriptors[key];

      if (
        "get" in descriptor ||
        "set" in descriptor
      ) {
        return false;
      }

      const child =
        descriptor.value;

      if (
        typeof child === "function" ||
        typeof child === "symbol"
      ) {
        return false;
      }

      if (
        child !== null &&
        typeof child === "object"
      ) {
        stack.push(child);
      }
    }
  }

  return true;
}

function hasUncloneableStructuredCloneBrand(
  value
) {
  if (
    structuredCloneFunction === null ||
    !isStructuredCloneProbeSafe(value)
  ) {
    return false;
  }

  try {
    reflectApply(
      structuredCloneFunction,
      globalThis,
      [value]
    );

    return false;
  } catch {
    return true;
  }
}
'''

if "function hasUncloneableStructuredCloneBrand" not in text:
    if old not in text:
        raise SystemExit(
            "structured-clone fallback marker missing"
        )
    text = text.replace(old, new, 1)

text = text.replace(
    "hasUncloneableZeroOwnKeyBrand(value)",
    "hasUncloneableStructuredCloneBrand(value)",
)

path.write_text(text)
print("M8 structured-clone host-brand fallback refined.")
