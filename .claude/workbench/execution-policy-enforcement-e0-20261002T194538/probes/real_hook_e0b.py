"""Hook real tras publicar E0: una invocación nueva de bin/tool_use_preflight por caso.

Sin THYROX_EXECUTION_POLICY: rige la política versionada del árbol. Cada caso
imprime la decisión que el hook devuelve (deny, o sin decisión).

*Métrica:* el campo de decisión de la salida del hook por caso.
*Ciega a:* lo que el cliente hace con esa decisión; eso lo mide la sesión.
"""
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone

ROOT = "/home/user/thyrox"
HOOK = f"{ROOT}/bin/tool_use_preflight"


def bash(command: str, background: bool = False) -> dict:
    return {"tool_name": "Bash", "tool_input": {"command": command, "run_in_background": background}, "cwd": ROOT}


CASES = [
    ("Agent Explore", {"tool_name": "Agent", "tool_input": {"subagent_type": "Explore", "prompt": "busca", "description": "x"}, "cwd": ROOT}),
    ("suite en primer plano", bash("bash tests/session/test-model-coordinator-entry.sh")),
    ("cualificación en primer plano", bash("bash bin/local-models-qualify m --context 8192")),
    ("payload en segundo plano", bash("bash tests/session/test-x.sh run", background=True)),
    ("heredoc de datos en un commit", bash("git commit -q -F - -- x <<'MSG'\nlocal-models-qualify ran\nMSG")),
    ("heredoc que lee bash", bash("bash <<'RUN'\nbash bin/local-models-qualify m\nRUN")),
    ("separador en comilla de datos", bash("printf '%s' 'x; bash tests/session/test-x.sh run' > .thyrox/runtime/m.txt")),
    ("código de bash -c", bash("bash -c 'bash bin/local-models-qualify m'")),
    ("thyrox-bg gestionado", bash("bash bin/thyrox-bg start a --task TASK-THYROX-0707 --kind probe -- bash bin/local-models-qualify m", background=True)),
    ("git status", bash("git status --short")),
    ("Edit en src/ durante la excepción", {"tool_name": "Edit", "tool_input": {"file_path": f"{ROOT}/src/x.py", "old_string": "a", "new_string": "b"}, "cwd": ROOT}),
]


def decision(payload: dict) -> str:
    env = {k: v for k, v in os.environ.items() if k != "THYROX_EXECUTION_POLICY"}
    run = subprocess.run(["bash", HOOK], input=json.dumps(payload), capture_output=True, text=True, env=env, timeout=60)
    return "deny" if '"deny"' in run.stdout else "sin decisión"


print(f"# hook real tras E0 publicado, invocación nueva por caso, sin override ({datetime.now(timezone.utc):%Y-%m-%dT%H:%M:%SZ})")
for label, payload in CASES:
    print(f"{label}: {decision(payload)}")
