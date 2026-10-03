"""La política de ejecución declarada niega lo que prohíbe (TASK-THYROX-0773).

El defecto, tomado de la sesión del 2026-10-02 (H-THYROX-413)
--------------------------------------------------------------
Tras una compactación, el controlador despachó el Search Existing a un
subagente ``Explore`` y lanzó una cualificación con el segundo plano del
cliente después de que ``thyrox-bg`` la rehusara. La regla que lo prohibía sólo
vivía en la conversación. Aquí vive en ``src/session/execution_policy.json`` y
la leen los detectores de ``tool_use_preflight``.

Lo que se mide, y cómo podría fallar
------------------------------------
- Lo decide la ACCIÓN más el CAMPO que la gobierna: ``controller.subagents``
  el despacho, ``controller.unmanagedPayloads`` el payload no gestionado (en
  primer o segundo plano), ``controller.implementation`` la escritura del
  producto por el controlador. ``fallback.enabled`` no decide ninguna (8).
- La política del repositorio manda sobre ``controller``: un override sólo la
  endurece, nunca la abre, ni declarando lo contrario ni omitiendo la sección
  (9).
- Falla cerrada: un override declarado que no existe, o una capa ilegible,
  niega (10).
"""
from __future__ import annotations

import importlib.util
import json
import os
import pathlib
import sys
import tempfile
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
import session.execution_policy as policy_module  # noqa: E402


