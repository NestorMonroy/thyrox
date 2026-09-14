"""La familia `jobs` — un run por trabajo en segundo plano, con su manifiesto.

El defecto que cierra está medido: `bg.sh` escribía `<BG_DIR>/<nombre>.log`
plano. Cinco trabajos de una sesión dejaron cinco `.log` sueltos en un mismo
directorio —`suite-thyrox`, `suite-tras-gate`, `gate-sucesor`, `diag-rojos`,
`diag2`— sin manifiesto, sin fecha en el nombre y sin nada que diga qué
preguntaba cada uno ni qué NO podía ver. Dos ejecuciones del mismo nombre se
pisaban la una a la otra.

Es exactamente el defecto que `workbench` ya resolvió para la evidencia, y por
eso esta familia **lo reusa en vez de calcarlo**:

- el identificador de run sale de `workbench.manifest.run_id_for` — un segundo
  acuñador daría dos gramáticas de fecha que nadie sincroniza;
- las cinco claves son `workbench.manifest.REQUIRED_KEYS`, no una lista propia;
- el hogar lo resuelve `workbench.paths`, que ya sabe distinguir el clon.

Lo que NO se hereda, y es la razón de que sea familia aparte: el workbench aloja
**evidencia versionable** y esto aloja **la salida de un proceso**, que es
volumen y muere con el contenedor si nadie la promueve. Por eso su hogar por
defecto es hermano y no el mismo — mezclarlos ensuciaría el banco con logs.

## Andamiar omite lo que no consta

Un run recién andamiado declara `instrument` —el comando, que sí se conoce al
lanzar— y **omite las otras cuatro**. Omitir no es lo mismo que rellenar: un
placeholder pasa el check de presencia y se lee como dato, mientras que una
clave ausente la nombra el gate. Un run sin `question` ni `blind_to` **no es
conforme**, y ése es el estado correcto hasta que alguien recoge su resultado.
"""
from __future__ import annotations

import json
import pathlib
from collections.abc import Sequence
from datetime import datetime, timezone

from workbench import paths as wb_paths
from workbench.manifest import (  # noqa: F401  (se reexportan a propósito)
    MANIFEST_FILE_NAME,
    REQUIRED_KEYS,
    latest_run,
    run_id_date,
    run_id_for,
    runs_for,
)

#: El hogar declarado directamente, cuando el consumidor lo decide.
#:
#: Es GLOBAL: una sola grafia para todos los arboles. Vale cuando la invocacion
#: toca un solo repositorio; no vale para una sesion que cruza varios, y por eso
#: existe la familia de abajo.
JOBS_DIR_VAR = "THYROX_JOBS_DIR"

#: El prefijo de la familia POR CLON: ``api`` -> ``THYROX_JOBS_API``.
#:
#: La grafia es la de sus dos hermanas —``THYROX_WORKBENCH_<CLONE>`` y
#: ``THYROX_RULES_<CLONE>``— y la eleccion NO es de simetria. Se midio contra la
#: alternativa ``<CLONE>_JOBS_DIR`` y pierde por tres:
#:
#: - el arbol ya tiene TRES composiciones ``THYROX_<FAMILY>_<CLONE>`` (workbench,
#:   rules, reach); la otra seria una cuarta gramatica;
#: - el prefijo ``API_`` ya esta tomado en el multi-repo con OTRO significado:
#:   ``API_URL`` y ``API_PROXY_TARGET`` de ``kaupamex-ui`` nombran el backend
#:   con el que habla la UI, no el clon ``api``;
#: - ``verify/check_env_contract_keys.py`` declara ``PREFIX = "THYROX_"``, asi
#:   que una clave fuera del prefijo es **invisible al gate**: ni se cuenta ni
#:   se exige declarar en ``.env.example``. Su conteo saldria sano midiendo un
#:   universo del que esta clave quedo fuera.
#:
#: Comparte con ``JOBS_DIR_VAR`` los mismos caracteres iniciales, igual que la
#: familia del banco con ``THYROX_WORKBENCH_DIR``: un clon llamado ``dir``
#: colisionaria. No existe, y el precedente ya lo acepta.
JOBS_CLONE_PREFIX = "THYROX_JOBS_"

#: El segmento por defecto bajo el directorio de estado: hermano de
#: `workbench`, no el mismo. La salida de un proceso es volumen; la evidencia
#: es lo que alguien promovió a partir de ella.
JOBS_DIR_DEFAULT = "jobs"

