from pathlib import Path

path = Path("README.md")
text = path.read_text()

replacements = [
    (
        "- generate a structured Quality Contract for human confirmation\n- attack an evaluator with meaningful mutations",
        "- generate a structured Quality Contract for human confirmation\n- generate attacks from confirmed Quality Contracts through an injected AI generator\n- attack an evaluator with meaningful mutations",
    ),
    (
        "The deterministic attack flow is:\n",
        "The deterministic Mutation Pack attack flow is:\n",
    ),
    (
        "The generator proposes declarative mutated outputs; it does **not** provide executable mutation code. Confirmed rule severity remains authoritative and is not delegated back to the generator.\n\n## Bring your own business idea",
        "The generator proposes declarative mutated outputs; it does **not** provide executable mutation code. Confirmed rule severity remains authoritative and is not delegated back to the generator.\n\nA contract-attack survivor means an **AI-proposed rule violation passed the evaluator**. For arbitrary natural-language rules, Gotcha does not independently prove that the candidate semantically violates the referenced rule or that a production model produced the same failure.\n\n`runContractAttacks()` ends at ranked survivors and `topFinding` (`GOTCHA`). It does not automatically create a protection or run `CATCH THIS → RE-ATTACK`; those stages belong to the separate deterministic Mutation Pack improvement path.\n\nIf you cloned the repository, run the deterministic end-to-end example with:\n\n```bash\nnode examples/contract-attacks.js\n```\n\nThe repository command above is not a package-level executable. Installed consumers call the public `runContractAttacks()` API directly.\n\n## Bring your own business idea",
    ),
    (
        "Quality Contract example:\n\n```bash\nnode examples/quality-contract.js\n```\n\nStructured-data portability example:",
        "Quality Contract example:\n\n```bash\nnode examples/quality-contract.js\n```\n\nContract Attack example:\n\n```bash\nnode examples/contract-attacks.js\n```\n\nStructured-data portability example:",
    ),
    (
        "## Current architecture\n\nGotcha currently has two complementary layers.\n\n### Quality definition\n\n```text\nTEACH\n  ↓\nCONTRACT\n  ↓\nCONFIRM\n```\n\nThis layer turns human teaching evidence into an explicitly confirmed Quality Contract.\n\n### Quality attack\n\n```text\nATTACK\n  ↓\nRANK\n  ↓\nGOTCHA\n  ↓\nCATCH THIS\n  ↓\nRE-ATTACK\n```\n\nThis layer attacks the current definition of quality and looks for meaningful failures that still escape.\n\n`runContractAttacks()` now connects a confirmed Quality Contract to provider-independent AI-assisted attack generation, while the deterministic engine remains responsible for executing and ranking the attacks.\n\n## Current scope",
        "## Current architecture\n\nGotcha currently has complementary quality-definition and attack paths.\n\n### Quality definition\n\n```text\nTEACH\n  ↓\nCONTRACT\n  ↓\nCONFIRM\n```\n\nThis layer turns human teaching evidence into an explicitly confirmed Quality Contract.\n\n### Confirmed-contract attack path\n\n```text\nATTACK\n  ↓\nRANK\n  ↓\nGOTCHA\n```\n\nConfirmed Quality Contracts can drive provider-independent AI-assisted attack generation through `runContractAttacks()`. This path stops at ranked survivors and `topFinding`.\n\n### Deterministic Mutation Pack improvement path\n\n```text\nGOTCHA\n  ↓\nCATCH THIS\n  ↓\nRE-ATTACK\n```\n\nThe separate Mutation Pack path can continue from a finding into deterministic protection and remediation verification. An automatic bridge from `runContractAttacks()` into those stages is not implemented.\n\n## Current scope",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one README match, found {count}: {old[:80]!r}")
    text = text.replace(old, new, 1)

path.write_text(text)
print("Applied focused M9 README rebuild patch.")
