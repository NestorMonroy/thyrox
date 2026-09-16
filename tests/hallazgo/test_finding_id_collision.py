#!/usr/bin/env python3
"""El acuñador y el escritor de hallazgos no se hablan: un id puede colisionar.

Defecto medido por conducta en la sesión que originó este archivo, dos veces
seguidas con una hora de diferencia (``H-THYROX-26``):

1. ``hallazgo_ids.py acunar THYROX`` devolvió ``H-THYROX-24``. Se registró un
   hallazgo con ese id.
2. La misma invocación devolvió ``H-THYROX-24`` **otra vez**, porque el
   acuñador escanea los ``.rst`` del consumidor y no ve las filas del store.
3. ``agent_store.py agregar-hallazgo`` hace ``ON CONFLICT DO UPDATE``, así que
   el segundo registro **reemplazó** al primero sin emitir un solo byte.

El primero sólo se recuperó porque seguía en el transcript de la sesión.

Los dos mecanismos se corrigen por separado, y el control mide cada mitad con
su propia anulación: el escritor deja de pisar aunque el acuñador colisione, y
el acuñador deja de colisionar aunque el escritor pisara.

Precondición verificada por conducta, no por docstring: ninguno de los módulos
que este archivo ejecuta escribe fuera del directorio temporal que se le
declara. Se comprueba con la huella del árbol antes y después (caso 5).
"""
from __future__ import annotations

import hashlib
import os
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = next((p for p in HERE.parents if (p / "src" / "paths" / "reach.py").is_file()), None)
if ROOT is None:
    raise RuntimeError(f"thyrox: no se encontró src/paths/reach.py sobre {HERE}")
sys.path.insert(0, str(ROOT / "src"))

from hallazgo import hallazgo_ids  # noqa: E402

STORE_CLI = ROOT / "src/agents/agent_store.py"
PREFIX = "TESTCOL"

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}" + (f" — {extra}" if extra else ""))


def add_finding(home: pathlib.Path, finding_id: str, summary: str,
                *, force: bool = False) -> subprocess.CompletedProcess:
    """Invoca el escritor tal como lo hace el paso 5 del flujo de sesión.

    ``--claude-dir`` es la vía declarada para apuntar a un store aislado; el
    subcomando compone bajo él ``agent-results/agent_store.sqlite3``. Medido:
    ``--store`` no es una bandera global de este CLI.
    """
    argv = [sys.executable, str(STORE_CLI),
            "agregar-hallazgo", "--claude-dir", str(home),
            "--finding-id", finding_id,
            "--submodule", "thyrox", "--initiative", "prueba-de-colision",
            "--summary", summary, "--content", f"cuerpo de {finding_id}"]
    if force:
        argv.append("--force")
    return subprocess.run(argv, capture_output=True, text=True, cwd=str(ROOT))


def store_path(home: pathlib.Path) -> pathlib.Path:
    return home / "agent-results" / "agent_store.sqlite3"


