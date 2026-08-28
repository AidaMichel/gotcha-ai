from pathlib import Path
p=Path('src/contract-remediation.js')
t=p.read_text()
t=t.replace('          () => reject(boundaryError())\n        ]);', '          (error) => reject(error)\n        ]);', 1)
p.write_text(t)
