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

#: Las grafías del árbol, EN ORDEN. Gana la primera declarada.
#:
#: El orden lo decide la referencia, no el gusto. Medido en el volcado del
#: ejecutable 2.1.261: el cliente nombra sus variables **por su propio
#: producto**, nunca por lo que apuntan — ``CLAUDE_PLUGIN_ROOT`` (49),
#: ``CLAUDE_STAGE_FILE_ROOT`` (11), ``CLAUDE_CODE_TEST_FIXTURES_ROOT`` (4).
#: Las que nombran el destino sin ese prefijo son de **otras** herramientas
#: (``ANDROID_SDK_ROOT``, ``DOTNET_ROOT``, ``GOENV_ROOT``).
#:
#: La forma es ``<PRODUCTO>_<QUE ES>_ROOT``, y ``reach`` es la palabra del
#: propio binario para este mecanismo. De ahí ``THYROX_REACH_ROOT``.
#:
#: ``KAUPAMEX_ROOT`` queda de segunda y no por cortesía: **15 sitios vivos la
#: declaran**. Retirarla rompería a los consumidores de docs el día que
#: migren. Es la diferencia con los alias en español que se retiraron del
#: workbench, que tenían **cero**.
TREE_ROOT_VARS: tuple[str, ...] = ("THYROX_REACH_ROOT", "KAUPAMEX_ROOT")

#: Las grafías del tramo extensible, EN ORDEN — el análogo de
#: ``extraReachRoots``. Separadas por ``:`` como ``PATH``, que es la convención
#: que un consumidor de shell espera. Mismo criterio de orden que
#: ``TREE_ROOT_VARS``.
EXTRA_ROOTS_VARS: tuple[str, ...] = ("THYROX_EXTRA_REACH_ROOTS", "KAUPAMEX_EXTRA_ROOTS")

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


def env_names(repo: str) -> tuple[str, ...]:
    """Las constantes por raíz, EN ORDEN: ``api`` -> ``THYROX_REACH_API``.

    Públicas, a diferencia de la fuente, donde ``_env_name`` era privada porque
    su único consumidor era ``--env``. Aquí las LEE ``root()``, así que forman
    parte del contrato: quien quiera declarar una raíz necesita saber cómo se
    llama su variable sin reconstruir la regla.

    Mismo orden y misma razón que ``TREE_ROOT_VARS``: primero la del lector,
    después la heredada, que tiene consumidores vivos.
    """
    suffix = repo.upper().replace("-", "_")
    return tuple(f"{var.removesuffix('_ROOT')}_{suffix}" if var.endswith("_ROOT")
                 else f"{var}_{suffix}"
                 for var in ("THYROX_REACH_ROOT", "KAUPAMEX"))


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


#: La variable que declara la raíz de THYROX mismo — la que ``install.sh``
#: escribe en el ``.env`` de cada consumidor. Es hermana de ``TREE_ROOT_VARS``
#: y NO se mezcla con ellas: aquéllas nombran el padre de los clones
#: ``kaupamex-*``; ésta nombra el proveedor.
THYROX_ROOT_VAR = "THYROX_ROOT"

#: El marcador por el que se reconoce la raíz de thyrox al ascender. Es un
#: ARCHIVO y no el nombre del directorio a propósito: un clon renombrado o
#: copiado sigue siendo thyrox, y un directorio que se llame ``thyrox`` sin su
#: mecanismo dentro no lo es. Lo mismo que ``clone_names()`` hace para el
#: árbol, pero con la evidencia dentro en vez del rótulo fuera.
THYROX_MARKER = Path("src") / "paths" / "reach.py"