def _load(name: str) -> Any:
    spec = importlib.util.spec_from_file_location(f"_{name}", ROOT / "src/hooks" / f"{name}.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


agent_gate = _load("detect_agent_dispatch")
payload_gate = _load("detect_client_background")
mutation_gate = _load("detect_controller_mutation")
VERSIONED = policy_module.DECLARED_POLICY

#: La llamada del episodio, verbatim salvo el recorte de su cola.
EPISODE_UNMANAGED = ("cd /home/user/thyrox; R=.thyrox/runtime/a4-qualify-qwen3-4b; bash "
                     ".claude/workbench/local-bootstrap-20261002T180454/probes/qualify_progressive.sh $R "
                     "thyrox-library--qwen3-4b:q4_k_m-ollama-359d7dd4bcda > $R/run.log 2>&1")
AGENT_DISPATCH = {"tool_name": "Agent", "tool_input": {
    "description": "Search Existing for A8a", "subagent_type": "Explore",
    "prompt": "Read-only Search Existing: classify the outcome taxonomy and decide REUSE/EXTEND/MISSING."}}

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLA {label} — esperado {expected!r} obtenido {obtained!r}")
        FAILED += 1


def decision(result) -> str | None:
    return result.get("decision") if isinstance(result, dict) else None


def write_policy(controller: dict | None, fallback: bool = False, text: str | None = None) -> pathlib.Path:
    path = pathlib.Path(tempfile.mkdtemp()) / "policy.json"
    if text is not None:
        path.write_text(text)
        return path
    body: dict = {"allowed": [{"runtime": "ollama", "repository": "library/qwen3-4b"}], "fallback": {"enabled": fallback}}
    if controller is not None:
        body["controller"] = controller
    path.write_text(json.dumps(body))
    return path


def controller(subagents=False, payloads=False, implementation="bootstrap-exception") -> dict:
    return {"subagents": subagents, "unmanagedPayloads": payloads, "implementation": implementation}


def layers(repository: pathlib.Path | None, override: pathlib.Path | None = None) -> None:
    """Fija la capa del repositorio (en el proceso) y el override (por su variable)."""
    policy_module.DECLARED_POLICY = repository if repository is not None else pathlib.Path("/nonexistent/policy.json")
    if override is None:
        os.environ.pop("THYROX_EXECUTION_POLICY", None)
    else:
        os.environ["THYROX_EXECUTION_POLICY"] = str(override)


def agent() -> str | None:
    return decision(agent_gate.detect(AGENT_DISPATCH))


def run(command: str, background: bool = False, tool: str = "Bash") -> str | None:
    if tool == "Monitor":
        call = {"tool_name": "Monitor", "tool_input": {"command": command, "description": "x"}}
    else:
        call = {"tool_name": "Bash", "tool_input": {"command": command, "run_in_background": background}}
    return decision(payload_gate.detect(call))


#: El entorno del proceso del hook de un worker del pool: su ítem y su corrida.
WORKER_ENV = {"THYROX_POOL_ITEM": "1", "THYROX_POOL_RUN_ID": "run-a"}
WORKER_TREE = f"{ROOT}/.thyrox/pool-worktrees/abc123/1"


def edit(path: str, env: dict | None = None, cwd: str | None = None) -> str | None:
    call = {"tool_name": "Edit", "tool_input": {"file_path": path}, "cwd": cwd or str(ROOT)}
    return decision(mutation_gate.detect(call, env=env or {}))


def bash_mutation(command: str, env: dict | None = None, cwd: str | None = None) -> str | None:
    call = {"tool_name": "Bash", "tool_input": {"command": command}, "cwd": cwd or str(ROOT)}
    return decision(mutation_gate.detect(call, env=env or {}))


def main() -> int:
    layers(write_policy(controller()))
    check("1 subagentes prohibidos: Agent deny", "deny", agent())
    check("2 payload del episodio en segundo plano: deny", "deny", run(EPISODE_UNMANAGED, background=True))
    check("2 el MISMO payload en primer plano: deny", "deny", run(EPISODE_UNMANAGED))
    check("2 el mismo payload desde Monitor: deny", "deny", run(EPISODE_UNMANAGED, tool="Monitor"))
    check("3 una suite en primer plano es payload: deny", "deny", run("bash tests/session/test-model-coordinator-entry.sh"))
    check("3 bun test en primer plano: deny", "deny", run("cd src/packages/daemon && bun test src/__tests__/x.test.ts"))
    check("3 una cualificación en primer plano: deny", "deny",
          run("bash bin/local-models-qualify thyrox-library--qwen3-4b:q4_k_m --context 8192"))
    check("4 thyrox-bg gestionado no se niega", None, run(
        "bash bin/thyrox-bg start a4 --task TASK-THYROX-0707 --kind probe -- bash bin/local-models-qualify m", background=True))
    check("4 la espera de un trabajo del ledger no se niega", None, run(
        "bash bin/thyrox-bg wait a4 >/dev/null 2>&1; echo \"a4: $(bash bin/thyrox-bg status a4)\"", tool="Monitor"))
    check("4 una espera de observación no se niega", None, run(
        "until [ -S /root/.claude/model-scheduling/coordinator.sock ]; do sleep 1; done", background=True))
    check("4 una entrada del plano de control no se niega", None, run("bash bin/infrastructure_ensure thyrox-ollama", background=True))
    check("4 leer y buscar en primer plano no es payload", None, run("git status --short; cat src/session/bg.sh | head"))
    check("4 nombrar una suite como argumento no la ejecuta", None, run("grep -n pytest tests/run.sh"))

    # 8 — los ejes son independientes y fallback.enabled no decide ninguno.
    layers(write_policy(controller(subagents=False, payloads=True), fallback=True))
    check("8 respaldo admitido NO admite subagentes", "deny", agent())
    check("8 y el payload se rige por su propio campo", None, run(EPISODE_UNMANAGED))
    layers(write_policy(controller(subagents=True, payloads=False), fallback=False))
    check("8 respaldo prohibido NO prohíbe subagentes admitidos", None, agent())
    check("8 y el payload sigue negado por su campo", "deny", run(EPISODE_UNMANAGED))

    # 9 — el override no abre lo que el repositorio cierra.
    closed = write_policy(controller())
    layers(closed, write_policy(None, fallback=True))
    check("9 un override sin controller no borra la restricción del repositorio", "deny", agent())
    check("9 ni la del payload", "deny", run(EPISODE_UNMANAGED))
    layers(closed, write_policy(controller(subagents=True, payloads=True)))
    check("9 un override que declara lo contrario no abre", "deny", agent())
    layers(write_policy(controller(subagents=True, payloads=True)), write_policy(controller()))
    check("9 un override sí puede endurecer", "deny", agent())

    # 10 — falla cerrada.
    layers(write_policy(controller(subagents=True, payloads=True)), pathlib.Path("/nonexistent/declared.json"))
    check("10 un override declarado que no existe niega", "deny", agent())
    check("10 también el payload", "deny", run(EPISODE_UNMANAGED))
    layers(write_policy(None, text="{ no es json"))
    check("10 una capa ilegible niega", "deny", agent())
    layers(write_policy({"subagents": True}))
    check("10 una sección controller incompleta niega lo que no declara", "deny", run(EPISODE_UNMANAGED))
    layers(None)
    check("11 sin ninguna capa no hay nada que restringir", None, agent())

    # 12 — la escritura del producto por el controlador.
    layers(write_policy(controller(implementation="bootstrap-exception")))
    check("12 durante la excepción el controlador escribe el producto", None, edit(f"{ROOT}/src/session/bg.sh"))
    layers(write_policy(controller(implementation="managed-only")))
    check("12 cerrada la excepción: Edit en src/ deny", "deny", edit(f"{ROOT}/src/session/bg.sh"))
    check("12 y en tests/ de un worktree", "deny", edit(f"{ROOT}/.thyrox/runtime/worktrees/e1/tests/x.py"))
    check("12 sed -i sobre el producto deny", "deny", bash_mutation("sed -i 's/a/b/' src/session/bg.sh"))
    check("12 replace_literal sobre el producto deny", "deny", bash_mutation("OLD=a NEW=b bash bin/replace_literal src/x.py"))
    check("12 el estado (.claude/) no es producto", None, edit(f"{ROOT}/.claude/workbench/x/outputs/a.md"))
    check("12 leer el producto no es escribirlo", None, bash_mutation("cat src/session/bg.sh"))
    check("12 /usr/bin no es bin/ del producto", None, bash_mutation("/usr/bin/time -v ls > /tmp/x"))
    layers(write_policy(controller(implementation="bootstrap-exception")), write_policy(controller(implementation="managed-only")))
    check("12 un override puede cerrar la excepción", "deny", edit(f"{ROOT}/src/session/bg.sh"))
    layers(write_policy(controller(implementation="managed-only")), write_policy(controller(implementation="bootstrap-exception")))
    check("12 un override no puede reabrirla", "deny", edit(f"{ROOT}/src/session/bg.sh"))

    # 13 — la política versionada, sin variable: lo que rige tras una compactación.
    layers(VERSIONED)
    check("13 versionada: Agent deny", "deny", agent())
    check("13 versionada: payload en primer plano deny", "deny", run(EPISODE_UNMANAGED))
    declared = json.loads(VERSIONED.read_text())
    check("13 la versionada declara los tres permisos y la excepción vigente",
          (True, False, False, "bootstrap-exception"),
          (declared["fallback"]["enabled"], declared["controller"]["subagents"],
           declared["controller"]["unmanagedPayloads"], declared["controller"]["implementation"]))

    # 14 — el texto que no se ejecuta no es payload (falso positivo del 2026-10-02:
    # un `git commit -F -` cuyo mensaje nombraba la cualificación fue negado).
    layers(write_policy(controller()))
    check("14 el cuerpo de un heredoc de datos no es payload", None, run(
        "git commit -q -F - -- x <<'MSG'\nlocal-models-qualify ran through thyrox-bg\nMSG\necho exit=$?"))
    check("14 el cuerpo de un heredoc que lee bash sí se ejecuta: deny", "deny", run(
        "bash <<'RUN'\nbash bin/local-models-qualify m --context 8192\nRUN"))
    check("14 y el de sh -s también: deny", "deny", run(
        "sh -s <<'RUN'\nbun test src/packages/x\nRUN"))
    check("14 una cadena de datos no es payload", None, run(
        "python3 -c \"print('headless-pool y local-models-qualify')\" > .thyrox/runtime/m.json"))
    check("14 un separador dentro de una comilla de datos no abre un comando", None, run(
        "printf \x27%s\\n\x27 \x27x; bash tests/session/test-x.sh run\x27 > .thyrox/runtime/m.txt"))
    check("14 el argumento de bash -c sí es código: deny", "deny", run(
        "bash -c 'bash bin/local-models-qualify m'"))
    check("14 el texto tras el marcador del heredoc se ejecuta: deny", "deny", run(
        "cat <<'MSG' > .thyrox/runtime/m.txt && bash tests/session/test-x.sh\ntexto\nMSG"))

    # 15 — producto es todo lo versionable fuera del estado, y el actor importa.
    layers(write_policy(controller(implementation="managed-only")))
    check("15 .env.example es producto: deny", "deny", edit(f"{ROOT}/.env.example"))
    check("15 package.json relativo al cwd es producto: deny", "deny", edit("package.json"))
    check("15 .githooks/ es producto: deny", "deny", bash_mutation("printf x >> .githooks/pre-commit"))
    check("15 el estado .thyrox/ no es producto", None, bash_mutation("printf x > .thyrox/runtime/a.txt"))
    check("15 agent-results/ no es producto", None, edit(f"{ROOT}/agent-results/notes.md"))
    check("15 fuera del árbol no es producto", None, bash_mutation("printf x > /tmp/claude-0/a.txt"))
    check("15 commitear lo integrado con salida a un log no es escribir el producto", None, bash_mutation(
        "git commit -q -F .thyrox/runtime/m.txt -- src/x.py tests/y.py > .thyrox/runtime/c.log 2>&1"))
    check("15 2>&1 no es un destino", None, bash_mutation("git status --short src/ 2>&1"))
    check("15 cp hacia el producto: deny", "deny", bash_mutation("cp .thyrox/runtime/x.py src/x.py"))
    check("15 copiar DESDE el producto no lo escribe", None, bash_mutation("cp src/x.py .thyrox/runtime/x.py"))
    check("15 rm del producto: deny", "deny", bash_mutation("rm -f tests/x.py"))
    check("15 git apply en el árbol: deny", "deny", bash_mutation("git apply .thyrox/runtime/p.patch"))
    check("15 git apply en un worktree del árbol también: deny", "deny", bash_mutation(
        "git -C .thyrox/runtime/worktrees/e1 apply /tmp/p.patch"))
    check("15 un worker escribe en su worktree", None, edit(f"{WORKER_TREE}/src/x.py", WORKER_ENV, WORKER_TREE))
    check("15 y por Bash", None, bash_mutation("sed -i 's/a/b/' src/x.py", WORKER_ENV, WORKER_TREE))
    check("15 el controlador en el worktree de un ítem: deny", "deny", edit(f"{WORKER_TREE}/src/x.py"))
    check("15 un worker fuera de su worktree: deny", "deny", edit(f"{ROOT}/src/x.py", WORKER_ENV, WORKER_TREE))
    check("15 media identidad no es un worker: deny", "deny", edit(
        f"{WORKER_TREE}/src/x.py", {"THYROX_POOL_ITEM": "1"}, WORKER_TREE))
    layers(write_policy(controller(implementation="bootstrap-exception")))
    check("15 durante la excepción el worker tampoco se niega fuera", None, edit(f"{ROOT}/src/x.py", WORKER_ENV, WORKER_TREE))

    print(f"execution_policy: {OK} ok, {FAILED} fallas")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
