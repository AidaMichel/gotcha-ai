from pathlib import Path

source_path = Path("src/contract-experiment.js")
text = source_path.read_text()
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
    source_path.write_text(text.replace(old, new, 1))
elif new not in text:
    raise SystemExit("target contract-experiment seam not found")

readme_path = Path("README.md")
readme = readme_path.read_text()
heading = "## Guided V0: find, protect, and verify in five minutes"
anchor = "**Gotcha.**\n\n## The problem"
section = r'''**Gotcha.**

## Guided V0: find, protect, and verify in five minutes

The installed CLI can now guide the public Gotcha APIs without making hidden product decisions for you.

Start a project:

```bash
npx gotcha-ai init
```

That creates `gotcha.config.js` and `.gotcha/.gitignore`. Fill in the starter config with your task, teaching examples, one known-good case, your **current baseline evaluator**, and your provider transport/model. The starter intentionally does not create an `improvedEvaluator` for you.

Run the guided discovery flow:

```bash
npx gotcha-ai run
```

`run` uses your provider through Gotcha's three structured modes to draft the Quality Contract, generate contract attacks, and generate one protection proposal for the survivor **you explicitly select**. Proposed rules require explicit `accept`, `edit`, or `reject` decisions. Survivor selection has no default; blank or invalid input does not silently choose the first finding.

If a protection proposal is produced, Gotcha saves one local session under `.gotcha/` by default and prints the exact resume path. The session contains local evaluation evidence and may be sensitive project data. Treat it as **untrusted mutable storage**: being written by Gotcha or living under `.gotcha/` does not make it semantic authority.

Apply your human-approved evaluator change yourself. Keep the original baseline evaluator available and add the stronger behavior separately as `improvedEvaluator`; Gotcha does not generate executable evaluator code or apply a patch automatically.

Then resume verification with the path printed by `run`:

```bash
npx gotcha-ai verify .gotcha/session-<id>.json
```

`verify` loads the current config, re-prepares the protection through the existing M12/M10 validation path, shows the **fresh current draft**, and requires another explicit `accept`, `edit`, or `reject` decision. It then replays the historical evaluator first and only runs `improvedEvaluator` if the baseline still matches the bound experiment.

Verification does **not** construct or call a model/provider. A verify-only config needs only:

```js
module.exports = {
  evaluator,
  improvedEvaluator
};
```

A `verified` result means the selected bound finding is caught in that exact replay with no newly surviving bound attack. States such as `baseline-mismatch`, `regression-detected`, or `source-finding-still-survives` remain explicit results rather than being collapsed into a generic success message.

## The problem'''
if heading not in readme:
    if anchor not in readme:
        raise SystemExit("README insertion anchor not found")
    readme_path.write_text(readme.replace(anchor, section, 1))
