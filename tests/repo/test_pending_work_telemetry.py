"""Pruebas del eje ``telemetry`` de ``repo.pending_work`` — la suciedad que
un hook escribe cada turno y que NO es trabajo sin publicar.

El defecto que cierran
----------------------
``agent-results/agent_store.sqlite3`` es tracked a propósito (driver
``sqlite-union``) y los hooks le escriben durante la sesión, así que el árbol
del proveedor queda sucio en CADA turno por construcción. El gate de Stop lo
contaba como trabajo pendiente y disparaba por él solo; el historial acumuló
commits cuyo único contenido era «registrar N filas». Peor que el ruido: eso
acostumbra a commitear sin mirar, que es el hábito contrario al que el gate
existe para crear.

Excluirlo a secas crearía un punto ciego. Lo que lo evita es que la ruta la
DECLARE el consumidor y que el eje se cuente y se nombre: una exclusión
declarada no es un punto ciego; una silenciosa sí.

CONTROL DE ANULACIÓN, medido: retirando el filtro —es decir, contando la
telemetría en ``dirty``— caen **5 de 8**: los dos del caso B (la telemetría
deja de contarse aparte y el conteo de código se contamina), el C (el repo
con sólo telemetría vuelve a disparar) y los dos del E (la línea deja de
nombrarla, y el número del código sale mal). Sobreviven los dos del A —que
miden la conducta SIN declarar telemetría, y por eso no dependen del filtro—
y el D, que es un repo limpio.

Al declararlo antes de medirlo escribí «caen 3 de 8» y nombré dos casos que
ni existen en este archivo. Se corrige aquí en vez de dejarlo mal: una
anulación que dice caer menos de lo que cae no sirve para leer un rojo
futuro. C sigue siendo el que no puede pasar sin el filtro.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from repo import pending_work  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def make_repo(root: Path, name: str) -> Path:
    repo = root / name
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "agent-results").mkdir()
    (repo / "agent-results" / "agent_store.sqlite3").write_text("v1", encoding="utf-8")
    (repo / "codigo.py").write_text("x = 1\n", encoding="utf-8")
    git(repo, "add", "-A")
    git(repo, "commit", "-q", "-m", "seed")
    return repo


LABELS = {"dirty": "sin commitear", "staged": "en stage",
          "untracked": "sin añadir", "ahead": "commit(s) sin pushear",
          "telemetry": "de telemetría (no es trabajo)"}
TELEMETRY = ("agent-results/agent_store.sqlite3",)

with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    solo_tele = make_repo(root, "solo-telemetria")
    (solo_tele / "agent-results" / "agent_store.sqlite3").write_text("v2", encoding="utf-8")

    mixto = make_repo(root, "mixto")
    (mixto / "agent-results" / "agent_store.sqlite3").write_text("v2", encoding="utf-8")
    (mixto / "codigo.py").write_text("x = 2\n", encoding="utf-8")

    limpio = make_repo(root, "limpio")

    print("== A. Sin declarar telemetría, todo cuenta como hoy ==")
    items = {p.name: p for p in pending_work.sweep([str(solo_tele)])}
    check("el store sucio dispara el gate", 1, len(items))
    check("y se cuenta como dirty", 1, items["solo-telemetria"].dirty)

    print("== B. Declarada, la telemetría se cuenta APARTE ==")
    items = {p.name: p for p in pending_work.sweep([str(mixto)], telemetry=TELEMETRY)}
    m = items["mixto"]
    check("el código sigue en dirty", 1, m.dirty)
    check("el store va a su propio eje", 1, m.telemetry)

    print("== C. Sólo telemetría NO es trabajo sin publicar ==")
    check("el repo no entra en la lista",
          [], [p.name for p in pending_work.sweep([str(solo_tele)], telemetry=TELEMETRY)])

    print("== D. Un repo limpio sigue sin entrar ==")
    check("nada que publicar",
          [], [p.name for p in pending_work.sweep([str(limpio)], telemetry=TELEMETRY)])

    print("== E. La línea NOMBRA la telemetría del repo que sí entra ==")
    linea = pending_work.render(pending_work.sweep([str(mixto)], telemetry=TELEMETRY), LABELS)
    check("nombra el código", True, "1 sin commitear" in linea)
    check("y nombra la telemetría, no la esconde",
          True, "1 de telemetría (no es trabajo)" in linea)

print(f"\nRESULTADO: {OK} ok, {FAILED} fallo(s)")
sys.exit(1 if FAILED else 0)
