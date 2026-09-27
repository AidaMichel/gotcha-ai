# Contributing to Gotcha

Gotcha is built around one product question:

> What important failure can still pass the checks we wrote?

Contributions are welcome when they make that loop more reliable, easier to understand, or easier to use.

## Before opening a pull request

1. Keep business/domain meaning outside the core engine unless the change is genuinely generic.
2. Preserve explicit human authority. Do not silently choose findings, accept proposals, or apply evaluator changes.
3. Preserve fail-closed behavior at trust boundaries.
4. Add or update tests for behavior changes.
5. Run:

```bash
npm ci
npm test
npm pack
```

## Good contribution areas

- clearer first-run and CLI UX
- additional deterministic examples
- provider integration examples that keep credentials caller-owned
- regression tests for evaluator blind spots
- portability and packaging fixes
- documentation that makes the core Gotcha moment easier to understand

## Pull request expectations

A PR should explain:

- the problem
- why it belongs in Gotcha
- what changed
- how it was tested
- whether any authority or trust boundary changed

Avoid bundling unrelated refactors into behavior changes.

## Bug reports

Please include the smallest reproducible case you can, the Node.js version, the Gotcha version or commit SHA, and the expected versus actual result.
