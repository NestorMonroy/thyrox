#!/usr/bin/env python3
"""backfill_findings_history.py — reconstruye ``findings_history`` desde
los ``hallazgo-*.rst`` YA versionados en ``source/gestion/pm/**/hallazgos/``.

Por que existe
---------------
Medido 2026-08-16 (H-DOCS-173): ``findings_history`` tenia **6 filas**
contra **344** archivos ``hallazgo-*.rst`` reales en el arbol -- la tabla
nunca tuvo un pipeline automatico que la llenara desde lo historico, solo
un puñado de inserciones puntuales.

DEC-07 de ``agent_store.py`` ya declara esta tabla como **indice
reconstruible, no fuente de verdad** -- el RST siempre gana. Este guion
es exactamente esa reconstruccion: parsea cada ``.rst`` y hace upsert
(``ON CONFLICT(finding_id) DO UPDATE``, ya en ``cmd_add_finding``), asi
que correrlo dos veces es seguro y correrlo periodicamente lo mantiene al
dia sin depender de que el hook de captura en vivo dispare (ver
H-DOCS-167 -- el gap de los hooks SubagentStart/Stop sigue abierto y este
guion no lo cierra: cierra el hueco de HISTORICO, que es independiente).

Que NO hace
-----------
No escribe nada fuera de ``agent_store.sqlite3`` -- ningun ``.rst`` se
toca. No inventa campos: si un archivo no trae ``:submodulo:``/
``:iniciativa:`` en su bloque ``.. meta::``, se derivan del path/nombre
(documentado abajo) y si ni eso alcanza, el archivo se reporta como
OMITIDO con la razon -- nunca se hace upsert con un campo adivinado a
ciegas para un NOT NULL.
"""
from __future__ import annotations

import argparse
import importlib.util
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent  # thyrox/src/corpus

# H-DOCS-494 dejo este anclaje en `HERE.parents[2]` y anadio el guard de
# abajo, que es lo que hizo VISIBLE el fallo cuando el guion volvio a
# mudarse — esta vez de `kaupamex-docs/.claude/scripts/corpus/` a
# `thyrox/src/corpus/`. Desde aqui `parents[2]` resuelve a `/home/user`,
# que no tiene `source/gestion/pm`, y el assert lo dijo en vez de
# escribir en el sitio equivocado.
#
# La leccion no es corregir el offset: es que un offset NO puede anclar a
# OTRO repo. El consumidor es un parametro (DEC-04) y su raiz la resuelve
# el mecanismo de alcance, que lee la variable declarada, el `.env` y solo
# entonces deriva. El guard se conserva: sigue siendo el unico control que
# puede fallar si la resolucion devuelve algo que no es kaupamex-docs.
sys.path.insert(0, str(HERE.parent / "paths"))
import reach  # noqa: E402  (la ruta se compone arriba, a proposito)

DOCS_ROOT = reach.root("docs")
assert (DOCS_ROOT / "source" / "gestion" / "pm").is_dir(), (
    f"raiz mal anclada: {DOCS_ROOT} — no tiene source/gestion/pm")
PM_ROOT = DOCS_ROOT / "source" / "gestion" / "pm"

_spec = importlib.util.spec_from_file_location("agent_store", HERE.parent / "agents" / "agent_store.py")
agent_store = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(agent_store)

_ID_RE = re.compile(r"^hallazgo-(H-[A-Za-z]+-\d+)-")
_META_FIELD_RE = re.compile(r"^\s*:(\w+):\s*(.*)$")
_SEVERIDAD_RE = re.compile(
    r"\*\*Severidad:\*\*\s*([A-ZÁÉÍÓÚ]+)", re.IGNORECASE
)
_TITULO_RE = re.compile(r"^H-[A-Za-z]+-\d+\s+—\s+(.+)$", re.MULTILINE)

_SEVERIDAD_CANON = {
    "CRITICA": "CRITICA", "CRÍTICA": "CRITICA",
    "ALTA": "ALTA", "MEDIA": "MEDIA", "BAJA": "BAJA",
}

#: prefijo de ID -> submodulo, cuando el .rst no trae :submodulo: explicito.
_PREFIJO_A_SUBMODULO = {
    "API": "api", "DOCS": "docs", "UI": "ui", "DB": "db", "SERVER": "server",
    "CBK": "api",  # H-CBK-* son hallazgos de chargebacks, capa api (histórico)
}


def _parse_meta(texto: str) -> dict:
    """Campos del bloque ``.. meta::`` inicial (hasta la primera línea en blanco doble)."""
    campos: dict[str, str] = {}
    en_meta = False
    for linea in texto.splitlines():
        if linea.strip().startswith(".. meta::"):
            en_meta = True
            continue
        if en_meta:
            if not linea.strip():
                if campos:
                    break
                continue
            m = _META_FIELD_RE.match(linea)
            if m:
                campos[m.group(1)] = m.group(2).strip()
            else:
                break
    return campos


