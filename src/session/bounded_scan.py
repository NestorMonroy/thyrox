"""Recorrido de arbol ACOTADO: termina siempre, y declara si se quedo corto.

El defecto que cierra tiene fecha y dos ocurrencias en la misma sesion
(:ref:`h-thyrox-23`). La forma es esta::

    glob.glob('/home/user/thyrox/**/*.sqlite3', recursive=True)

Un recorrido sin cota sobre una raiz pesada no falla: **gira**. Paso de los
120 s del primer plano, el cliente lo mando a segundo plano y ahi quedo — sin
resultado, sin error y sin final. Lo que se paga no es el proceso, que cuesta
cero tokens: son los turnos de quien lo descubre, lo diagnostica y lo mata.

Las tres cotas, y ninguna es opcional
-------------------------------------

1. **Poda por defecto.** ``.git``, ``node_modules``, ``_references`` y los
   caches son el volumen, no el sujeto. En el arbol del proveedor lo tracked
   son 16 524 archivos; lo que hizo girar al glob estaba fuera de esa cuenta.
2. **Tope de entradas visitadas.** Una raiz equivocada deja de ser cara a los
   pocos segundos en vez de al cabo de una hora.
3. **Plazo de pared.** Es la unica cota que sobrevive a un bucle de enlaces
   simbolicos, donde el tope de entradas tambien crece sin fin.

Por que un corte NO puede salir en silencio
-------------------------------------------

Si al agotar el presupuesto se imprimieran las rutas que llevaba, la salida
seria indistinguible de un recorrido completo: el lector no puede separar
«esto es todo» de «esto es lo que cupo». Es el sub-patron D de
``metrica-decide-la-conclusion.md`` con el instrumento como sujeto. Por eso el
corte viaja en el codigo de salida (``EXIT_TRUNCATED``) y en un aviso por
stderr, separado de las rutas de stdout.

*Metrica:* entradas de directorio visitadas y segundos de reloj de pared.
*Ciega a:* el tamano en bytes de lo recorrido —dos arboles con el mismo numero
de entradas pueden costar muy distinto en E/S— y al contenido de los archivos,
que este recorrido no abre.
"""
from __future__ import annotations

import argparse
import fnmatch
import os
import pathlib
import sys
import time
from dataclasses import dataclass, field

#: Recorrido completo dentro del presupuesto.
EXIT_OK = 0
#: La raiz no existe, o no es un directorio: no hay con que medir.
EXIT_REFUSED = 2
#: Se agoto una de las cotas. La salida es PARCIAL y lo dice.
EXIT_TRUNCATED = 3

#: Directorios que son volumen y no sujeto. Se podan salvo que se pida lo
#: contrario: son la diferencia entre segundos y una hora sobre la misma raiz.
DEFAULT_PRUNE: tuple[str, ...] = (
    ".git",
    "node_modules",
    "_references",
    "__pycache__",
    ".venv",
    "venv",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    "dist",
    "build",
    ".next",
)

#: NO se poda ``.cache``, y es una exclusion deliberada de la lista. El
#: ``.claude/.cache`` del cliente guarda telemetria de la sesion: es SUJETO de
#: analisis, no volumen que estorbe. Podarlo por parecerse a un cache de build
#: lo dejaria invisible para los censos que lo miden — el instrumento callaria
#: sobre lo que se le pregunta, que es la ceguera de
#: ``metrica-decide-la-conclusion.md``. Quien necesite saltarlo lo pide con
#: ``--prune .cache``.

#: Entradas de directorio antes de rendirse. Elegido para que una raiz
#: equivocada cueste segundos: el arbol del proveedor tiene 16 524 archivos
#: tracked, asi que este tope deja pasar diez arboles como ese antes de cortar.
DEFAULT_MAX_ENTRIES = 200_000

#: Segundos de reloj de pared. Por debajo del timeout de primer plano del
#: cliente (120 s) a proposito: la cota tiene que morder antes que el harness.
DEFAULT_DEADLINE = 30.0