#: Los subdirectorios del run. `outputs` es el único obligatorio —ahí nace el
#: log—; `probes` aloja lo que se escriba para diagnosticar el propio trabajo.
SCAFFOLD_SUBDIRS: tuple[str, ...] = ("outputs", "probes")

#: El nombre del log dentro del run. Uno solo: el trabajo es uno.
LOG_FILE_NAME = "salida.log"


def jobs_home_name(repo: str) -> str:
    """La constante por raiz: ``api`` -> ``THYROX_JOBS_API``.

    Misma regla de composicion que ``workbench.paths.workbench_home_name`` y
    ``reach.env_names``, y por la misma razon: **un solo proceso resuelve varios
    arboles**, y una variable global no puede decir dos verdades a la vez.
    """
    return f"{JOBS_CLONE_PREFIX}{repo.upper().replace('-', '_')}"


def jobs_dir(start: str | pathlib.Path | None = None) -> pathlib.Path:
    """El hogar de la familia: el declarado por clon, el global, o el hermano.

    No compone la raíz por aritmética de `__file__` —eso describe dónde vivía
    el archivo, no dónde corre—: la saca de `workbench.paths`, que ya resuelve
    el consumidor y su directorio de estado.

    **Leia `os.environ` directamente, y eso era la mitad del defecto.** La
    entrada 2 de la DEC-04 —el `.env`, que es lo unico que `write-env.sh` puede
    escribir— quedaba invisible para esta familia: un consumidor podia declarar
    su hogar en el archivo y esta funcion no lo veia. `env_value` consulta el
    proceso primero y el archivo despues, que es el orden del contrato.

    **Y no tenia familia por clon.** El coste esta medido: la corrida
    `migrate-desde-cero-20260910T073715`, que es evidencia de `api`, nacio en
    `thyrox/.claude/jobs/` —el arbol del PROVEEDOR— sin que nada avisara. Es el
    mismo fallo silencioso que L-028 registro para el banco («once bancos
    aterrizaron en el arbol del proveedor por esa via») y que la familia
    `THYROX_WORKBENCH_<CLONE>` cerro para el banco y no para los trabajos.
    """
    from paths.reach import (  # noqa: PLC0415 — evita el ciclo de import
        ConsumerUnknownError, consumer_root, env_value, resolve_home,
        root as repo_root,
    )

    # UN ancla para toda la resolucion. Habia dos: el clon se derivaba del
    # `cwd` y el `.env` se buscaba desde la ubicacion del modulo. Con `bg.sh`
    # —que llama sin `start`— eso derivaba `api` desde el `cwd` y leia el `.env`
    # del PROVEEDOR, donde la clave del consumidor no esta ni debe estar: la
    # declaracion era invisible justo por la via por la que se usa.
    ancla = pathlib.Path(start) if start else pathlib.Path.cwd()

    # La familia POR CLON gana sobre la global: la declaracion mas especifica
    # manda, y es lo unico que impide que una variable exportada para un arbol
    # se aplique a otro. Ver `jobs_home_name`.
    repo = wb_paths.repo_of(ancla)
    if repo:
        per_clone = env_value(jobs_home_name(repo), ancla)
        if per_clone:
            return resolve_home(per_clone, repo_root(repo))

    declared = env_value(JOBS_DIR_VAR, ancla)
    if declared:
        # Pasa por `resolve_home` por la misma razon que en el banco: como
        # SEGMENTO relativo —`jobs`— la clave dice «en cada clon, este
        # subdirectorio», y devuelta cruda resolvia contra el CWD, que es el
        # defecto home-by-cwd de #284/#286. Sin ancla se devuelve cruda: una
        # relativa no se puede componer contra un arbol que este modulo elija
        # por su cuenta.
        try:
            return resolve_home(declared, consumer_root(start=ancla))
        except ConsumerUnknownError:
            return pathlib.Path(declared)

    return pathlib.Path(wb_paths.state_dir(start)) / JOBS_DIR_DEFAULT


def log_path(run_dir: str | pathlib.Path) -> pathlib.Path:
    """Dónde nace el log de este run — DENTRO, nunca al lado."""
    return pathlib.Path(run_dir) / "outputs" / LOG_FILE_NAME


