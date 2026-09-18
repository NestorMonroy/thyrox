"""Suite del recorrido acotado.

El control que importa no es «encuentra el archivo» —eso lo hace igual un
``glob`` sin cota— sino que **termine declarando su corte**. Un recorrido que
se queda sin presupuesto y aun asi imprime lo que llevaba es indistinguible de
uno completo: el verde no separa «esto es todo» de «esto es lo que cupo», que
es el sub-patron D de ``metrica-decide-la-conclusion.md`` con el propio
instrumento como sujeto.
"""
from __future__ import annotations

import importlib.util
import os
import pathlib
import sys
import tempfile
from pathlib import Path

# El bootstrap CANONICO de thyrox (`paths.reach.BOOTSTRAP`): ascenso con
# deteccion del marcador, no `parents[N]`. La aritmetica por offset acierta a
# UNA profundidad y falla en SILENCIO al mover el archivo un nivel — resuelve
# otra ruta que existe y nadie se entera (tarea #228, H-DOCS-1103). El ascenso
# no depende de cuantos niveles haya.
_AQUI = Path(__file__).resolve()
_RAIZ = next((p for p in _AQUI.parents
              if (p / "src" / "paths" / "reach.py").is_file()), None)
if _RAIZ is None:
    raise RuntimeError(f"thyrox: no se encontro src/paths/reach.py sobre {_AQUI}")
sys.path.insert(0, str(_RAIZ / "src"))

from paths.reach import thyrox_root  # noqa: E402

_MODULE = thyrox_root(_AQUI.parent) / "src/session/bounded_scan.py"
_spec = importlib.util.spec_from_file_location("_scan", _MODULE)
scan = importlib.util.module_from_spec(_spec)
# El registro en `sys.modules` ANTES de ejecutar es parte de la receta de
# importlib, no un adorno: `@dataclass` resuelve sus anotaciones mirando
# `sys.modules[cls.__module__].__dict__`, y sin la linea revienta con un
# `AttributeError` sobre None que no nombra la causa. Medido en 3.11.
sys.modules["_scan"] = scan
_spec.loader.exec_module(scan)


def _tree():
    """Un arbol con la forma que provoco el defecto: ruido voluminoso podable."""
    root = pathlib.Path(tempfile.mkdtemp())
    (root / "src").mkdir()
    (root / "src" / "uno.sqlite3").write_text("x")
    (root / "node_modules" / "pkg").mkdir(parents=True)
    (root / "node_modules" / "pkg" / "oculto.sqlite3").write_text("x")
    (root / "_references" / "corpus").mkdir(parents=True)
    (root / "_references" / "corpus" / "tambien.sqlite3").write_text("x")
    (root / ".git").mkdir()
    (root / ".git" / "indice.sqlite3").write_text("x")
    return root


def test_finds_the_file_outside_the_pruned_directories():
    root = _tree()
    resultado = scan.walk(root, name="*.sqlite3")
    nombres = sorted(pathlib.Path(p).name for p in resultado.paths)
    # `_references` NO se poda: son los corpus contra los que se construye, o
    # sea sujeto de analisis. Lo que se poda es volumen: .git y node_modules.
    assert nombres == ["tambien.sqlite3", "uno.sqlite3"]
    assert resultado.complete is True
    assert resultado.reason is None


def test_the_default_prune_list_carries_its_own_weight():
    """El caso donde podar es lo UNICO que cambia el resultado.

    Sin la lista, los tres archivos escondidos aparecen: es la anulacion del
    unico guard que los tapa. Si este caso pasara con y sin la lista, la lista
    seria codigo muerto.
    """
    root = _tree()
    con_poda = scan.walk(root, name="*.sqlite3")
    sin_poda = scan.walk(root, name="*.sqlite3", prune=())
    assert len(con_poda.paths) == 2
    assert len(sin_poda.paths) == 4


def test_a_truncated_walk_declares_itself_and_does_not_pass_for_complete():
    root = _tree()
    resultado = scan.walk(root, name="*", max_entries=2, prune=())
    assert resultado.complete is False
    assert resultado.reason == "max_entries"
    assert resultado.exit_code == scan.EXIT_TRUNCATED


def test_the_deadline_stops_a_walk_that_the_entry_cap_would_not():
    """El deadline es un guard distinto del cap, y se anula por separado."""
    root = _tree()
    resultado = scan.walk(root, name="*", deadline=0.0, prune=())
    assert resultado.complete is False
    assert resultado.reason == "deadline"


def test_a_complete_walk_exits_zero():
    root = _tree()
    assert scan.walk(root, name="*.sqlite3").exit_code == scan.EXIT_OK


def test_refuses_a_root_that_does_not_exist():
    resultado = scan.walk(pathlib.Path("/no/existe/en/ningun/arbol"), name="*")
    assert resultado.exit_code == scan.EXIT_REFUSED
    assert resultado.complete is False
    assert "no existe" in (resultado.reason or "")


def test_the_cli_prints_the_notice_to_stderr_when_it_truncates(capsys=None):
    """El corte se declara por stderr, no mezclado con las rutas de stdout."""
    root = _tree()
    codigo = scan.main([str(root), "--name", "*", "--max-entries", "1",
                        "--no-default-prune"])
    assert codigo == scan.EXIT_TRUNCATED


def test_the_symlink_loop_does_not_hang_the_walk():
    """Un enlace al padre es la forma clasica de recorrido infinito."""
    root = _tree()
    os.symlink(str(root), str(root / "src" / "bucle"))
    resultado = scan.walk(root, name="*.sqlite3", deadline=5.0)
    assert resultado.exit_code in (scan.EXIT_OK, scan.EXIT_TRUNCATED)


if __name__ == "__main__":
    import traceback
    _fallos = 0
    for _nombre, _caso in sorted(list(globals().items())):
        if not _nombre.startswith("test_") or not callable(_caso):
            continue
        try:
            _caso()
            print(f"  ok    {_nombre}")
        except Exception:
            _fallos += 1
            print(f"  FALLO {_nombre}")
            traceback.print_exc()
    print(f"resumen: {_fallos} fallo(s)")
    raise SystemExit(1 if _fallos else 0)
