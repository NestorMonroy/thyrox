#!/usr/bin/env python3
"""Control de `src/verify/check_podman_materialization.py` sobre árboles de prueba.

Qué haría fallar a este control:
- que una forma de materializar fuera de la primitiva —argv del contenedor,
  verbo de Podman en TS, shell o Python— no se marcara;
- que la primitiva misma, un comentario o un docstring se marcaran;
- que una entrada pendiente eximiera sin tarea abierta en el store;
- que el gate publicara un conteo sin ``src/`` o sin store que medir.

El control positivo es real: las dos líneas con que el daemon materializaba sus
workers en ``thyrox@dd85fea42`` (``podmanWorkerManager.ts:248,250``).
"""
from __future__ import annotations

import contextlib
import io
import sqlite3
import sys
import tempfile
from pathlib import Path

from verify import check_podman_materialization as gate

passed = failed = 0
DAEMON_HEAD_LINES = (
    "    const created = await podman.run(createWorkerContainerArgv(spec))\n"
    "    if (created.exitCode !== 0) await this.abandon(request.workerId, 'create', commandDetail(created))\n"
    "    const started = await podman.run(['start', name])\n"
)


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def tree(files: dict[str, str]) -> Path:
    root = Path(tempfile.mkdtemp(prefix="podman-materialization-"))
    for relative, text in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return root


def store_with(root: Path, tasks: dict[str, str]) -> Path:
    store = root / "store.sqlite3"
    connection = sqlite3.connect(store)
    connection.execute("create table tasks (citation_id text, layer_citation_id text, status text)")
    for citation, status in tasks.items():
        connection.execute("insert into tasks values (?, ?, ?)", (f"TASK-GEN-{citation[-4:]}", citation, status))
    connection.commit()
    connection.close()
    return store


def run(root: Path, *extra: str) -> tuple[int, str]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        code = gate.main(["--root", str(root), *extra])
    return code, out.getvalue()


def kinds(output: str) -> list[str]:
    forms = {"container-argv", "podman-verb", "podman-spawn"}
    return sorted(line.split()[-1] for line in output.splitlines() if line.startswith("  src/") and line.split()[-1] in forms)


empty_pending = Path(tempfile.mkdtemp()) / "none.txt"

root = tree({"src/packages/daemon/src/podman/podmanWorkerManager.ts": DAEMON_HEAD_LINES})
code, output = run(root, "--pending", str(empty_pending), "--strict")
assert_equal("el daemon en HEAD materializaba fuera de la primitiva: argv y verbo", ["container-argv", "podman-verb"], kinds(output))
assert_equal("con --strict, una materialización fuera de la primitiva sale 1", 1, code)

root = tree({"src/packages/podman-execution/containerRun.ts": DAEMON_HEAD_LINES})
code, output = run(root, "--pending", str(empty_pending), "--strict")
assert_equal("la primitiva misma es la autoridad: no se marca", ([], 0), (kinds(output), code))

root = tree({
    "src/lib/probe.sh": 'out="$("$PODMAN" run --rm alpine true)"\n# podman create sólo en un comentario\n',
    "src/session/measure.py": 'cmd = ["podman", "exec", name, "true"]\n"""\npodman run en un docstring\n"""\n',
    "src/packages/x/spawn.ts": "const child = Bun.spawn(['podman', 'run'])\nconst p = spawnSync('podman', ['build'])\n// podman.run(['create']) en comentario\n",
})
code, output = run(root, "--pending", str(empty_pending))
assert_equal("shell, Python y spawn de podman se marcan; comentarios y docstrings no",
             ["podman-spawn", "podman-spawn", "podman-verb", "podman-verb"], kinds(output))

root = tree({"src/packages/x/a.ts": "await podman.run(['inspect', name])\nawait podman.run(['rm', '--force', name])\n"})
code, output = run(root, "--pending", str(empty_pending), "--strict")
assert_equal("leer y retirar no materializan", ([], 0), (kinds(output), code))

root = tree({"src/lib/probe.sh": '"$PODMAN" run --rm alpine true\n'})
pending = root / "pending.txt"
pending.write_text("src/lib/probe.sh\tTASK-THYROX-0746\tsondas por migrar\n", encoding="utf-8")
store = store_with(root, {"TASK-THYROX-0746": "pending"})
code, output = run(root, "--pending", str(pending), "--store", str(store), "--strict")
assert_equal("una entrada con su tarea abierta exime el sitio", ([], 0), (kinds(output), code))

store = store_with(Path(tempfile.mkdtemp()), {"TASK-THYROX-0746": "completed"})
code, output = run(root, "--pending", str(pending), "--store", str(store), "--strict")
assert_equal("con la tarea cerrada la entrada vence: sale 1, la nombra y no exime", (1, True, ["podman-verb"]),
             (code, "la entrada venció" in output, kinds(output)))

store = store_with(Path(tempfile.mkdtemp()), {})
code, output = run(root, "--pending", str(pending), "--store", str(store), "--strict")
assert_equal("una tarea ausente del store tampoco exime", (1, True), (code, "ausente del store" in output))

code, output = run(root, "--pending", str(pending), "--store", str(root / "no-store.sqlite3"))
assert_equal("con pendientes y sin store no hay medida: sale 2 sin conteo", (2, False), (code, "materialización(es)" in output))

code, output = run(Path(tempfile.mkdtemp()), "--pending", str(empty_pending))
assert_equal("sin src/ no hay medida: sale 2", 2, code)

print(f"{passed + failed} casos: {passed} ok, {failed} fallos")
sys.exit(1 if failed else 0)