def scaffold_run(
    base_dir: str | pathlib.Path,
    slug: str,
    command: str | None = None,
    now: datetime | None = None,
) -> pathlib.Path:
    """Crea el run del trabajo y devuelve su ruta."""
    run_dir = pathlib.Path(base_dir) / run_id_for(slug, now)
    run_dir.mkdir(parents=True, exist_ok=True)
    for sub in SCAFFOLD_SUBDIRS:
        (run_dir / sub).mkdir(exist_ok=True)

    manifiesto: dict[str, object] = {}
    if command is not None:
        manifiesto["instrument"] = command
    # El reloj arranca aqui y no en `settle`: sin `started_at` la duracion solo
    # se puede inferir de la mtime del log, que mide la ULTIMA escritura y no el
    # arranque — un trabajo que calla al final se leeria como mas corto.
    manifiesto["started_at"] = (now or datetime.now(timezone.utc)).isoformat(timespec="seconds")
    (run_dir / MANIFEST_FILE_NAME).write_text(
        json.dumps(manifiesto, indent=2) + "\n", encoding="utf-8")

    (run_dir / "README.md").write_text("\n".join([
        f"# {slug}", "",
        "## Qué se lanzó", "",
        f"```\n{command or '<sin declarar>'}\n```", "",
        "## Qué se preguntaba", "", "<!-- la clave `question` del manifiesto -->", "",
        "## Qué se recogió", "",
        "*Metrica:*", "*Ciega a:*", "",
    ]), encoding="utf-8")
    return run_dir


def read_manifest(run_dir: str | pathlib.Path) -> dict:
    ruta = pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    if not ruta.exists():
        return {}
    return json.loads(ruta.read_text(encoding="utf-8"))


def missing_keys(run_dir: str | pathlib.Path) -> list[str]:
    """Las claves obligatorias que este run aún no declara.

    Su lista vacía es lo que hace conforme al run; mientras tenga elementos, el
    trabajo se lanzó y su resultado no se ha interpretado.
    """
    presentes = read_manifest(run_dir)
    return [k for k in REQUIRED_KEYS if k not in presentes]


def settle(run_dir: str | pathlib.Path, exit_code: int,
           now: datetime | None = None) -> pathlib.Path:
    """Asienta el código de salida donde el manifiesto se lee.

    El `__BG_EXIT__` del log sigue estando —es lo que la barrera consume— pero
    un lector del manifiesto no debería tener que abrir el log para saber si el
    trabajo terminó bien.
    """
    ruta = pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    manifiesto = read_manifest(run_dir)
    manifiesto["exit_code"] = exit_code
    fin = now or datetime.now(timezone.utc)
    manifiesto["finished_at"] = fin.isoformat(timespec="seconds")
    inicio = manifiesto.get("started_at")
    if isinstance(inicio, str):
        # Un run andamiado antes de que `started_at` existiera no tiene con qué
        # restar: se omite la clave en vez de escribir un 0, que no distinguiría
        # «tardó nada» de «no se midió».
        manifiesto["duration_seconds"] = max(
            0.0, (fin - datetime.fromisoformat(inicio)).total_seconds())
    ruta.write_text(json.dumps(manifiesto, indent=2) + "\n", encoding="utf-8")
    return ruta


def duration_distribution(durations: Sequence[float]) -> dict:
    """La distribución de duraciones, con sus operandos — no sólo el total.

    Un lote de N trabajos repartido entre C servidores NO tarda ``total/C``: no
    se puede bajar de la pieza más larga. Por eso el cociente solo no basta y el
    resultado publica ``max`` junto a ``total`` — dos poblaciones con la MISMA
    suma y dispersión opuesta reparten de forma distinta, y una media las
    volvería indistinguibles.

    Es el `seq_length.py` del tutorial aplicado al reloj: la distribución se
    mide antes de decidir cómo se procesa, no después.

    ``floor_wall_clock(C)`` es el **suelo** del reloj de pared, no una
    predicción: ``max(total/C, max(t))``. Nada por debajo es alcanzable; por
    encima queda todo lo que este instrumento no ve.
    """
    if not durations:
        raise ValueError(
            "distribución sin medición: población vacía. Un 0 aquí no "
            "distinguiría «ningún trabajo tardó nada» de «no hay medición».")
    ordenadas = sorted(float(d) for d in durations)
    n = len(ordenadas)
    mitad = n // 2
    mediana = (ordenadas[mitad] if n % 2
               else (ordenadas[mitad - 1] + ordenadas[mitad]) / 2)
    total, mayor = sum(ordenadas), ordenadas[-1]
    return {
        "n": n,
        "total": total,
        "min": ordenadas[0],
        "median": mediana,
        "max": mayor,
        "floor_wall_clock": lambda width: max(total / width, mayor),
    }
