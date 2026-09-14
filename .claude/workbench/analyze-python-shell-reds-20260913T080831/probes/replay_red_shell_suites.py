#!/usr/bin/env python3
"""Reejecuta las suites shell rojas del run T-10 y conserva su primera causa."""
from __future__ import annotations

import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[4]
LOG = ROOT / '.claude/jobs/suite-full-t10-20260913T075149/outputs/salida.log'
OUTPUT = Path(__file__).resolve().parents[1] / 'outputs/shell-replay.txt'
SUITE = re.compile(r'^-- ROJO (tests/.+\.sh)$', re.MULTILINE)

env = os.environ.copy()
env.update({
    'THYROX_ROOT': str(ROOT),
    'THYROX_REACH_ROOT': str(ROOT.parent),
    'THYROX_REACH_ROOTS': 'api,ui,db,server,docs,thyrox',
    'THYROX_CLONE_PREFIX': 'kaupamex-',
    'THYROX_WORKBENCH_DIR': str(ROOT / '.claude/workbench'),
    'THYROX_JOBS_DIR': str(ROOT / '.claude/jobs'),
})

sections: list[str] = []
for suite in SUITE.findall(LOG.read_text(errors='replace')):
    result = subprocess.run(
        ['bash', suite], cwd=ROOT, env=env, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    lines = result.stdout.splitlines()
    sections.append(f'=== {suite} :: exit {result.returncode} ===')
    sections.extend(lines[-20:] if lines else ['<sin salida>'])
    sections.append('')
OUTPUT.write_text('\n'.join(sections))
print(f'{len(sections)} lineas escritas en {OUTPUT}')
