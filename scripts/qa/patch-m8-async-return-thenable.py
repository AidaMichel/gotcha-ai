from pathlib import Path

path = Path('src/contract-attacks-core.js')
text = path.read_text()
anchor = r'''function passPromiseValue(
  value
) {
  return value;
}
'''
insert = r'''function prepareAsyncRecordReturn(value) {
  defineProperty(value, "then", {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: true
  });

  const cleanup = new promiseConstructor((resolve) => resolve());
  reflectApply(promiseThen, cleanup, [
    () => {
      deleteProperty(value, "then");
    }
  ]);

  return value;
}

'''
if anchor not in text:
    raise SystemExit('passPromiseValue anchor not found')
text = text.replace(anchor, insert + anchor, 1)
old = r'''  return {
    version: 1,
    task:
      contract.task,
    baselinePassed:
      true,
    generatedAttacks,
    discardedAttacks:
      filtered.discarded,
    attack:
      attackResult,
    topFinding
  };'''
new = r'''  return prepareAsyncRecordReturn({
    version: 1,
    task:
      contract.task,
    baselinePassed:
      true,
    generatedAttacks,
    discardedAttacks:
      filtered.discarded,
    attack:
      attackResult,
    topFinding
  });'''
if old not in text:
    raise SystemExit('runContractAttacks return block not found')
path.write_text(text.replace(old, new, 1))
