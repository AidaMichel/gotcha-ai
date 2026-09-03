from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing {label} marker in {path}")
    p.write_text(text.replace(old, new, 1))


# M10 remediation must remain loadable when shared Array authority is absent.
replace_once(
    "src/contract-remediation.js",
    'if (!arrayIsArray(forbiddenProbes)) {\n',
    'if (\n  typeof arrayIsArray !== "function" ||\n  !arrayIsArray(forbiddenProbes)\n) {\n',
    "contract-remediation Array fail-closed"
)


# M12 should consume the same shared Array/Promise authority rather than
# creating another partially authenticated seam.
path = Path("src/contract-quality-loop.js")
text = path.read_text()
text = text.replace(
    'const arrayIsArray = Array.isArray;',
    'const arrayIsArray = runtimeAuthority.arrayIsArray;',
    1
)
start = text.index('const ObjectPrototype = Object.prototype;')
end_marker = 'const PromiseSpecies = Symbol.species;\n'
end = text.index(end_marker, start) + len(end_marker)
replacement = '''const ObjectPrototype = Object.prototype;\nconst PromisePrototype = runtimeAuthority.promisePrototype;\nconst PromiseConstructor =\n  runtimeAuthority.promiseAuthorityAvailable === true\n    ? runtimeAuthority.promiseConstructor\n    : null;\nconst PromiseThen =\n  runtimeAuthority.promiseAuthorityAvailable === true\n    ? runtimeAuthority.promiseThen\n    : null;\nconst PromiseSpecies = runtimeAuthority.promiseSpecies;\n'''
text = text[:start] + replacement + text[end:]
old = '''for (let index = 0; index < requiredFunctions.length; index += 1) {\n  if (typeof requiredFunctions[index] !== "function") {\n    authorityAvailable = false;\n    break;\n  }\n}\n\n'''
new = old + '''if (\n  runtimeAuthority.promiseAuthorityAvailable !== true ||\n  typeof PromiseConstructor !== "function" ||\n  typeof PromiseThen !== "function" ||\n  !runtimeAuthority.hasTrustedLocalPromiseSpecies(\n    PromiseConstructor,\n    PromiseSpecies\n  )\n) {\n  authorityAvailable = false;\n}\n\n'''
if old not in text:
    raise SystemExit("missing M12 authority loop marker")
text = text.replace(old, new, 1)
path.write_text(text)


# Mutation Pack: when the rejected Promise itself cannot be shadowed, inspect
# the effective inherited constructor without invoking Proxy traps. If that
# constructor is unsafe but its custom-prototype descriptor is configurable,
# temporarily replace that descriptor with the safe species container, attach
# the rejection observer, and restore it synchronously.
path = Path("src/mutation-pack.js")
text = path.read_text()
start = text.index('function unshadowablePromiseUsesSafeDefaultSpecies(')
end = text.index('function consumeNativePromiseRejection(', start)
replacement = r'''function withSafeInheritedPromiseConstructor(
  value,
  callback
) {
  let prototype = getPrototypeOf(value);
  while (prototype !== null) {
    if (runtimeAuthority.isProxy(prototype)) return false;
    const descriptor = Reflect.apply(
      getOwnPropertyDescriptor,
      Object,
      [prototype, "constructor"]
    );
    if (descriptor === undefined) {
      prototype = getPrototypeOf(prototype);
      continue;
    }
    if ("get" in descriptor || "set" in descriptor) return false;
    if (constructorUsesSafeDefaultSpecies(descriptor.value)) {
      callback();
      return true;
    }
    if (descriptor.configurable !== true) return false;
    Reflect.apply(
      defineProperty,
      Object,
      [
        prototype,
        "constructor",
        {
          value: safePromiseSpecies,
          writable: true,
          enumerable: descriptor.enumerable,
          configurable: true
        }
      ]
    );
    try {
      callback();
      return true;
    } finally {
      Reflect.apply(
        defineProperty,
        Object,
        [prototype, "constructor", descriptor]
      );
    }
  }
  callback();
  return true;
}

'''
text = text[:start] + replacement + text[end:]
old = '''    } else if (!unshadowablePromiseUsesSafeDefaultSpecies(\n      value,\n      originalConstructor\n    )) {\n      return false;\n    }\n\n    Reflect.apply(\n      promiseThen,\n      value,\n      [\n        undefined,\n        () => {}\n      ]\n    );\n    return true;\n'''
new = '''    } else {\n      return withSafeInheritedPromiseConstructor(\n        value,\n        () => Reflect.apply(\n          promiseThen,\n          value,\n          [\n            undefined,\n            () => {}\n          ]\n        )\n      );\n    }\n\n    Reflect.apply(\n      promiseThen,\n      value,\n      [\n        undefined,\n        () => {}\n      ]\n    );\n    return true;\n'''
if old not in text:
    raise SystemExit("missing Mutation Pack unshadowable consume marker")
