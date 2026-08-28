from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()
old = r'''function scheduleVerification(capture, resolve, reject) {
  const speciesContainer = {};
  defineProperty(speciesContainer, promiseSpecies, {
    value: PromiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  });

  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());
  defineProperty(kickoff, "constructor", {
    value: speciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });
  const verification = reflectApply(promiseThen, kickoff, [
    () => buildVerification(capture),
    () => { throw boundaryError(); }
  ]);
  deleteProperty(kickoff, "constructor");

  defineProperty(verification, "constructor", {
    value: speciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });
  reflectApply(promiseThen, verification, [
    (result) => settleArtifact(resolve, result),
    () => reject(boundaryError())
  ]);
  deleteProperty(verification, "constructor");
}'''
new = r'''function scheduleVerification(capture, resolve, reject) {
  const speciesContainer = {};
  defineProperty(speciesContainer, promiseSpecies, {
    value: PromiseConstructor,
    writable: false,
    enumerable: false,
    configurable: false
  });

  const kickoff = new PromiseConstructor((kickoffResolve) => kickoffResolve());
  defineProperty(kickoff, "constructor", {
    value: speciesContainer,
    writable: true,
    enumerable: false,
    configurable: true
  });

  reflectApply(promiseThen, kickoff, [
    () => {
      let verification;
      try {
        verification = buildVerification(capture);
        defineProperty(verification, "constructor", {
          value: speciesContainer,
          writable: true,
          enumerable: false,
          configurable: true
        });
        reflectApply(promiseThen, verification, [
          (result) => settleArtifact(resolve, result),
          () => reject(boundaryError())
        ]);
        deleteProperty(verification, "constructor");
      } catch {
        reject(boundaryError());
      }
    },
    () => reject(boundaryError())
  ]);

  deleteProperty(kickoff, "constructor");
}'''
if old not in text:
    raise SystemExit('scheduleVerification block not found')
path.write_text(text.replace(old, new, 1))
