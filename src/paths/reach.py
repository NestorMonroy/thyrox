#!/usr/bin/env python3
"""Las raíces del ALCANCE — declaradas una vez, resueltas al consultarlas.

Porte de ``kaupamex-docs: .claude/scripts/reach_roots.py`` a THYROX. La razón
del mecanismo no cambia y se conserva de la fuente: *cada gate con su copia de
la ruta es exactamente la segunda fuente de verdad que
``calibration-verified-numbers.md`` prohíbe, y su modo de fallo es silencioso:
un gate que apunta a una raíz vacía publica «0 incumplidores» y parece sano*.
Ese cero ya se pagó una vez (``H-API-335``).

El nombre sale de medir la referencia por el **flujo**, no por su literal: el
binario 2.1.261 llama a esto ``reach`` / ``reachRoots`` / ``extraReachRoots``.
Y su elección de palabra es la lección: no nombra la relación entre las
ubicaciones —hermanas, de un monorepo— sino la del proceso con ellas: hasta
dónde alcanza.

Qué cambia respecto de la fuente, y por qué
-------------------------------------------

Un porte que copiara la forma tal cual heredaría tres defectos ya medidos. Cada
divergencia responde a uno, ninguna es preferencia:

1. **``REPOS_ROOT`` deja de ser una constante de módulo y pasa a ser**
   ``tree_root(start=...)``. Dos razones que se acumulan. La primera es que una
   constante se evalúa **al importar**: un consumidor que declare la variable
   después del ``import`` no la ve, y ningún test puede variarla — el mecanismo
   era, literalmente, no comprobable. La segunda es que su algoritmo era un
   **offset fijo** (``parents[2].parent``) que sólo acierta a UNA profundidad;
   moverlo a ``thyrox/src/paths/`` cambia la profundidad y el acierto se pierde
   sin que nada lo note.

   El sustituto es **ascenso con detección**, que es el algoritmo que
   ``docsRoot()`` ya usa en nuestro harness: subir nivel a nivel probando si
   este directorio contiene alguno de los clones declarados. No depende de
   cuántos niveles haya entre el guion y la raíz, así que sobrevive un refactor
   de anidamiento.

2. **``root(repo)`` LEE su constante por raíz.** En la fuente, ``_env_name``
   sólo se usa para **exportar** con ``--env`` y nunca para **leer**: declarar
   ``KAUPAMEX_API`` no cambiaba nada, y el control lo confirmó (:ref:`h-docs-1070`).
   Aquí la constante por raíz es el primer eslabón de la cadena.

3. **La grafía del árbol es UNA tupla ordenada declarada** (``TREE_ROOT_VARS``)
   en vez de cuatro grafías que cada guion inventaba por su cuenta
   (:ref:`h-docs-1071`). Aceptar más de un nombre **en orden escrito** no es
   aquel defecto: es su reparación, porque el orden es auditable y vive en un
   solo sitio. Cuál va primera es la decisión pendiente del ejecutor sobre el
   nombre —``KAUPAMEX_ROOT`` (nombrar el destino, convención de este árbol) vs.
   una forma prefijada por THYROX (nombrar al lector, convención de la
   referencia)—; hoy la tupla preserva el statu quo y cambiarla es reordenar
   una línea, no rediseñar.

La precedencia
--------------

De lo más específico a lo más derivado. El criterio no es preferencia: una ruta
que alguien escribió a propósito no puede quedar anulada por una derivación,
porque eso descarta el único dato deliberado del conjunto::

    KAUPAMEX_<RAIZ> en el proceso     ->  la ruta, tal cual
    KAUPAMEX_<RAIZ> en el .env        ->  la ruta, tal cual
    <TREE_ROOT_VARS> en el proceso    ->  <arbol>/kaupamex-<raiz>
    <TREE_ROOT_VARS> en el .env       ->  <arbol>/kaupamex-<raiz>
    ascenso con deteccion             ->  <arbol>/kaupamex-<raiz>

El archivo ``.env``
-------------------

Se analiza aquí, sin librería de terceros, y eso **está medido, no elegido**:
``python-dotenv`` no está instalado ni en el ``python3`` del sistema ni en el
venv de ``api``, y los gates se invocan con ``python3`` pelado. Una dependencia
de terceros en el módulo que **todos** importan convertiría a cada consumidor
en un rehúse por precondición ausente.

Desde shell, que no puede importar el módulo::

    eval "$(python3 src/paths/reach.py --env)"

Métrica: las cinco raíces declaradas en ``REACH_ROOTS``, más el tramo extra.
Ciega a: un clon que exista en disco y no esté declarado —el conjunto es una
decisión, no un descubrimiento—; a que la ruta declarada sea un repositorio git
de verdad (``require_all()`` comprueba que el directorio exista, no que sea un
clon válido); y a la interpolación dentro del ``.env`` (``${OTRA}``), que el
analizador NO expande.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

#: Las raíces DECLARADAS, en orden estable. El orden es parte del contrato: un
#: consumidor que itere y escriba un artefacto no debe producir diffs por
#: reordenamiento.
#:
#: Es el análogo de ``reachRoots`` en la referencia — lo declarado, por
#: oposición al conjunto resuelto que ``reach()`` devuelve.
REACH_ROOTS: tuple[str, ...] = ("api", "db", "docs", "server", "ui")

#: El prefijo del nombre de clon. Vive aquí y no repetido en cada consumidor
#: porque el rename ``e-comerce-*`` -> ``kaupamex-*`` (DEC-KX-06) ya demostró
#: que cambia.
CLONE_PREFIX = "kaupamex-"

#: Las grafías del árbol, EN ORDEN. Gana la primera declarada. Ver la nota 3 de
#: la cabecera: una tupla ordenada en un sitio es lo contrario de cuatro
#: grafías inventadas por cuatro guiones.
TREE_ROOT_VARS: tuple[str, ...] = ("KAUPAMEX_ROOT", "THYROX_ROOT")

#: La variable del tramo extensible, análoga a ``extraReachRoots``. Separada
#: por ``:`` como ``PATH``, que es la convención que un consumidor de shell
#: espera.
EXTRA_ROOTS_VAR = "KAUPAMEX_EXTRA_ROOTS"

#: Dónde buscar el archivo de entorno, si no se declara uno explícito.
ENV_FILE_VAR = "THYROX_ENV_FILE"
ENV_FILE_NAME = ".env"


class ReachRootError(RuntimeError):
    """Una raíz del alcance no cumple su contrato.

    Es un tipo propio y no un ``FileNotFoundError`` para que un consumidor
    pueda distinguir «el alcance no es válido» de «no encontré este archivo»,
    que son fallos con conductas distintas: el primero invalida la medición
    entera, el segundo puede ser un dato ausente legítimo.
    """


def read_env_file(path: Path) -> dict[str, str]:
    """Analiza un ``.env`` y devuelve sus pares, sin librería de terceros.

    Cubre lo que un ``.env`` de este árbol usa: comentarios, líneas en blanco,
    el prefijo ``export`` y comillas simples o dobles alrededor del valor. Una
    línea sin ``=`` se descarta en silencio — es el modo de fallo correcto para
    un archivo que un humano edita a mano, porque rehusar el archivo entero por
    una línea suelta dejaría al consumidor sin ninguna de las buenas.

    No expande ``${OTRA}``: la interpolación es una segunda gramática, y
    añadirla sin un consumidor que la pida sería inventar superficie.
    """
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def env_file_path(start: Path | None = None) -> Path | None:
    """El ``.env`` que gobierna, o ``None``.

    Primero el declarado por ``THYROX_ENV_FILE``; si no, el primero que aparezca
    ascendiendo desde ``start``. El ascenso es el mismo criterio que el de
    ``tree_root()`` y por la misma razón: no depende de la profundidad a la que
    viva el consumidor.
    """
    declared = os.environ.get(ENV_FILE_VAR)
    if declared:
        candidate = Path(declared)
        return candidate if candidate.is_file() else None
    here = (start or Path(__file__).resolve().parent).resolve()
    for level in (here, *here.parents):
        candidate = level / ENV_FILE_NAME
        if candidate.is_file():
            return candidate
    return None


def env_value(name: str, start: Path | None = None) -> str | None:
    """El valor de una variable: primero el proceso, después el ``.env``.

    El proceso gana porque es la declaración más inmediata: quien exporta una
    variable para UNA invocación está corrigiendo, a propósito, lo que el
    archivo dice para todas.
    """
    from_process = os.environ.get(name)
    if from_process:
        return from_process
    path = env_file_path(start)
    if path is None:
        return None
    return read_env_file(path).get(name) or None


def clone_name(repo: str) -> str:
    """El nombre largo del clon: ``api`` -> ``kaupamex-api``."""
    if repo not in REACH_ROOTS:
        raise KeyError(
            f"raíz desconocida: {repo!r}. Las declaradas son {list(REACH_ROOTS)}."
        )
    return f"{CLONE_PREFIX}{repo}"


def clone_names() -> tuple[str, ...]:
    """Los nombres largos de las raíces declaradas, en su orden."""
    return tuple(clone_name(r) for r in REACH_ROOTS)


def env_name(repo: str) -> str:
    """La constante por raíz: ``api`` -> ``KAUPAMEX_API``.

    Pública, a diferencia de la fuente, donde era ``_env_name`` porque su único
    consumidor era ``--env``. Aquí la LEE ``root()``, así que forma parte del
    contrato: un consumidor que quiera declarar una raíz necesita saber cómo se
    llama su variable sin reconstruir la regla.
    """
    return f"KAUPAMEX_{repo.upper().replace('-', '_')}"


def tree_root(start: Path | None = None) -> Path:
    """El padre de los clones, por variable declarada o por ascenso.

    ``start`` es un parámetro y no ``__file__`` a propósito: es la diferencia
    entre un mecanismo comprobable a cualquier profundidad y uno que sólo
    acierta desde donde su autor lo escribió.
    """
    for var in TREE_ROOT_VARS:
        declared = env_value(var, start)
        if declared:
            return Path(declared)
    here = (start or Path(__file__).resolve().parent).resolve()
    for level in (here, *here.parents):
        if any((level / name).is_dir() for name in clone_names()):
            return level
    raise ReachRootError(
        f"no se pudo derivar el padre de los clones ascendiendo desde {here}. "
        f"Ninguno de {list(clone_names())} apareció en ningún nivel. Declara "
        f"{TREE_ROOT_VARS[0]} o invoca desde dentro del árbol."
    )


def root(repo: str, start: Path | None = None) -> Path:
    """La ruta absoluta de una raíz declarada, por la cadena de precedencia.

    NO comprueba que exista: un consumidor que sólo necesita construir una ruta
    no debe pagar una llamada al sistema de archivos por cada raíz. Quien mida
    sobre todas usa ``require_all()``.
    """
    name = clone_name(repo)          # valida el repo antes de mirar el entorno
    declared = env_value(env_name(repo), start)
    if declared:
        return Path(declared)
    return tree_root(start) / name


def roots(start: Path | None = None) -> dict[str, Path]:
    """Sólo las DECLARADAS, sin el tramo extra.

    Es la vista hermana de ``reach()``. La referencia mantiene las dos
    coexistiendo (``roots:r, reach:{…}``) porque un consumidor que quiera saber
    qué vino de la declaración no puede deducirlo del conjunto resuelto.
    """
    return {r: root(r, start) for r in REACH_ROOTS}


def extra_roots() -> dict[str, Path]:
    """El tramo extensible, leído del entorno — el análogo de ``extraReachRoots``.

    Cada ruta debe ser **absoluta**: es la verificación que la referencia hace
    con ``.some(f => !f.startsWith("/"))``. Sin ella, el tramo extra sería la
    vía por la que una ruta relativa entra al conjunto, y el consumidor la
    resolvería contra su propio directorio de trabajo — que es distinto en cada
    llamador.
    """
    raw = os.environ.get(EXTRA_ROOTS_VAR, "")
    result: dict[str, Path] = {}
    for piece in (p for p in raw.split(":") if p):
        if not piece.startswith("/"):
            raise ReachRootError(
                f"la raíz extra {piece!r} no es absoluta. {EXTRA_ROOTS_VAR} las "
                "exige absolutas: una relativa se resolvería contra el "
                "directorio de trabajo de cada consumidor, que es distinto."
            )
        result[Path(piece).name] = Path(piece)
    return result


def reach(start: Path | None = None) -> dict[str, Path]:
    """El conjunto RESUELTO: las declaradas más el tramo extra.

    Es lo que un consumidor recorre. La distinción con ``roots()`` no es
    cosmética: sin ella nadie puede saber qué raíz vino de la declaración y
    cuál de una anulación del entorno.
    """
    return {**roots(start), **extra_roots()}


def paths(start: Path | None = None) -> tuple[Path, ...]:
    """Las rutas del conjunto resuelto, en orden."""
    return tuple(reach(start).values())


def require_all(start: Path | None = None) -> dict[str, Path]:
    """El conjunto resuelto, o un error que nombra lo que falta.

    Es la mitad que impide el cero silencioso. Un gate multi-raíz que reciba un
    conjunto incompleto mide menos de lo que cree y publica un conteo que
    parece sano — el sub-patrón D de ``metrica-decide-la-conclusion.md``
    aplicado a la precondición en vez de al resultado.
    """
    mapping = reach(start)
    missing = [r for r, p in mapping.items() if not p.is_dir()]
    if missing:
        raise ReachRootError(
            f"{len(missing)} de {len(mapping)} raíces del alcance no existen: "
            f"{', '.join(missing)}. "
            "NO se devuelve un conjunto corto: un consumidor que midiera sobre "
            "él publicaría un conteo que parece sano (H-API-335)."
        )
    return mapping


def main(argv: list[str]) -> int:
    mode = argv[1] if len(argv) > 1 else "--list"

    if mode == "--env":
        # Para `eval` desde shell. Se citan las rutas: un padre con espacios
        # partiría la asignación en dos palabras sin que nada avise.
        for repo, path in reach().items():
            print(f'export {env_name(repo) if repo in REACH_ROOTS else repo.upper()}="{path}"')
        return 0

    if mode == "--paths":
        for path in paths():
            print(path)
        return 0

    if mode == "--names":
        for name in clone_names():
            print(name)
        return 0

    if mode == "--declared":
        # Sólo las declaradas — la vista hermana, para quien necesite saber qué
        # vino de la declaración y qué del entorno.
        for path in roots().values():
            print(path)
        return 0

    if mode == "--check":
        try:
            mapping = require_all()
        except ReachRootError as err:
            print(f"reach: {err}", file=sys.stderr)
            return 2
        print(f"las {len(mapping)} raíces del alcance existen bajo {tree_root()}")
        return 0

    if mode == "--list":
        source = "derivado"
        for var in TREE_ROOT_VARS:
            if env_value(var):
                source = var
                break
        env_path = env_file_path()
        print(f"padre: {tree_root()}  ({source})")
        print(f"archivo de entorno: {env_path or 'ninguno'}")
        declared = set(roots())
        for repo, path in reach().items():
            mark = "" if path.is_dir() else "   AUSENTE"
            origin = "" if repo in declared else "   (extra)"
            print(f"  {repo:8} {path}{origin}{mark}")
        return 0

    print(
        f"reach: modo desconocido: {mode}\n"
        "  --list (default) · --env · --paths · --declared · --names · --check",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
