from pathlib import Path
import json

# package artifact
package_path = Path("package.json")
package = json.loads(package_path.read_text())
files = package["files"]
if "examples/contract-remediation.js" not in files:
    files.append("examples/contract-remediation.js")
package_path.write_text(json.dumps(package, indent=2) + "\n")

# README public surface + remediation flow
readme_path = Path("README.md")
readme = readme_path.read_text()
old_exports = '''const {\n  runGotcha,\n  draftQualityContract,\n  confirmQualityContract,\n  runContractAttacks\n} = require("gotcha-ai");'''
new_exports = '''const {\n  runGotcha,\n  draftQualityContract,\n  confirmQualityContract,\n  runContractAttacks,\n  draftContractProtection,\n  confirmContractProtection,\n  verifyContractProtection\n} = require("gotcha-ai");'''
if old_exports not in readme:
    raise SystemExit("README export block not found")
readme = readme.replace(old_exports, new_exports, 1)

old_stop = '''`runContractAttacks()` ends at ranked survivors and `topFinding` (`GOTCHA`). It does not automatically create a protection or run `CATCH THIS → RE-ATTACK`; those stages belong to the separate deterministic Mutation Pack improvement path.'''
new_stop = '''`runContractAttacks()` ends at ranked survivors and `topFinding` (`GOTCHA`). The M10 remediation APIs can then bind one replayable survivor to a declarative protection, require explicit human confirmation, and verify a caller-supplied improved evaluator against the exact bound experiment. Gotcha never generates executable evaluator code and never applies a draft automatically.'''
if old_stop not in readme:
    raise SystemExit("README contract-attack stop paragraph not found")
readme = readme.replace(old_stop, new_stop, 1)

anchor = '''The repository command above is not a package-level executable. Installed consumers call the public `runContractAttacks()` API directly.\n'''
section = '''\n## Remediate and verify a confirmed survivor\n\nM10 continues from a **replayable** `runContractAttacks()` experiment:\n\n```text\nGOTCHA\n  ↓\nDRAFT PROTECTION\n  ↓\nHUMAN CONFIRM\n  ↓\nVERIFY\n  ↓\nRE-ATTACK\n```\n\nThe protection proposal is declarative data. A human must explicitly accept or edit it before verification. The caller supplies both the historical evaluator and the improved evaluator; Gotcha verifies baseline identity first and only then runs the improved replay.\n\n```js\nconst draft = await draftContractProtection({\n  experiment: result.experiment,\n  sourceAttackId: result.topFinding.id,\n  proposal\n});\n\nconst protection = await confirmContractProtection({\n  draft,\n  decision: { type: "accept" }\n});\n\nconst verification = await verifyContractProtection({\n  protection,\n  evaluator: currentEvaluator,\n  improvedEvaluator\n});\n```\n\nA `verified` result means the selected source finding was caught in the exact replay with no newly surviving bound attack. It is evidence about the bound experiment, not a claim that all future failures are eliminated. Provider/model adapters remain outside the trusted remediation core.\n\nIf you cloned the repository, run the deterministic full remediation example with:\n\n```bash\nnode examples/contract-remediation.js\n```\n'''
if section.strip() not in readme:
    if anchor not in readme:
        raise SystemExit("README remediation insertion anchor not found")
    readme = readme.replace(anchor, anchor + section, 1)

old_arch = '''### Confirmed-contract attack path\n\n```text\nATTACK\n  ↓\nRANK\n  ↓\nGOTCHA\n```\n\nConfirmed Quality Contracts can drive provider-independent AI-assisted attack generation through `runContractAttacks()`. This path stops at ranked survivors and `topFinding`.\n\n### Deterministic Mutation Pack improvement path'''
new_arch = '''### Confirmed-contract attack and remediation path\n\n```text\nATTACK\n  ↓\nRANK\n  ↓\nGOTCHA\n  ↓\nDRAFT PROTECTION\n  ↓\nHUMAN CONFIRM\n  ↓\nVERIFY / RE-ATTACK\n```\n\nConfirmed Quality Contracts can drive provider-independent AI-assisted attack generation through `runContractAttacks()`. M10 can then bind a replayable survivor to human-authorized declarative protection data and verify a caller-supplied improved evaluator against that exact historical experiment.\n\n### Deterministic Mutation Pack improvement path'''
if old_arch not in readme:
    raise SystemExit("README architecture block not found")
readme = readme.replace(old_arch, new_arch, 1)

repo_anchor = '''Contract Attack example:\n\n```bash\nnode examples/contract-attacks.js\n```\n'''
repo_extra = '''\nContract Remediation example:\n\n```bash\nnode examples/contract-remediation.js\n```\n'''
if repo_extra.strip() not in readme:
    if repo_anchor not in readme:
        raise SystemExit("README repository example anchor not found")
    readme = readme.replace(repo_anchor, repo_anchor + repo_extra, 1)