def thyrox_root(start: Path | None = None) -> Path:
    """La raíz de THYROX mismo, por variable declarada o por ascenso.

    Cierra el hueco que la aritmética de ruta dejaba abierto: hasta hoy,
    localizar thyrox desde uno de sus propios archivos se hacía con
    ``Path(__file__).resolve().parents[N]`` —34 veces en ``tests/`` y 51 en
    ``src/``—, y esa forma falla **en silencio** al mover el archivo un nivel.
    Medido en H-DOCS-1103: un guion resolvía ``parents[3]/'tools'`` y apuntaba
    a ``/home/user/tools/``, un directorio que nunca existió.

    La precedencia es la que ``install.sh`` ya escribe, y en el mismo orden:
    la variable del proceso, la declaración del ``.env``, y sólo entonces el
    ascenso. ``start`` es un parámetro y no ``__file__`` por la misma razón que
    en ``tree_root``: un mecanismo comprobable a cualquier profundidad, no uno
    que sólo acierta desde donde su autor lo escribió.
    """
    declared = env_value(THYROX_ROOT_VAR, start)
    if declared:
        return Path(declared)
    here = (start or Path(__file__).resolve().parent).resolve()
    for level in (here, *here.parents):
        if (level / THYROX_MARKER).is_file():
            return level

    # Tercer paso: preguntarle al mecanismo multi-repo. Desde un consumidor el
    # ascenso NUNCA llega —thyrox es su HERMANO, no su ancestro; medido desde
    # /home/user/kaupamex-api, rehúsa— pero ``tree_root`` ya sabe dónde está el
    # padre de los clones, y ahí thyrox es un hijo más. Exigir la variable
    # declarada era pedir un parámetro que el mecanismo podía derivar.
    #
    # El hermano se valida por el MARCADOR, no por su nombre: un directorio
    # llamado ``thyrox`` sin el mecanismo dentro no lo es, y uno renombrado
    # sigue siéndolo. Es el mismo criterio que el paso anterior.
    try:
        tree = tree_root(start)
    except ReachRootError:
        tree = None
    if tree is not None:
        for sibling in sorted(tree.iterdir()) if tree.is_dir() else ():
            if sibling.is_dir() and (sibling / THYROX_MARKER).is_file():
                return sibling

    raise ReachRootError(
        f"no se pudo derivar la raíz de thyrox desde {here}: ni la variable "
        f"{THYROX_ROOT_VAR}, ni el ascenso por {THYROX_MARKER}, ni un hermano "
        f"de los clones con ese marcador. Declara {THYROX_ROOT_VAR} o clona "
        f"thyrox junto a los repos del árbol."
    )


def root(repo: str, start: Path | None = None) -> Path:
    """La ruta absoluta de una raíz declarada, por la cadena de precedencia.

    NO comprueba que exista: un consumidor que sólo necesita construir una ruta
    no debe pagar una llamada al sistema de archivos por cada raíz. Quien mida
    sobre todas usa ``require_all()``.
    """
    name = clone_name(repo)          # valida el repo antes de mirar el entorno
    for var in env_names(repo):
        declared = env_value(var, start)
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
    raw = next((os.environ[v] for v in EXTRA_ROOTS_VARS if os.environ.get(v)), "")
    result: dict[str, Path] = {}
    for piece in (p for p in raw.split(":") if p):
        if not piece.startswith("/"):
            raise ReachRootError(
                f"la raíz extra {piece!r} no es absoluta. {EXTRA_ROOTS_VARS[0]} las "
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
            print(f'export {env_names(repo)[0] if repo in REACH_ROOTS else repo.upper()}="{path}"')
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


def _run(argv: list[str]) -> int:
    """``main`` con la tubería cerrada tratada como lo que es: conducta normal.

    Un consumidor que escribe ``reach.py --list | head -3`` cierra el pipe antes
    de que el guion termine. Sin tratarlo, Python vuelca un ``BrokenPipeError``
    por ``stderr`` **y además** el intérprete intenta vaciar ``stdout`` al salir
    y vuelca un segundo aviso. Los dos se leen como fallo del mecanismo cuando
    no lo son.

    El código 141 es el convenio de shell para «terminado por SIGPIPE»
    (128 + 13), que es lo que un consumidor espera de una tubería cortada.
    """
    try:
        code = main(argv)
        sys.stdout.flush()
        return code
    except BrokenPipeError:
        # Se redirige el descriptor a /dev/null para que el vaciado final del
        # intérprete no vuelva a fallar sobre el pipe ya cerrado.
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 141


if __name__ == "__main__":
    raise SystemExit(_run(sys.argv))
