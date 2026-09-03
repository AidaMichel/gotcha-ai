from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "test" / "contract-protection-proposal.test.js"
text = path.read_text()

old_fulfilled = '''  const trustedResult = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() { return trustedNonConfigurable; }
  });
  assert.equal(trustedResult.state, "proposal-ready");
'''
new_fulfilled = '''  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return trustedNonConfigurable; }
    }),
    TypeError
  );
'''
if old_fulfilled not in text:
    raise SystemExit("missing followup5 fulfilled unshieldable anchor")
text = text.replace(old_fulfilled, new_fulfilled, 1)

old_rejected = '''  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return rejectedTrusted; }
    }),
    (error) => error === rejectedReason
  );
'''
new_rejected = '''  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return rejectedTrusted; }
    }),
    TypeError
  );
'''
if old_rejected not in text:
    raise SystemExit("missing followup5 rejected unshieldable anchor")
text = text.replace(old_rejected, new_rejected, 1)

path.write_text(text)
print("round7 followup5 applied")