text = text.replace(old, new, 1)
path.write_text(text)


# ---------------------------------------------------------------------------
# Correct/strengthen the generated regressions without weakening their intent.
# ---------------------------------------------------------------------------
path = Path("test/m13-review-remediation.test.js")
text = path.read_text()

# The Codex finding is specifically runtime-authority's bootstrap read. Loading
# all of src/index after poisoning util.inspect can legitimately make Node's own
# lazily-loaded perf internals read util.inspect first, which is outside Gotcha.
block_start = text.index('test("round6 util.inspect accessor is never invoked during package bootstrap"')
block_end = text.index('\ntest("round6 Buffer.isBuffer accessor', block_start)
block = text[block_start:block_end]
block = block.replace(
    'const modulePath = path.join(repoRoot, "src", "index.js");',
    'const modulePath = path.join(repoRoot, "src", "runtime-authority.js");',
    1
)
block = block.replace(
    '    const util = require("node:util");\n',
    '    const util = require("node:util");\n    require("node:buffer");\n    require("node:vm");\n',
    1
)
text = text[:block_start] + block + text[block_end:]

# Isolate the M8 authority regression from unrelated package modules and print
# differentiated evidence on failure.
block_start = text.index('test("round6 M8 rejects poisoned Promise constructor and then before callbacks"')
block_end = text.index('\ntest("round6 consumes non-configurable undefined-constructor', block_start)
block = text[block_start:block_end]
block = block.replace(
    'const modulePath = path.join(repoRoot, "src", "index.js");',
    'const modulePath = path.join(repoRoot, "src", "contract-attacks-core.js");',
    1
)
block = block.replace(
    '      if (callbackCalls !== 0 || poisonCalls !== 0) process.exitCode = 98;',
    '      if (callbackCalls !== 0 || poisonCalls !== 0) { console.error(JSON.stringify({ callbackCalls, poisonCalls })); process.exitCode = 98; }',
    1
)
text = text[:block_start] + block + text[block_end:]

# Mutation error wording is intentionally implementation-level; assert the
# semantic unsupported-async boundary and require that the original rejection
# was actually consumed without a species trap.
block_start = text.index('test("round6 Mutation Pack never executes inherited Proxy species traps"')
block_end = text.index('\ntest("round6 poisoned Promise species', block_start)
block = text[block_start:block_end]
block = block.replace(
    '/Async mutations are not supported|runtime authority is unavailable/i',
    '/Async mutation(?:s| functions) are not supported|runtime authority is unavailable/i',
    1
)
block = block.replace(
    '  // This hostile unshadowable Promise cannot be safely observed; the important\n  // boundary is that Gotcha does not execute its constructor/species trap.\n  void unhandled;',
    '  assert.equal(unhandled, null);',
    1
)
text = text[:block_start] + block + text[block_end:]

# Replace the nested generated provider request with an equivalent valid request
# whose instruction text uses Array.join(String.fromCharCode(10)); this avoids
# an accidental newline escape becoming invalid JavaScript in the subprocess.
block_start = text.index('test("round6 poisoned Promise species fails closed before M13 generator or transport"')
block = text[block_start:]
request_start = block.index('      p2 = adapter({')
request_end = block.index('      });', request_start) + len('      });')
valid_request = '''      p2 = adapter({\n        task: "Return the approved time.",\n        case: { input: {}, expectedOutput: {} },\n        source: { attackId: "wrong-time", ruleId: "time-rule" },\n        rule: {\n          id: "time-rule",\n          statement: "Time must be 3 PM.",\n          kind: "required",\n          severity: "major"\n        },\n        attack: {\n          id: "wrong-time",\n          ruleId: "time-rule",\n          type: "wrong-time",\n          description: "Changes the approved time.",\n          rationale: "Violates the confirmed rule.",\n          output: {}\n        },\n        instructions: [\n          "Propose one specific, testable declarative quality protection for the selected surviving attack.",\n          "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.",\n          "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.",\n          "The protection statement must describe what the quality system should enforce.",\n          "The rationale must explain why this protection addresses the selected survivor."\n        ].join(String.fromCharCode(10))\n      });'''
block = block[:request_start] + valid_request + block[request_end:]
text = text[:block_start] + block

path.write_text(text)
print("round6 second-pass source and regression fixes applied")
