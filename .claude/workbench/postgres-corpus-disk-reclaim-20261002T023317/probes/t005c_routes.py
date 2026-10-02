"""T005c, comparación de rutas de embedding (enmienda §25).

Mismo contrato que `t005c_capacity.py`, ahora por ruta y por alcance:

  A  local ONNX   — runtime propio en el worker (la medición original)
  B  local Ollama — `nomic-embed-text` servido por `thyrox-ollama`, ya corriendo
  C  API          — un proveedor remoto; su modelo y su dimensión se desconocen
                    hasta sondearlo, así que se calcula para la dimensión
                    declarada en `C_DIMENSIONS`

Cada ruta registra bytes persistentes, pico temporal, modelo y runtime,
PostgreSQL esperado, red, estado de calificación, perfil de embedding y
dependencia operativa. La dimensión es del perfil, no de semantic search.
Ninguna ruta está calificada: `embedding@1` no existe todavía.

Uso: t005c_routes.py <outputs> <salida.json>
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

HEAP_ROW_OVERHEAD = 24 + 4
HNSW_LAYER0_NEIGHBORS = 2 * 16
HNSW_NEIGHBOR_TID_BYTES = 6
MVCC_FRACTION = 0.20
INGESTION_BATCH_BYTES = 64 * 1024 * 1024
ONNX_FILES = ("onnx/model.onnx", "tokenizer.json", "config.json", "tokenizer_config.json",
              "special_tokens_map.json", "vocab.txt")
C_DIMENSIONS = (768, 1536)


def load(outputs: Path, name: str) -> dict:
    return json.loads((outputs / name).read_text())


def postgres_terms(text_bytes: int, bytes_per_text_byte: float, average_chunk: float, dimensions: int,
                   max_wal: int) -> dict:
    """Lo que la ingesta añade a PostgreSQL; es igual en las tres rutas para una misma dimensión."""
    chunks = round(text_bytes / average_chunk)
    text = round(text_bytes * bytes_per_text_byte)
    vectors = chunks * (2 * dimensions + 8 + HEAP_ROW_OVERHEAD)
    index = chunks * (dimensions // 8 + 8 + HEAP_ROW_OVERHEAD + HNSW_LAYER0_NEIGHBORS * HNSW_NEIGHBOR_TID_BYTES)
    headroom = max_wal + round((text + vectors + index) * MVCC_FRACTION)
    return {"chunks": chunks, "text_bytes": text, "embedding_bytes": vectors, "index_bytes": index,
            "operational_headroom_bytes": headroom, "persistent_bytes": text + vectors + index}


def main(outputs: Path, report: Path) -> int:
    totals = load(outputs, "T005b-corpus-inventory.json")["totals"]
    pg = load(outputs, "T005c-pg-measured.json")
    empty = load(outputs, "T001-corpus-state.json")
    runtime = load(outputs, "T005c-runtime-measured.json")
    onnx = {f["path"]: f["bytes"] for f in load(outputs, "T005c-model-declared.json")["files"]}
    ollama = load(outputs, "T005c-route-ollama-declared.json")
    ratio = (pg["databaseBytes"] - empty["databaseBytes"]) / pg["chunkTextBytes"]
    average_chunk = pg["chunkTextBytes"] / pg["counts"]["document_chunks"]
    max_wal = next(int(s["setting"]) for s in pg["settings"] if s["name"] == "max_wal_size") * 1024 * 1024
    scopes = {"semantic_content": totals["semantic_bytes"],
              "semantic_content+durable_evidence": totals["semantic_bytes"] + totals["durable_evidence_bytes"]}
    onnx_model = sum(onnx[name] for name in ONNX_FILES)
    onnx_runtime = sum(w["installedBytes"] for w in runtime["wheels"].values())
    onnx_wheels = sum(w["wheelBytes"] for w in runtime["wheels"].values())
    routes = {
        "A_local_onnx": {
            "dimensions": [768], "model_bytes": onnx_model, "runtime_bytes": onnx_runtime,
            "temporary_model_bytes": onnx["onnx/model.onnx"] + onnx_wheels,
            "network": "descarga única del modelo (Hugging Face) y de las ruedas (PyPI); después ninguna",
            "operational_dependency": "runtime nuevo onnxruntime+tokenizers+numpy en el worker",
            "profile": "nomic-ai/nomic-embed-text-v1.5@e9b6763023c6, ONNX fp32, 768, coseno",
            "sources": ["T005c-model-declared.json", "T005c-runtime-measured.json"]},
        "B_local_ollama": {
            "dimensions": [768], "model_bytes": ollama["totalBytes"], "runtime_bytes": 0,
            "temporary_model_bytes": ollama["totalBytes"],
            "network": "descarga única del modelo (registry.ollama.ai); después ninguna",
            "operational_dependency": "thyrox-ollama (corriendo) y el volumen thyrox-ollama-models, "
                                      "que hoy administra la otra sesión",
            "profile": "ollama library/nomic-embed-text:latest, GGUF F16, 768, coseno",
            "sources": ["T005c-route-ollama-declared.json"]},
        "C_api": {
            "dimensions": list(C_DIMENSIONS), "model_bytes": 0, "runtime_bytes": 0, "temporary_model_bytes": 0,
            "network": "una llamada por lote durante toda la ingesta, y otra por consulta",
            "operational_dependency": "el upstream OpenAI-compatible (THYROX_OPENAI_COMPAT_*); "
                                      "no consta que sirva /v1/embeddings ni con qué modelo y dimensión",
            "profile": "desconocido hasta sondear el upstream",
            "sources": []},
    }
    free = shutil.disk_usage(outputs).free
    rows = []
    for route, spec in routes.items():
        for scope, text_bytes in scopes.items():
            for dimensions in spec["dimensions"]:
                pg_terms = postgres_terms(text_bytes, ratio, average_chunk, dimensions, max_wal)
                temporary = spec["temporary_model_bytes"] + INGESTION_BATCH_BYTES
                persistent = spec["model_bytes"] + spec["runtime_bytes"] + pg_terms["persistent_bytes"]
                required = persistent + pg_terms["operational_headroom_bytes"] + temporary
                rows.append({"route": route, "scope": scope, "dimensions": dimensions,
                             "persistent_disk_bytes": persistent, "temporary_disk_peak_bytes": temporary,
                             "model_bytes": spec["model_bytes"], "runtime_bytes": spec["runtime_bytes"],
                             "expected_postgres_bytes": pg_terms["persistent_bytes"],
                             "postgres_operational_headroom_bytes": pg_terms["operational_headroom_bytes"],
                             "estimated_chunks": pg_terms["chunks"], "required_bytes": required,
                             "fits_free_now": free >= required, "qualification": "none: embedding@1 not defined",
                             "network": spec["network"], "operational_dependency": spec["operational_dependency"],
                             "embedding_profile": spec["profile"]})
    result = {"free_bytes_observed": free, "ratio_stored_bytes_per_text_byte": round(ratio, 3),
              "average_chunk_text_bytes": round(average_chunk), "scopes": scopes, "routes": routes, "rows": rows,
              "note": "C no exige disco de modelo, pero PostgreSQL, HNSW, WAL, texto y lotes se presupuestan igual"}
    report.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    for row in rows:
        print(f"{row['route']:15} {row['scope']:34} dim={row['dimensions']:4} required={row['required_bytes']:>13,} "
              f"fits={row['fits_free_now']}")
    print(f"free={free:,}")
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1]), Path(sys.argv[2])))
