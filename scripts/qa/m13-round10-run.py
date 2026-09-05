#!/usr/bin/env python3
from pathlib import Path
import subprocess
import sys

path = Path("scripts/qa/m13-round10-remediation.py")
text = path.read_text()
old = '''    ''' + "'''" + '''  if (\n    !promiseAuthorityAvailable ||\n    !legacyTypeErrorAuthorityAvailable\n  ) {\n    return null;\n  }\n\n  try {\n''' + "'''" + ''',
'''
new = '''    ''' + "'''" + '''  if (!promiseAuthorityAvailable || !legacyTypeErrorAuthorityAvailable) {\n    return null;\n  }\n\n  try {\n''' + "'''" + ''',
'''
if old not in text:
    raise SystemExit("Round10 provider script anchor source changed")
path.write_text(text.replace(old, new, 1))
result = subprocess.run([sys.executable, str(path)])
raise SystemExit(result.returncode)
