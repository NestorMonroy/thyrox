#!/usr/bin/env python3
"""store_field_classes.py — las tres clases de campo de cada tabla del store compartido.

``agent_store.sqlite3`` viaja entre sesiones como archivo versionado (§3 del
banco de inventario D4), y su merge de tres vías necesita, por cada fila, un
hash que distinga «mismo contenido» de «contenido divergente» sin que un
metadato de contabilidad —una `revision` que sube sola, un `updated_at` que
cambia aunque el contenido no— lo ensucie.

Contrato: `.claude/workbench/datos-d4-inventario-20260929T221846/README.md`
§10. Tres clases, declaradas por tabla:

- **identity** — la clave global que empareja una fila entre las tres copias.
  No entra en el hash: es lo que decide qué fila es «la misma», no lo que la
  fila afirma. `findings_history` usa ``finding_id``, nunca su ``id``
  ``AUTOINCREMENT`` local — ese entero no viaja con significado entre bases.
- **domain** — lo que la fila afirma (estado, cuerpo, severidad…). Es lo
  único que entra en `domain_hash`.
- **bookkeeping** — `revision`, `updated_at` y los metadatos de migración o de
  merge. Se excluyen a propósito: si entraran, dos ediciones idénticas con
  distinto reloj de escritura darían un conflicto falso.

Una tabla sin declaración no se adivina: `field_classes` y `domain_hash`
levantan `UnknownTableError`, y quien orquesta el merge lo convierte en un
aborto explícito.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Mapping


class UnknownTableError(LookupError):
    """La tabla no tiene declarada su clasificación de campos."""


@dataclass(frozen=True)
class FieldClasses:
    """Las tres clases de campo de una tabla, ya declaradas."""

    identity: tuple[str, ...]
    domain: tuple[str, ...]
    bookkeeping: tuple[str, ...]


#: Nombres de contabilidad que se repiten igual en toda tabla mutable: una
#: revisión lógica y la marca de última escritura. Nunca describen lo que la
#: fila afirma, sólo cuándo o cuántas veces se escribió.
_REVISION_AND_TIMESTAMP = ("revision", "updated_at")

TABLE_FIELD_CLASSES: Mapping[str, FieldClasses] = {
    "agent_sessions": FieldClasses(
        identity=("agent_id",),
        domain=(
            "subagent_type", "session_id", "status", "output_key",
            "started_at", "timeout_at", "model", "description", "turns",
            "input_tokens", "cache_creation_tokens", "cache_read_tokens",
            "output_tokens", "equiv_cost", "spawn_depth", "source",
            "tool_use_id", "metadata_json", "duration_s", "tool_uses_total",
            "tool_uses_json", "prompt", "retention_level", "model_alias",
            "effort", "client_version", "service_tier", "api_error_status",
            "api_error_detail", "rate_limit_type", "stop_reason",
            "compactions", "dropped_tokens", "outcome_source",
            "usage_source", "type_source", "last_stop_reason",
        ),
        bookkeeping=_REVISION_AND_TIMESTAMP,
    ),
    "findings_history": FieldClasses(
        identity=("finding_id",),
        domain=(
            "submodule", "initiative", "finding_type", "severity",
            "summary", "content", "source_ref", "metadata_json",
            "session_id", "created_at",
        ),
        # ``id`` es el AUTOINCREMENT local: no es identidad (esa es
        # finding_id) ni contenido, así que cae en contabilidad.
        bookkeeping=("id",) + _REVISION_AND_TIMESTAMP,
    ),
    "documents": FieldClasses(
        identity=("path",),
        domain=(
            "updated_at_source", "declared_at", "commit_at", "section",
            "series", "retention_years",
        ),
        bookkeeping=_REVISION_AND_TIMESTAMP,
    ),
    "cleared_tool_results": FieldClasses(
        identity=("session_id", "tool_use_id"),
        domain=("tool", "input_json", "content_sha256", "content_chars", "cleared_at"),
        bookkeeping=(),
    ),
    "tasks": FieldClasses(
        identity=("session_id", "task_id"),
        domain=(
            "subject", "description", "status", "active_form", "owner",
            "blocks_json", "blocked_by_json", "source", "metadata_json",
            "created_at", "submodule", "submodule_source", "opened_at",
            "opened_at_source", "citation_id", "board_ordinal",
            "layer_citation_id",
        ),
        bookkeeping=_REVISION_AND_TIMESTAMP,
    ),
    "task_session_highwater": FieldClasses(
        identity=("session_id",),
        domain=("next_task_id",),
        bookkeeping=(),
    ),
    "schema_migrations": FieldClasses(
        identity=("version",),
        domain=("name",),
        # applied_at es exactamente un updated_at de migración: cuándo se
        # aplicó, no qué se aplicó.
        bookkeeping=("applied_at",),
    ),
}


def field_classes(table: str) -> FieldClasses:
    """La clasificación declarada de ``table``, o el aborto explícito."""
    try:
        return TABLE_FIELD_CLASSES[table]
    except KeyError as error:
        raise UnknownTableError(table) from error


def domain_hash(table: str, row: Mapping[str, object]) -> str:
    """sha256 del JSON canónico de los campos de dominio de ``row``.

    Un campo de dominio ausente en ``row`` (columna añadida después de que
    esta fila existiera) se trata como ``None``: participa igual en el hash,
    pero no revienta el merge por una migración de esquema legítima.
    """
    classes = field_classes(table)
    canonical = {field: row.get(field) for field in classes.domain}
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