def _parsear_hallazgo(ruta: Path) -> dict | None:
    texto = ruta.read_text(encoding="utf-8", errors="replace")
    m_id = _ID_RE.match(ruta.name)
    if not m_id:
        return {"_omitido": f"nombre de archivo no coincide con hallazgo-H-XXX-NNN-*: {ruta.name}"}
    finding_id = m_id.group(1)
    prefijo = finding_id.split("-")[1]

    meta = _parse_meta(texto)
    submodule = meta.get("submodulo") or _PREFIJO_A_SUBMODULO.get(prefijo)
    if not submodule:
        return {"_omitido": f"{finding_id}: sin :submodulo: en meta y prefijo {prefijo!r} no mapeado"}

    # La iniciativa es el segmento de directorio entre 'iniciativas/' y '/hallazgos/'.
    partes = ruta.parts
    try:
        idx = partes.index("iniciativas")
        initiative = partes[idx + 1]
    except (ValueError, IndexError):
        initiative = meta.get("iniciativa") or "desconocida"

    m_sev = _SEVERIDAD_RE.search(texto)
    severity = _SEVERIDAD_CANON.get(m_sev.group(1).upper()) if m_sev else None

    m_tit = _TITULO_RE.search(texto)
    summary = m_tit.group(1).strip() if m_tit else finding_id

    # Contenido indexable: primeras ~400 chars de cuerpo tras el título,
    # sin el bloque .. meta:: ni la etiqueta .. _h-xxx:.
    cuerpo = texto
    if m_tit:
        cuerpo = texto[m_tit.end():]
    cuerpo = re.sub(r"\s+", " ", cuerpo).strip()
    content = cuerpo[:400] if cuerpo else summary

    created_at = meta.get("fecha_creacion") or meta.get("fecha")
    source_ref = str(ruta.relative_to(DOCS_ROOT))

    return {
        "finding_id": finding_id,
        "submodule": submodule,
        "initiative": initiative,
        "finding_type": "finding",
        "severity": severity,
        "summary": summary,
        "content": content,
        "source_ref": source_ref,
        "metadata_json": None,
        "session_id": None,
        "created_at": created_at,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true", help="parsear y listar sin escribir en la DB")
    args = ap.parse_args()

    archivos = sorted(PM_ROOT.glob("*/iniciativas/*/hallazgos/hallazgo-*.rst"))
    if not archivos:
        print(f"backfill-findings-history: 0 archivos hallazgo-*.rst bajo {PM_ROOT}", file=sys.stderr)
        return 1

    store_dir = DOCS_ROOT / ".claude" / "agent-results"
    procesados = 0
    omitidos: list[str] = []

    conn = None if args.dry_run else agent_store.connect(store_dir)
    try:
        for ruta in archivos:
            datos = _parsear_hallazgo(ruta)
            if datos is None:
                continue
            if "_omitido" in datos:
                omitidos.append(datos["_omitido"])
                continue
            ts = agent_store.now_iso()
            created_at = datos["created_at"] or ts
            if args.dry_run:
                print(f"{datos['finding_id']}  {datos['submodule']:8s}  {datos['initiative']}")
            else:
                conn.execute(
                    """
                    INSERT INTO findings_history
                        (finding_id, submodule, initiative, finding_type, severity,
                         summary, content, source_ref, metadata_json, session_id,
                         created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(finding_id) DO UPDATE SET
                        submodule     = excluded.submodule,
                        initiative    = excluded.initiative,
                        finding_type  = excluded.finding_type,
                        severity      = excluded.severity,
                        summary       = excluded.summary,
                        content       = excluded.content,
                        source_ref    = excluded.source_ref,
                        updated_at    = excluded.updated_at
                    """,
                    (
                        datos["finding_id"], datos["submodule"], datos["initiative"],
                        datos["finding_type"], datos["severity"], datos["summary"],
                        datos["content"], datos["source_ref"], datos["metadata_json"],
                        datos["session_id"], created_at, ts,
                    ),
                )
            procesados += 1
        if conn is not None:
            conn.commit()
    finally:
        if conn is not None:
            conn.close()

    print(f"backfill-findings-history: {procesados}/{len(archivos)} indexados"
          f"{' (dry-run, sin escribir)' if args.dry_run else ''}")
    if omitidos:
        print(f"backfill-findings-history: {len(omitidos)} omitidos:", file=sys.stderr)
        for razon in omitidos:
            print(f"  - {razon}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
