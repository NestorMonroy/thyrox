#!/usr/bin/env python3
"""El registro de lo que THYROX resuelve por su cuenta porque nadie lo declaro.

Directiva del ejecutor 2026-09-07: *«a menos que el usuario defina la constante
en .env, si no esta se tiene que ir a una ruta por default … se tiene que
llevar un registro de que sucede con las que estan sin declarar y que si no se
declaran thyrox las maneja, porque son necesarias»*.

Eso corrige una decision anterior. `workbench_dir()` REHUSABA sin declaracion,
con el argumento de que un default decidiria por el consumidor donde van sus
piezas. El argumento estaba mal encuadrado, y el propio arbol ya tenia la forma
correcta a la vista: `agent_store_path()` cae a
`<thyrox>/agent-results/agent_store.sqlite3` y su docstring lo dice sin
ambiguedad — *«Lo prohibido no era tener default: era DERIVARLO por aritmetica
de `__file__`»*. Un default derivado de la CADENA DECLARADA es legitimo; uno
derivado de donde vivia el archivo, no.

Un rehuse tampoco era neutral: apagaba la funcion para todo consumidor que no
hubiera tomado una decision que casi ninguno necesita tomar, y empujaba a
teclear la ruta a mano — que es como aterrizaron once bancos en el arbol
equivocado (L-028).

Lo que este modulo añade es la mitad que faltaba: **que el default no sea
silencioso**. Una ruta resuelta por defecto y una declarada se comportan igual,
y sin registro nadie puede distinguirlas — el sub-patron D de
`metrica-decide-la-conclusion.md` aplicado a la configuracion.

    python3 src/paths/declarations.py      # que esta declarado y que lo maneja thyrox
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

from paths import reach
from rules import paths as rules
from workbench import paths as workbench

#: El contrato de entorno del proveedor: de él se DERIVAN las claves de hogar.
CONTRACT_FILE_NAME = ".env.example"

#: Una clave de hogar del contrato, por su forma: prefijo ``THYROX_`` y sufijo
#: de ubicación. Es la misma expresión que el censo del banco
#: ``clone-homes-20260930T200800`` usó para contar las 46.
HOME_KEY_PATTERN = re.compile(r"^(THYROX_[A-Z_]*(?:_DIR|_HOME|_LEDGER|_ROOT))=", re.MULTILINE)

#: El modo de un hogar creado: no depende del umask de quien instala, porque
#: el hogar lo comparten los procesos que el clon lance después.
HOME_MODE = 0o755

#: El marcador del segmento de estado dentro de un default (``.claude`` salvo
#: declaración de ``THYROX_STATE_DIR``).
STATE_PLACEHOLDER = "{state}"


@dataclass(frozen=True)
class Home:
    """Un hogar que el árbol resuelve por defecto dentro del clon.

    ``default`` es relativo a la raíz y puede llevar ``{state}``; ``owner`` es
    el módulo que lo resuelve, relativo a ``src/``; ``is_file`` distingue un
    registro o una base —de los que sólo se asegura el directorio padre— de un
    directorio.
    """

    key: str
    default: str
    owner: str
    is_file: bool = False

    def default_under(self, root: Path, state: str) -> Path:
        """La ruta por defecto de este hogar en el clon ``root``."""
        return root / self.default.replace(STATE_PLACEHOLDER, state)


#: Los hogares que un clon necesita y que ningún ``git clone`` trae completos.
HOMES: tuple[Home, ...] = (
    Home("THYROX_WORKBENCH_DIR", "{state}/workbench", "workbench/paths.py"),
    Home("THYROX_JOBS_DIR", "{state}/jobs", "session/job_runs.py"),
    Home("THYROX_JOBS_LEDGER_DIR", "{state}/jobs-ledger", "session/job_ledger.py"),
    Home("THYROX_JOBS_ARCHIVE_DIR", "{state}/jobs", "session/wait-jobs.sh"),
    Home("THYROX_CACHE_DIR", "{state}/cache", "cache/paths.py"),
    Home("THYROX_PARALLEL_MAP_HISTORY_DIR", "{state}/cache/parallel-map",
         "session/parallel_map_history.py"),
    Home("THYROX_RAM_ADMISSION_LEDGER", "{state}/cache/ram-admission.json",
         "session/resource_admission.py", is_file=True),
    Home("THYROX_DISK_ADMISSION_LEDGER", "{state}/cache/disk-admission.json",
         "session/resource_admission.py", is_file=True),
    Home("THYROX_RUNTIME_DIR", ".thyrox/runtime", "session/pool_lifecycle.py"),
    Home("THYROX_POOL_WORKTREES_DIR", ".thyrox/pool-worktrees", "session/item_worktree.sh"),
    Home("THYROX_MODEL_ARTIFACT_CACHE_DIR", ".thyrox/models/artifacts",
         "packages/model-artifacts/localModelHome.ts"),
)

_OUTSIDE_CLONE = "vive fuera del clon (hogar del usuario o del cliente)"
_REFUSES = "rehúsa sin declarar: su ubicación es decisión del consumidor"
_NOT_A_HOME = "no nombra un hogar de estado"

#: Las claves de hogar del contrato que NO se registran, cada una con su razón.
EXCLUDED: dict[str, str] = {
    "THYROX_REACH_ROOT": f"{_NOT_A_HOME}: es el padre de los clones",
    "THYROX_STATE_DIR": f"{_NOT_A_HOME}: es un segmento de nombre",
    "THYROX_EVIDENCE_DIR": f"{_NOT_A_HOME}: es un segmento de nombre",
    "THYROX_AGENTS_DIR": "su default es producto versionado (src/agents/definitions)",
    "THYROX_SKILLS_DIR": "su default es producto versionado",
    "THYROX_RULES_DIR": "hogar del consumidor; en el proveedor, las reglas se versionan",
    "THYROX_COMMANDS_DIR": "destino de lo emitido: hogar del consumidor",
    "THYROX_BACKGROUND_LOG_DIR": _REFUSES,
    "THYROX_BACKGROUND_OUTPUT_ROOT": f"{_REFUSES} (adopción de una flota ajena)",
    "THYROX_CENSUS_REFERENCE_ROOT": _REFUSES,
    "THYROX_CENSUS_ROOT": _REFUSES,
    "THYROX_MAILBOX_DIR": _REFUSES,
    "THYROX_RESULTS_DIR": _REFUSES,
    "THYROX_MIGRATION_ROOT": f"{_NOT_A_HOME}: es la raíz del clon que se mide",
    "THYROX_WATCHED_DIR": f"{_NOT_A_HOME}: es lo que el hook de tests vigila",
    "THYROX_CODE_TEST_FIXTURES_ROOT": "fixtures versionadas de prueba",
    "THYROX_BASH_MAINTAIN_PROJECT_WORKING_DIR": f"{_NOT_A_HOME}: es una bandera",
    "THYROX_TOOLCHAIN_NODE_MODULES_HOME": "es una dependencia, no un hogar",
    "THYROX_LINT_BIN_DIR": "es una dependencia (.venv/bin), no un hogar",
    "THYROX_JOB_DIR": "la fija el lanzador por trabajo, no se resuelve por defecto",
    "THYROX_POOL_GUARDED_GIT_COMMON_DIR": "la exporta headless-pool a cada ítem",
    "THYROX_SESSION_LEDGER_DIR": "cuelga de THYROX_JOBS_LEDGER_DIR por sesión",
    "THYROX_BG_MEMFREE_DIR": "su default vive en TMPDIR, fuera del clon",
    "THYROX_BOARD_ROOT": _OUTSIDE_CLONE,
    "THYROX_USER_CLAUDE_DIR": _OUTSIDE_CLONE,
    "THYROX_EXPOSURE_EVIDENCE_DIR": f"{_OUTSIDE_CLONE}: toda unidad monta la raíz del clon",
    "THYROX_TRANSCRIPTS_DIR": _OUTSIDE_CLONE,
    "THYROX_CONFIG_DIR": _OUTSIDE_CLONE,
    "THYROX_CODE_DEBUG_LOGS_DIR": _OUTSIDE_CLONE,
    "THYROX_CODE_LOCAL_TELEMETRY_DIR": _OUTSIDE_CLONE,
    "THYROX_CODE_PLUGIN_CACHE_DIR": _OUTSIDE_CLONE,
    "THYROX_CODE_PLUGIN_SEED_DIR": _OUTSIDE_CLONE,
    "THYROX_CODE_REMOTE_MEMORY_DIR": _OUTSIDE_CLONE,
    "THYROX_MITM_DATA_DIR": _OUTSIDE_CLONE,
    "THYROX_OBSERVABILITY_DATA_DIR": _OUTSIDE_CLONE,
    "THYROX_PROVIDERS_DATA_DIR": _OUTSIDE_CLONE,
    "THYROX_CLIPROXYAPI_CONFIG_DIR": _OUTSIDE_CLONE,
}


def contract_home_keys(contract: Path) -> frozenset[str]:
    """Las claves de hogar que el contrato publica, derivadas de su texto."""
    return frozenset(HOME_KEY_PATTERN.findall(contract.read_text(encoding="utf-8")))


def decided_keys() -> frozenset[str]:
    """Las claves con decisión tomada: registradas o excluidas."""
    return frozenset(home.key for home in HOMES) | frozenset(EXCLUDED)


def undecided_keys(contract: Path) -> tuple[str, ...]:
    """Las claves de hogar del contrato que nadie decidió, en orden."""
    return tuple(sorted(contract_home_keys(contract) - decided_keys()))


def stale_decisions(contract: Path) -> tuple[str, ...]:
    """Las decisiones sobre claves que el contrato ya no publica, en orden."""
    return tuple(sorted(decided_keys() - contract_home_keys(contract)))


@dataclass(frozen=True)
class Fallback:
    """Una constante que nadie declaro y que THYROX resolvio por su cuenta."""

    key: str
    value: str
    reason: str


_FALLBACKS: dict[str, Fallback] = {}


def record_fallback(key: str, value: str | Path, reason: str) -> None:
    """Anota que `key` no estaba declarada y con que se resolvio.

    Idempotente por clave: el ultimo valor gana, que es el que el proceso esta
    usando. No se acumula historial — el registro dice el ESTADO, no la
    secuencia, y una lista de resoluciones repetidas no responde a ninguna
    pregunta que alguien haga.
    """
    _FALLBACKS[key] = Fallback(key=key, value=str(value), reason=reason)


def fallbacks() -> tuple[Fallback, ...]:
    """Lo anotado hasta ahora, en orden de clave."""
    return tuple(_FALLBACKS[k] for k in sorted(_FALLBACKS))


def clear() -> None:
    """Vacia el registro. Existe para los controles, no para el uso normal."""
    _FALLBACKS.clear()


def resolve_all(start: Path | None = None) -> list[tuple[str, str, str, str]]:
    """El estado de cada hogar, POR CLON. Devuelve `(clon, clave, origen, valor)`.

    Reportaba un solo arbol —el del `start`— y esa era su limitacion de fondo:
    respondia globalmente una pregunta que es POR REPOSITORIO. Un proceso
    resuelve varios arboles, y la respuesta correcta para `api`
    (`scripts/workbench`) no es la de `docs` (`.claude/eventos`).

    `origen` es `declarado` o `por defecto`. Sin recorrer los clones, el
    registro solo tendria lo que el proceso haya tocado por casualidad, y un
    vacio ahi no distingue «todo declarado» de «nadie pregunto».
    """
    clear()
    rows: list[tuple[str, str, str, str]] = []
    for repo in reach.REACH_ROOTS:
        root = reach.root(repo, start)
        key = workbench.workbench_home_name(repo)
        # La familia primero, la global despues: es la precedencia que resuelve.
        declared = reach.env_value(key, root) or reach.env_value(
            workbench.WORKBENCH_DIR_VAR, root)
        origin = "declarado" if declared else "por defecto"
        rows.append((repo, key, origin, str(workbench.workbench_dir(root))))

        # El hogar de las reglas EMITIDAS es del consumidor, no del proveedor:
        # thyrox las produce y cada clon las aloja. Por eso la fila es por clon
        # aunque la clave sea una — la variable se lee con la raíz de ESE árbol
        # como punto de partida, así que su `.env` la puede declarar sin tocar
        # la de los demás. Sin esta fila el default sería SILENCIOSO, que es el
        # defecto entero que este módulo existe para cerrar.
        # La clave que se PUBLICA es la del clon, no la de familia: publicar
        # `THYROX_RULES_DIR` en las cinco filas invitaba a declararla, y
        # declararla le da a los cinco el hogar de uno solo. Medido: con la
        # clave única, `THYROX_RULES_DIR=<db>` imprimía la ruta de db en las
        # cinco filas y ninguna avisaba. La familia sigue leyéndose como último
        # recurso dentro de `consumer_rules_dir`; lo que no hace es figurar
        # aquí como si fuera la entrada de este clon.
        rules_key = rules.rules_home_name(repo)
        declared_rules = (reach.env_value(rules_key, root)
                          or reach.env_value(rules.RULES_DIR_VAR, root))
        rows.append((repo, rules_key,
                     "declarado" if declared_rules else "por defecto",
                     str(rules.consumer_rules_dir(root))))

    # Los hogares que NO son por clon: el store y los dos segmentos del default.
    for key, resolver in (
        (reach.AGENT_STORE_VAR, lambda: reach.agent_store_path(start)),
        (workbench.STATE_DIR_VAR, lambda: workbench.state_dir(start)),
        (workbench.EVIDENCE_DIR_VAR, lambda: workbench.evidence_dir(start)),
    ):
        declared = reach.env_value(key, start)
        rows.append(("(global)", key, "declarado" if declared else "por defecto",
                     str(resolver())))
    return rows


def main(argv: list[str] | None = None) -> int:
    rows = resolve_all()
    defaulted = [r for r in rows if r[2] == "por defecto"]
    print(f"declaraciones: {len(rows)} hogar(es) · {len(rows) - len(defaulted)} "
          f"declarado(s) · {len(defaulted)} que maneja THYROX")
    for repo, key, origin, value in rows:
        mark = "  " if origin == "declarado" else "->"
        print(f"{mark} {repo:<9} {key:<26} {origin:<12} {value}")
    if defaulted:
        print("\nLos marcados con `->` funcionan, y su valor lo eligio THYROX.")
        print("Declararlos en el .env de su arbol los pone bajo tu control.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
