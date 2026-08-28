from pathlib import Path

path = Path('src/contract-remediation.js')
text = path.read_text()
old = r'''        generator() {
          return makeRecord([
            ["version", 1],
            ["task", experiment.task],
            ["attacks", projectedAttacks]
          ]);
        }'''
new = r'''        generator() {
          const payload = makeRecord([
            ["version", 1],
            ["task", experiment.task],
            ["attacks", projectedAttacks]
          ]);
          return new PromiseConstructor((generatorResolve) => {
            settleArtifact(generatorResolve, payload);
          });
        }'''
if old not in text:
    raise SystemExit('replay generator block not found')
path.write_text(text.replace(old, new, 1))
