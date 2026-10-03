"""La intención documental de un ítem de pool: qué documento publicar y sobre qué base.

Un ítem que quiere que su trabajo llegue a la documentación del consumidor no
escribe allí: deja en su runtime dos artefactos —``<n>.intent.json``, esta
intención, y el cuerpo RST que nombra en ``body_artifact``— y
``pool_lifecycle`` los publica con el resto, con su ``sha256`` en
``<n>.closed``. Quien los consume es ``documentation_publisher``, y sólo
cuando el ítem está CERRADO y la intención pertenece a esa misma ejecución y
generación: una intención de una generación anterior describe un trabajo que
otra generación ya superó.

Campos
------
``consumer``            la raíz de ``reach`` donde vive la documentación
                        (``docs``), nunca una ruta;
``initiative``          el slug de la iniciativa, que tiene que existir en su
                        sitio (``docs.initiative_placement``);
``document_kind``       una de ``DOCUMENT_KINDS``; el nombre del objetivo la
                        lleva como prefijo;
``target``              ruta RELATIVA al consumidor, bajo
                        ``source/gestion/pm/<raíz>/iniciativas/<slug>/`` y
                        con extensión ``.rst`` —nunca Markdown—;
``expected_blob``       el id de blob de git que el objetivo tenía cuando el
                        ítem lo leyó (``git rev-parse HEAD:<target>``), o
                        ``null`` si el ítem espera crearlo;
``body_artifact``       el artefacto del ítem con el documento entero, que
                        abre con ``.. meta::`` como todo ``.rst`` de gestión;
``source_run``, ``source_item``, ``source_generation``, ``source_snapshot``
                        la procedencia, que el pool le da al ítem por entorno
                        (``RUN_ID_VAR``, ``ITEM_VAR``, ``GENERATION_VAR``,
                        ``SNAPSHOT_VAR``) y que se compara con ``<n>.closed``.

*Métrica:* las claves y valores de la intención contra el manifiesto
``<n>.closed`` y contra la forma canónica de ruta de ``initiative_placement``.
*Ciega a:* si el cuerpo es un documento válido; eso lo miden los gates del
consumidor, que el publicador invoca y no duplica.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath

from docs.initiative_placement import submodule_of
from session import pool_lifecycle as lifecycle

INTENT_SUFFIX = ".intent.json"
#: Lo que el pool exporta al ítem para que escriba su intención sin conocer el runtime.
INTENT_PATH_VAR = "THYROX_POOL_DOCUMENT_INTENT"
RUN_ID_VAR = "THYROX_POOL_RUN_ID"
ITEM_VAR = "THYROX_POOL_ITEM"
GENERATION_VAR = "THYROX_POOL_ITEM_GENERATION"
SNAPSHOT_VAR = "THYROX_POOL_ITEM_SNAPSHOT"
#: Las clases de documento de una iniciativa, por el prefijo con que se nombran.
DOCUMENT_KINDS = frozenset({"hallazgo", "analisis", "decision", "progreso"})
RST_SUFFIX = ".rst"
#: Todo ``.rst`` de gestión del consumidor abre con su bloque de metadatos.
META_DIRECTIVE = ".. meta::"
REQUIRED_KEYS = ("consumer", "initiative", "document_kind", "target", "expected_blob",
                 "body_artifact", "source_run", "source_item", "source_generation")


class IntentError(Exception):
    """La intención no se puede leer, o no describe un documento publicable."""


class StaleIntentError(IntentError):
    """La intención pertenece a otra ejecución o generación del ítem."""


@dataclass(frozen=True)
class DocumentIntent:
    consumer: str
    initiative: str
    document_kind: str
    target: str
    expected_blob: str | None
    body_artifact: str
    source_run: str
    source_item: str
    source_generation: int
    source_snapshot: str | None = None

    @property
    def submodule(self) -> str:
        """La raíz ``pm/<raíz>`` del objetivo; ``validate_intent`` garantiza que existe."""
        return str(submodule_of(Path(self.target), self.initiative))

    def to_json(self) -> dict[str, object]:
        return asdict(self)


def intent_name(item: str) -> str:
    return f"{item}{INTENT_SUFFIX}"


def parse_intent(data: dict) -> DocumentIntent:
    """Una intención desde su JSON; rehúsa nombrando la clave que falta."""
    missing = [key for key in REQUIRED_KEYS if key not in data]
    if missing:
        raise IntentError(f"la intención no declara {', '.join(missing)}")
    return DocumentIntent(
        consumer=str(data["consumer"]), initiative=str(data["initiative"]),
        document_kind=str(data["document_kind"]), target=str(data["target"]),
        expected_blob=None if data["expected_blob"] is None else str(data["expected_blob"]),
        body_artifact=str(data["body_artifact"]), source_run=str(data["source_run"]),
        source_item=str(data["source_item"]), source_generation=int(data["source_generation"]),
        source_snapshot=None if data.get("source_snapshot") is None else str(data["source_snapshot"]))


def _is_kind_prefixed(intent: DocumentIntent) -> bool:
    return PurePosixPath(intent.target).name.startswith(f"{intent.document_kind}-")


def _is_inside_initiative(intent: DocumentIntent) -> bool:
    return submodule_of(Path(intent.target), intent.initiative) is not None


def validate_intent(intent: DocumentIntent) -> None:
    """Rehúsa lo que la estructura del consumidor no admite."""
    if intent.document_kind not in DOCUMENT_KINDS:
        raise IntentError(f"clase de documento desconocida: {intent.document_kind!r}; "
                          f"las admitidas son {sorted(DOCUMENT_KINDS)}")
    if PurePosixPath(intent.target).is_absolute():
        raise IntentError(f"el objetivo va relativo al consumidor, no absoluto: {intent.target}")
    if not intent.target.endswith(RST_SUFFIX):
        raise IntentError(f"el objetivo tiene que ser {RST_SUFFIX}, nunca otro formato: {intent.target}")
    if not _is_inside_initiative(intent):
        raise IntentError(f"el objetivo no está bajo source/gestion/pm/<raíz>/iniciativas/"
                          f"{intent.initiative}/: {intent.target}")
    if not _is_kind_prefixed(intent):
        raise IntentError(f"el nombre del objetivo no lleva su clase como prefijo "
                          f"({intent.document_kind}-): {intent.target}")


def validate_body(body: str) -> None:
    if not body.lstrip().startswith(META_DIRECTIVE):
        raise IntentError(f"el cuerpo no abre con {META_DIRECTIVE!r}, como todo .rst de gestión")


def _assert_same_provenance(intent: DocumentIntent, manifest: dict, item: str) -> None:
    """La intención describe ESTE cierre: misma ejecución, mismo ítem, misma generación."""
    declared = (intent.source_run, intent.source_item, intent.source_generation)
    closed = (str(manifest["run_id"]), item, int(manifest["generation"]))
    if declared != closed:
        raise StaleIntentError(
            f"la intención del ítem {item} declara (run, ítem, generación) {declared}, "
            f"pero <n>.closed dice {closed}: no se publica un trabajo superado")


def _assert_closed_coherent(out_dir: Path, item: str) -> dict:
    manifest = lifecycle.read_closed(out_dir, item)
    if manifest is None:
        raise IntentError(f"el ítem {item} no tiene {lifecycle.CLOSED_SUFFIX} en {out_dir}")
    problems = lifecycle.verify_closed(out_dir, item)
    if problems:
        raise IntentError(f"el cierre del ítem {item} no es coherente: {'; '.join(problems)}")
    return manifest


def read_intent(out_dir: Path, item: str) -> tuple[DocumentIntent, dict]:
    """La intención de un ítem CERRADO y coherente, con su manifiesto.

    Se lee sólo lo que ``<n>.closed`` enumera con el ``sha256`` que tiene en
    disco; la intención y el cuerpo que no figuren allí no existen para el
    publicador.
    """
    manifest = _assert_closed_coherent(out_dir, item)
    artifacts = manifest["artifacts"]
    name = intent_name(item)
    if name not in artifacts:
        raise IntentError(f"el ítem {item} cerró sin {name}: no declara intención documental")
    try:
        data = json.loads((out_dir / name).read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise IntentError(f"{name} no es JSON: {error}") from None
    intent = parse_intent(data)
    validate_intent(intent)
    _assert_same_provenance(intent, manifest, item)
    if intent.body_artifact not in artifacts:
        raise IntentError(f"el cuerpo {intent.body_artifact} no figura en el cierre del ítem {item}")
    return intent, manifest


def read_body(out_dir: Path, intent: DocumentIntent) -> str:
    body = (out_dir / intent.body_artifact).read_text(encoding="utf-8")
    validate_body(body)
    return body


def write_intent(path: Path, intent: DocumentIntent) -> None:
    """Escribe la intención; el ítem la valida aquí, antes de cerrar, no al publicar."""
    validate_intent(intent)
    path.write_text(json.dumps(intent.to_json(), sort_keys=True) + "\n", encoding="utf-8")


def provenance_from_environment(env: dict[str, str]) -> dict[str, object]:
    """La procedencia que el pool exporta al ítem; rehúsa nombrando la variable ausente."""
    missing = [var for var in (RUN_ID_VAR, ITEM_VAR, GENERATION_VAR) if not env.get(var)]
    if missing:
        raise IntentError(f"el entorno del ítem no declara {', '.join(missing)}: "
                          "sin procedencia la intención no se puede cotejar con su cierre")
    return {"source_run": env[RUN_ID_VAR], "source_item": env[ITEM_VAR],
            "source_generation": int(env[GENERATION_VAR]),
            "source_snapshot": env.get(SNAPSHOT_VAR) or None}