readme_path.write_text(readme)

# public API regression
api_path = Path("test/public-api.test.js")
api = api_path.read_text()
api = api.replace(
'''  runGotcha,\n  runContractAttacks\n} = require("../src");''',
'''  runGotcha,\n  runContractAttacks,\n  draftContractProtection,\n  confirmContractProtection,\n  verifyContractProtection\n} = require("../src");''',
1
)
if 'public API exposes contract remediation and verification' not in api:
    api += r'''

test(
  "public API exposes contract remediation and verification",
  async () => {
    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved time.",
      rules: [{
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "major"
      }]
    };
    function evaluator(output) {
      return output.time !== "5 PM";
    }
    const attack = await runContractAttacks({
      contract,
      input: { request: "3 PM" },
      expectedOutput: { time: "3 PM" },
      evaluator,
      generator() {
        return {
          version: 1,
          task: contract.task,
          attacks: [{
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes time.",
            rationale: "Evaluator misses it.",
            mutatedOutput: { time: "4 PM" },
            scores: { realism: 0.9, subtlety: 0.9, novelty: 0.8, fixability: 1 }
          }]
        };
      }
    });
    assert.equal(attack.experiment.replayable, true);
    const draft = await draftContractProtection({
      experiment: attack.experiment,
      sourceAttackId: "wrong-time",
      proposal: {
        version: 1,
        task: contract.task,
        sourceAttackId: "wrong-time",
        ruleId: "time-rule",
        protection: {
          statement: "Require exactly 3 PM.",
          rationale: "The source finding changed time."
        }
      }
    });
    const protection = await confirmContractProtection({
      draft,
      decision: { type: "accept" }
    });
    const verification = await verifyContractProtection({
      protection,
      evaluator,
      improvedEvaluator(output) {
        return output.time === "3 PM";
      }
    });
    assert.equal(draft.status, "draft");
    assert.equal(protection.status, "confirmed");
    assert.equal(verification.state, "verified");
    assert.equal(verification.verificationPassed, true);
    assert.deepEqual(verification.eliminatedAttackIds, ["wrong-time"]);
  }
);
'''
api_path.write_text(api)

# packed artifact / isolated consumer proof
pack_test = Path("test/package-contract-remediation.test.js")
if not pack_test.exists():
    pack_test.write_text(r'''"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.join(__dirname, "..");

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function runNpm(args, options = {}) {
  if (process.env.npm_execpath) {
    return run(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  return run(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}

test("packed npm artifact exposes contract remediation to an external consumer", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gotcha-remediation-package-"));
  const packDir = path.join(temp, "pack");
  const consumer = path.join(temp, "consumer");
  fs.mkdirSync(packDir);
  fs.mkdirSync(consumer);
  try {
    const pack = runNpm(["pack", "--pack-destination", packDir], { cwd: repoRoot });
    assert.equal(pack.status, 0, pack.stderr);
    const tarball = fs.readdirSync(packDir).find((name) => name.endsWith(".tgz"));
    assert.ok(tarball);
    fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({
      name: "gotcha-remediation-consumer",
      version: "1.0.0",
      private: true,
      type: "commonjs"
    }));
    const install = runNpm(["install", "--ignore-scripts", path.join(packDir, tarball)], { cwd: consumer });
    assert.equal(install.status, 0, install.stderr);
    const example = path.join(consumer, "node_modules", "gotcha-ai", "examples", "contract-remediation.js");
    assert.ok(fs.existsSync(example), "remediation example missing from packed artifact");
    const exampleRun = run(process.execPath, [example], { cwd: consumer });
    assert.equal(exampleRun.status, 0, exampleRun.stderr);
    assert.equal(exampleRun.stdout, [
      "GOTCHA: wrong-time survived",
      "DRAFT: draft",
      "CONFIRM: confirmed",
      "VERIFY: verified",
      "RE-ATTACK: 0 survivors",
      ""
    ].join("\n"));

    const code = `
      const api = require("gotcha-ai");
      for (const name of [
        "draftContractProtection",
        "confirmContractProtection",
        "verifyContractProtection"
      ]) {
        if (typeof api[name] !== "function") throw new Error(name + " missing");
      }
      console.log("M10 public APIs available");
    `;
    const apiRun = run(process.execPath, ["-e", code], { cwd: consumer });
    assert.equal(apiRun.status, 0, apiRun.stderr);
    assert.equal(apiRun.stdout, "M10 public APIs available\n");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
''')
