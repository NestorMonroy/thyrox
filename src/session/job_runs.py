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
    LEGACY_MANIFEST_FILE_NAME,
    MANIFEST_FILE_NAME,
    manifest_line,
    read_manifest_file,
    read_manifest_lines,
    render_manifest,
    resolve_manifest,
    REQUIRED_KEYS,
    latest_run,
    run_id_date,
    run_id_for,
    runs_for,
)
from paths.reach import creates_home  # noqa: E402 — reach no importa nada del proyecto al tope

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


@creates_home
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


# La clave con que un run declara que sus salidas NO viven dentro de él, sino
# en un hogar plano `<flat_home>/<slug>.log`. Existe porque `bg.sh --dir` tiene
# dos consumidores con conocimiento asimétrico: quien LANZA sabe el hogar y
# quien LEE —`status`, `log`, `register`— no tenía de dónde sacarlo, así que
# respondía `unknown` sobre un trabajo terminado. El run es el puntero que
# cierra esa asimetría; el log sigue siendo plano y citable, que es lo que
# `build-logs.md` pide. Ver TASK-THYROX-0052.
FLAT_HOME_KEY = "flat_home"


def flat_home(run_dir: str | pathlib.Path) -> str:
    """El hogar plano que este run declara, o cadena vacía si no declara ninguno.

    La cadena vacía es el discriminador: distingue «este run guarda sus salidas
    dentro» de «este run apunta afuera». Un default compuesto por aritmética
    diría dónde *podría* estar el log, no dónde está.
    """
    value = read_manifest(run_dir).get(FLAT_HOME_KEY)
    return value if isinstance(value, str) else ""


def scaffold_run(
    base_dir: str | pathlib.Path,
    slug: str,
    command: str | None = None,
    now: datetime | None = None,
    flat_home: str | None = None,
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
    if flat_home:
        manifiesto[FLAT_HOME_KEY] = str(flat_home)
    (run_dir / MANIFEST_FILE_NAME).write_text(
        manifest_line("launch", manifiesto) + "\n", encoding="utf-8")

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
    """El documento del run, sea cual sea de los dos nombres que lleve.

    **Lee los dos, escribe uno.** El nombre heredado sigue siendo legible porque
    este modulo es del PROVEEDOR: los consumidores tienen runs suyos que nadie
    ha convertido, y un lector que solo viera el nombre nuevo les devolveria
    `{}` — `bg.sh status` diria `unknown` sobre un trabajo terminado, que es el
    defecto de H-THYROX-35 reabierto por un renombre de constante.
    """
    ruta = resolve_manifest(run_dir)
    return read_manifest_file(ruta) if ruta is not None else {}


def missing_keys(run_dir: str | pathlib.Path) -> list[str]:
    """Las claves obligatorias que este run aún no declara.

    Su lista vacía es lo que hace conforme al run; mientras tenga elementos, el
    trabajo se lanzó y su resultado no se ha interpretado.
    """
    presentes = read_manifest(run_dir)
    return [k for k in REQUIRED_KEYS if k not in presentes]


def settle(run_dir: str | pathlib.Path, exit_code: int,
           now: datetime | None = None, force: bool = False) -> pathlib.Path:
    """Asienta el código de salida donde el manifiesto se lee.

    El `__BG_EXIT__` del log sigue estando —es lo que la barrera consume— pero
    un lector del manifiesto no debería tener que abrir el log para saber si el
    trabajo terminó bien.

    **Idempotente por defecto (TASK-THYROX-0234).** `bg.sh status` asienta cada
    vez que ve el marcador en el log, y el marcador no se borra: se llamaba una
    vez por LECTURA, no una por trabajo. Cada llamada apendaba otra fila, y su
    `duration_seconds` se deriva de `now - started_at`, así que cada una
    publicaba una duración mayor — medido sobre un trabajo de ~1 s: 2.2, 5.35,
    8.51. El eje del JSONL es temporal y la última fila gana, así que quien
    preguntara «cuánto tardó» leía la peor de todas, y la respuesta crecía con
    cuánta gente hubiera preguntado.

    La guarda LEE, pero no rompe la propiedad que el JSONL compra: sigue sin
    haber lectura-modificación-reescritura, sólo un append que a veces se
    omite. Dos escritores concurrentes pueden colarse los dos — la ventana es
    la misma que hoy, y su peor caso es la fila duplicada que ya existía.

    `force` es la rama alterna, y no es decorado: un run ADOPTADO después
    (`wait-jobs adopt-external`) puede necesitar corregir su código, y ahí la
    segunda fila es deliberada. Una guarda sin escape convierte un defecto de
    duplicado en uno de dato congelado.
    """
    if not force and "exit_code" in read_manifest(run_dir):
        return resolve_manifest(run_dir) or pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    ruta = pathlib.Path(run_dir) / MANIFEST_FILE_NAME
    legacy_file = pathlib.Path(run_dir) / LEGACY_MANIFEST_FILE_NAME
    settlement: dict[str, object] = {"exit_code": exit_code}
    end = now or datetime.now(timezone.utc)
    settlement["finished_at"] = end.isoformat(timespec="seconds")
    # Se LEE para derivar la duración, pero no se reescribe: el registro de
    # lanzamiento ya está en el archivo y ahí se queda, byte a byte.
    start = read_manifest(run_dir).get("started_at")
    if isinstance(start, str):
        # Un run andamiado antes de que `started_at` existiera no tiene con qué
        # restar: se omite la clave en vez de escribir un 0, que no distinguiría
        # «tardó nada» de «no se midió».
        settlement["duration_seconds"] = max(
            0.0, (end - datetime.fromisoformat(start)).total_seconds())
    # Un run que todavía lleva el nombre heredado se ASCIENDE aquí, no en un
    # barrido: el documento entero se reparte en sus registros y el archivo
    # viejo se retira. Es el único momento en que el mecanismo ya está
    # escribiendo en ese run, así que convertirlo no añade una escritura que
    # nadie pidió — y dejar los dos archivos crearía una segunda fuente de
    # verdad sobre el mismo run.
    if not ruta.exists() and legacy_file.is_file():
        ruta.write_text(render_manifest(read_manifest(run_dir)), encoding="utf-8")
        legacy_file.unlink()

    # AÑADE, no reescribe. Es la propiedad que la conversión a JSONL compra y
    # que un renombre de extensión no daría: `run-task-pool` corre N
    # trabajadores, y una lectura-modificación-reescritura por trabajo es una
    # carrera esperando a ocurrir.
    with ruta.open("a", encoding="utf-8") as sink:
        sink.write(manifest_line("settle", settlement) + "\n")
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
    sorted_durations = sorted(float(d) for d in durations)
    n = len(sorted_durations)
    half = n // 2
    median = (sorted_durations[half] if n % 2
               else (sorted_durations[half - 1] + sorted_durations[half]) / 2)
    total, greatest = sum(sorted_durations), sorted_durations[-1]
    return {
        "n": n,
        "total": total,
        "min": sorted_durations[0],
        "median": median,
        "max": greatest,
        "floor_wall_clock": lambda width: max(total / width, greatest),
    }