def stored_summary(home: pathlib.Path, finding_id: str) -> str | None:
    import sqlite3
    conn = sqlite3.connect(store_path(home))
    try:
        row = conn.execute(
            "SELECT summary FROM findings_history WHERE finding_id = ?",
            (finding_id,)).fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def tree_fingerprint(root: pathlib.Path) -> dict[str, str]:
    """Ruta -> sha256 del árbol, para medir escritura por conducta."""
    skip = {".git", "node_modules", "__pycache__", ".venv"}
    out: dict[str, str] = {}
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip]
        for name in files:
            path = pathlib.Path(base) / name
            try:
                out[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
            except OSError:
                pass
    return out


def test_writer_refuses_an_existing_finding_id(home: pathlib.Path) -> None:
    """El caso central: un id repetido es un rehúse, no una actualización muda."""
    first = add_finding(home, f"H-{PREFIX}-1", "el primero")
    check("el primer registro entra", first.returncode == 0, first.stderr[-160:])

    second = add_finding(home, f"H-{PREFIX}-1", "el segundo, que pisaría")
    check("el segundo REHÚSA con exit 2", second.returncode == 2,
          f"exit={second.returncode} {second.stdout[-120:]}")
    check("y nombra el id en conflicto", f"H-{PREFIX}-1" in second.stderr,
          second.stderr[-160:])
    check("el primero SIGUE en el store",
          stored_summary(home, f"H-{PREFIX}-1") == "el primero",
          str(stored_summary(home, f"H-{PREFIX}-1")))


def test_writer_updates_when_the_caller_declares_it(home: pathlib.Path) -> None:
    """La vía legítima de corregir un hallazgo ya escrito sigue abierta.

    Sin este caso el rehúse sería un bloqueo total, y quien necesite corregir
    un hallazgo tendría que editar el store a mano — peor que el defecto.
    """
    add_finding(home, f"H-{PREFIX}-2", "version inicial")
    forced = add_finding(home, f"H-{PREFIX}-2", "version corregida", force=True)
    check("con --force el registro entra", forced.returncode == 0, forced.stderr[-160:])
    check("y el contenido converge",
          stored_summary(home, f"H-{PREFIX}-2") == "version corregida",
          str(stored_summary(home, f"H-{PREFIX}-2")))


def test_minter_sees_ids_that_live_only_in_the_store(home: pathlib.Path,
                                                     docs: pathlib.Path) -> None:
    """El acuñador escanea los ``.rst`` del consumidor; el store también cuenta.

    Sin esta mitad, un hallazgo que vive SÓLO como fila —el caso de todo lo
    que se registra desde el proveedor— es invisible para el siguiente número.
    """
    add_finding(home, f"H-{PREFIX}-7", "solo vive en el store")
    siguiente = hallazgo_ids.next_id(docs, PREFIX, store_path=store_path(home))
    # El relleno a dos digitos por debajo de 10 es la forma REAL del arbol,
    # medida: `H-API-01` existe y `H-API-010` no. No es cosmetica de este test.
    check("el siguiente id no colisiona con la fila del store",
          siguiente == f"H-{PREFIX}-08", siguiente)


def test_the_verifier_also_sees_the_store(home: pathlib.Path,
                                          docs: pathlib.Path) -> None:
    """`is_free` une las dos fuentes, igual que `next_id`.

    Sin esta mitad el verificador publicaría «libre» sobre un id que el
    escritor va a rehusar: dos mecanismos con veredictos opuestos sobre el
    mismo id. El caso mide el id que vive SÓLO como fila —el .rst del
    consumidor no lo tiene— para que la fuente que discrimina sea el store.
    """
    libre_sin_store = hallazgo_ids.is_free(docs, f"H-{PREFIX}-7")
    check("sin el store, el verificador lo ve libre (la mitad ciega)",
          libre_sin_store is True, str(libre_sin_store))
    libre_con_store = hallazgo_ids.is_free(docs, f"H-{PREFIX}-7",
                                           store_path=store_path(home))
    check("con el store, el verificador lo ve OCUPADO",
          libre_con_store is False, str(libre_con_store))


def test_minter_still_reads_the_consumer_tree(home: pathlib.Path,
                                              docs: pathlib.Path) -> None:
    """El control que impide que la mitad nueva tape a la vieja.

    Si ``next_id`` pasara a mirar SÓLO el store, un hallazgo ya escrito como
    ``.rst`` dejaría de contar y volveríamos a colisionar por el otro lado.
    """
    # El id va en el CONTENIDO, no solo en el nombre: `used_numbers` escanea
    # texto. Medido en el arbol real — todo hallazgo lleva su etiqueta dentro
    # (`.. _h-api-382:`), asi que la forma del test es la forma del corpus.
    (docs / "source").mkdir(parents=True, exist_ok=True)
    (docs / "source" / f"hallazgo-H-{PREFIX}-30-algo.rst").write_text(
        f".. _h-{PREFIX.lower()}-30:\n\nH-{PREFIX}-30 — algo\n")
    siguiente = hallazgo_ids.next_id(docs, PREFIX, store_path=store_path(home))
    check("el .rst del consumidor sigue contando",
          siguiente == f"H-{PREFIX}-31", siguiente)


def test_the_modules_under_test_do_not_write_to_the_tree() -> None:
    """ERR-066 aplicado a esta suite: invocar un módulo para probarlo no es leerlo.

    La suite ejecuta el CLI del store y el acuñador. Este caso mide por
    CONDUCTA —huella del árbol antes y después— que ninguno toca el
    repositorio cuando se le declara un store temporal. Sin él, la seguridad
    de esta suite descansaría en haber leído su código una vez.
    """
    before = tree_fingerprint(ROOT)
    with tempfile.TemporaryDirectory() as tmp:
        home = pathlib.Path(tmp) / "home"
        docs = pathlib.Path(tmp) / "docs"
        home.mkdir()
        docs.mkdir()
        add_finding(home, f"H-{PREFIX}-99", "sonda de escritura")
        hallazgo_ids.next_id(docs, PREFIX, store_path=store_path(home))
    after = tree_fingerprint(ROOT)
    added = sorted(set(after) - set(before))
    changed = sorted(k for k in set(before) & set(after) if before[k] != after[k])
    check("no aparecen archivos nuevos en el árbol", not added, str(added[:3]))
    check("no cambia ningún archivo del árbol", not changed, str(changed[:3]))


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        docs = base / "docs"
        docs.mkdir()
        for nombre in ("a", "b", "c"):
            (base / nombre).mkdir()
        test_writer_refuses_an_existing_finding_id(base / "a")
        test_writer_updates_when_the_caller_declares_it(base / "b")
        test_minter_sees_ids_that_live_only_in_the_store(base / "c", docs)
        test_the_verifier_also_sees_the_store(base / "c", docs)
        test_minter_still_reads_the_consumer_tree(base / "c", docs)
    test_the_modules_under_test_do_not_write_to_the_tree()
    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: hallazgo_ids.next_id + agent_store agregar-hallazgo)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