@dataclass
class ScanResult:
    """Lo recorrido, y si el recorrido llego hasta el final.

    ``complete`` y ``reason`` son lo que impide que una salida parcial se lea
    como completa. Un consumidor que ignore ambos reintroduce el defecto.
    """

    paths: list[str] = field(default_factory=list)
    visited: int = 0
    elapsed: float = 0.0
    complete: bool = True
    reason: str | None = None

    @property
    def exit_code(self) -> int:
        if self.reason and self.reason.startswith("no existe"):
            return EXIT_REFUSED
        return EXIT_OK if self.complete else EXIT_TRUNCATED


def walk(root,
         name: str = "*",
         prune: tuple[str, ...] | None = None,
         max_entries: int = DEFAULT_MAX_ENTRIES,
         deadline: float = DEFAULT_DEADLINE) -> ScanResult:
    """Recorre ``root`` podando y con presupuesto; nunca gira sin fin.

    ``prune=()`` desactiva la poda —es lo que usa el control de anulacion para
    comprobar que la lista hace trabajo— y ``prune=None`` toma la de por
    defecto. Son dos cosas distintas y por eso no comparten valor.
    """
    prune_set = set(DEFAULT_PRUNE if prune is None else prune)
    root_path = pathlib.Path(root)
    result = ScanResult()

    if not root_path.is_dir():
        result.complete = False
        result.reason = f"no existe o no es un directorio: {root_path}"
        return result

    started = time.monotonic()
    for current, dirnames, filenames in os.walk(root_path, followlinks=False):
        # La poda se aplica IN SITU sobre `dirnames`: es lo unico que impide
        # que `os.walk` descienda. Filtrar despues no ahorra el recorrido.
        dirnames[:] = [d for d in dirnames if d not in prune_set]

        for entry in dirnames + filenames:
            result.visited += 1
            if result.visited > max_entries:
                result.complete = False
                result.reason = "max_entries"
                break
            if fnmatch.fnmatch(entry, name) and entry in filenames:
                result.paths.append(str(pathlib.Path(current) / entry))

        result.elapsed = time.monotonic() - started
        if not result.complete:
            break
        if result.elapsed >= deadline:
            result.complete = False
            result.reason = "deadline"
            break

    result.elapsed = time.monotonic() - started
    return result


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada. Imprime rutas por stdout y el corte por stderr."""
    parser = argparse.ArgumentParser(
        description="recorrido de arbol acotado: poda, tope de entradas y plazo")
    parser.add_argument("root", help="la raiz a recorrer")
    parser.add_argument("--name", default="*", help="patron fnmatch del nombre")
    parser.add_argument("--max-entries", type=int, default=DEFAULT_MAX_ENTRIES)
    parser.add_argument("--deadline", type=float, default=DEFAULT_DEADLINE)
    parser.add_argument("--prune", action="append", default=[],
                        help="directorio adicional a podar; repetible")
    parser.add_argument("--no-default-prune", action="store_true",
                        help="recorre TODO, incluido node_modules y .git")
    args = parser.parse_args(argv)

    if args.no_default_prune:
        prune: tuple[str, ...] = tuple(args.prune)
    else:
        prune = tuple(DEFAULT_PRUNE) + tuple(args.prune)

    result = walk(args.root, name=args.name, prune=prune,
                  max_entries=args.max_entries, deadline=args.deadline)

    for path in result.paths:
        print(path)

    if result.exit_code == EXIT_REFUSED:
        print(f"bounded_scan: {result.reason}", file=sys.stderr)
    elif not result.complete:
        # El aviso va a stderr para no mezclarse con las rutas, y nombra la
        # cota que mordio: sin eso, subir la cota es adivinar cual.
        print(f"bounded_scan: SALIDA PARCIAL — se agoto «{result.reason}» "
              f"tras {result.visited} entradas y {result.elapsed:.1f}s. "
              f"Las {len(result.paths)} rutas de arriba NO son todas.",
              file=sys.stderr)

    return result.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
