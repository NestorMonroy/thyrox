"""T005c: capacidad que exige el productor de embeddings y la ingesta (§23.3).

Cada término lleva su fórmula y su fuente; ninguno se declara a ojo. Compara la
suma con el libre observado y con el libre que quedaría tras T005a, y registra
el déficit si no cabe. No borra ni instala nada.

Uso: t005c_capacity.py <outputs> <salida.json>
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

HALFVEC_DIMENSIONS = 768
HALFVEC_BYTES = 2 * HALFVEC_DIMENSIONS + 8      # pgvector: 2 B por dimensión + cabecera varlena de 8 B
HEAP_ROW_OVERHEAD = 24 + 4                      # cabecera de tupla + puntero de línea (PostgreSQL)
BIT_BYTES = HALFVEC_DIMENSIONS // 8 + 8         # bit(768) + cabecera
HNSW_LAYER0_NEIGHBORS = 2 * 16                  # 2·m, m = 16 por defecto de pgvector
HNSW_NEIGHBOR_TID_BYTES = 6
MVCC_FRACTION = 0.20
INGESTION_BATCH_BYTES = 64 * 1024 * 1024
MODEL_FILES = ("onnx/model.onnx", "tokenizer.json", "config.json", "tokenizer_config.json",
               "special_tokens_map.json", "vocab.txt")


def load(outputs: Path, name: str) -> dict:
    return json.loads((outputs / name).read_text())


def main(outputs: Path, report: Path) -> int:
    inventory = load(outputs, "T005b-corpus-inventory.json")["totals"]
    pg = load(outputs, "T005c-pg-measured.json")
    empty = load(outputs, "T001-corpus-state.json")
    runtime = load(outputs, "T005c-runtime-measured.json")
    model = load(outputs, "T005c-model-declared.json")
    headroom = load(outputs, "T005-inventory.json")

    chunk_count = pg["counts"]["document_chunks"]
    stored_growth = pg["databaseBytes"] - empty["databaseBytes"]
    bytes_per_text_byte = stored_growth / pg["chunkTextBytes"]
    average_chunk_text = pg["chunkTextBytes"] / chunk_count
    indexable_text = inventory["semantic_bytes"] + inventory["durable_evidence_bytes"]
    new_chunks = round(indexable_text / average_chunk_text)
    files = {f["path"]: f["bytes"] for f in model["files"]}
    model_bytes = sum(files[name] for name in MODEL_FILES)
    wheels = runtime["wheels"].values()
    max_wal = next(int(s["setting"]) for s in pg["settings"] if s["name"] == "max_wal_size") * 1024 * 1024

    terms = {
        "embedding_model_bytes": {
            "bytes": model_bytes,
            "formula": "suma de " + ", ".join(MODEL_FILES),
            "source": f"T005c-model-declared.json ({model['id']}@{model['sha']}); T008 lo sustituye al medir"},
        "runtime_bytes": {
            "bytes": sum(w["installedBytes"] + w["wheelBytes"] for w in wheels),
            "formula": "bytes instalados + rueda descargada durante la instalación, por paquete",
            "source": "T005c-runtime-measured.json (ruedas verificadas por sha256)"},
        "estimated_new_postgres_text_bytes": {
            "bytes": round(indexable_text * bytes_per_text_byte),
            "formula": f"(semantic_bytes + durable_evidence_bytes) × {bytes_per_text_byte:.3f} B almacenado por B de texto",
            "source": f"T005b totales; razón medida: crecimiento {stored_growth} B (T001 vacío → hoy) / {pg['chunkTextBytes']} B de texto de chunk"},
        "estimated_embedding_bytes": {
            "bytes": new_chunks * (HALFVEC_BYTES + HEAP_ROW_OVERHEAD),
            "formula": f"chunks × (halfvec(768) {HALFVEC_BYTES} B + fila {HEAP_ROW_OVERHEAD} B); chunks = texto indexable / {average_chunk_text:.0f} B medio por chunk",
            "source": "formato de almacenamiento de pgvector 0.8.0; media de chunk medida en document_chunks"},
        "estimated_index_bytes": {
            "bytes": new_chunks * (BIT_BYTES + HEAP_ROW_OVERHEAD + HNSW_LAYER0_NEIGHBORS * HNSW_NEIGHBOR_TID_BYTES),
            "formula": f"chunks × (bit(768) {BIT_BYTES} B + tupla {HEAP_ROW_OVERHEAD} B + capa 0 {HNSW_LAYER0_NEIGHBORS}×{HNSW_NEIGHBOR_TID_BYTES} B); los índices de texto ya están en la razón medida",
            "source": "HNSW de pgvector, m = 16"},
        "postgres_operational_headroom": {"bytes": 0, "formula": "", "source": ""},
        "ingestion_temporary_headroom": {
            "bytes": files["onnx/model.onnx"] + INGESTION_BATCH_BYTES,
            "formula": "una descarga del modelo en curso + un lote de ingesta en memoria volcado a disco",
            "source": "declarado del artefacto; lote de 64 MiB"},
    }
    data_bytes = sum(terms[k]["bytes"] for k in ("estimated_new_postgres_text_bytes", "estimated_embedding_bytes",
                                                 "estimated_index_bytes"))
    terms["postgres_operational_headroom"] = {
        "bytes": max_wal + round(data_bytes * MVCC_FRACTION),
        "formula": f"max_wal_size + {MVCC_FRACTION:.0%} de lo que se añade (MVCC, páginas a medio llenar)",
        "source": "pg_settings medido en T005c-pg-measured.json"}
    required = sum(term["bytes"] for term in terms.values())
    free_now = shutil.disk_usage(outputs).free
    t005a = sum(row.get("expected_reclaim_bytes", 0) for row in headroom["rows"]
                if row.get("safe_to_delete") and row.get("resource", "").startswith(("image:ghcr.io/ggml-org/llama.cpp", "path:/root/.npm/_cacache")))
    free_after_t005a = free_now + t005a
    result = {
        "required_bytes": required, "terms": terms,
        "free_bytes_observed": free_now, "t005a_expected_reclaim_bytes": t005a,
        "free_after_T005a": free_after_t005a,
        "fits_now": free_now >= required, "fits_after_T005a": free_after_t005a >= required,
        "deficit_after_T005a_bytes": max(0, required - free_after_t005a),
        "chunk_estimate_correction": {
            "t005b_estimated_chunks": inventory["estimated_chunks"], "measured_average_chunk_text_bytes": round(average_chunk_text),
            "estimated_chunks_with_measured_average": new_chunks,
            "note": "T005b supuso chunks llenos de 2000 caracteres; la media medida es menor, así que hay más chunks"},
        "scope_note": "el texto indexable incluye durable_evidence (§22.5: semantic_value o durable_evidence recuperable); "
                      "durable_evidence versionado en git no se libera al ingerirlo",
    }
    report.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: result[k] for k in ("required_bytes", "free_bytes_observed", "free_after_T005a",
                                              "fits_after_T005a", "deficit_after_T005a_bytes")}))
    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1]), Path(sys.argv[2])))
