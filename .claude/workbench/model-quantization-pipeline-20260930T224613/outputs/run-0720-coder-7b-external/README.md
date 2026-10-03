# TASK-THYROX-0720 — Qwen2.5-Coder-7B-Instruct Q4_K_M publicado, procedencia external

Adquirido el 2026-10-01 con `bin/local-models-import run`, sha256 fijado al
pedirlo, lease por Redis, admisión de disco y memoria, validación en el
laboratorio por la primitiva `@thyrox/podman-execution`. No lo cuantizó
thyrox, y `provenance.json` lo declara `external`.

| Medida | Valor |
|---|---|
| Origen | `Qwen/Qwen2.5-Coder-7B-Instruct-GGUF` @ `13fb94bfda8c8cf22497dc57b78f391a9acb426a` |
| Archivo | `qwen2.5-coder-7b-instruct-q4_k_m.gguf`, 4 683 073 536 bytes |
| sha256 | `509287f78cb4d4cf6b3843734733b914b2c158e43e22a7f4bf5e963800894d3c` (fijado y verificado) |
| Licencia | apache-2.0 (ficha del repositorio) |
| Adquirido | 2026-10-01T02:45:12.457Z |
| Validación | abre como GGUF, `file_type` Q4_K_M, `llama-simple` generó texto a 3,73 t/s, perplejidad 2,5621 (`-c 128 -t 4`, README + LICENSE de este repositorio) |
| Catálogo | `thyrox-qwen--qwen2.5-coder-7b-instruct-gguf:q4_k_m-hf-13fb94bfda8c`, contexto declarado 131 072 |
| Libre tras adquirir | 3 809 333 248 bytes |

**Las perplejidades de 0718 y 0720 no se comparan:** cada una se midió sobre
el README y la LICENSE de su propio repositorio, que son textos distintos.

**Defecto encontrado por la medición y corregido en el mismo pase.** La
primera reejecución rehusó (`refusal.json`, conservado como evidencia): el
preflight pedía los 4,95 GB completos aunque el archivo ya estaba en disco y
verificado. Ahora se reserva sólo lo que falta; una prueba lo fija
(`a rerun asks only for the bytes still missing from the scratch`). Tras la
corrección, la misma orden sale 0 en 21 s, sin descargar ni validar de nuevo
y conservando la fecha de adquisición.

**Lo que esto no hace:** no cualifica el modelo. Entra al catálogo como
candidato; la cualificación de protocolo y de tarea es aparte, y su uso
productivo pasa por el `ExecutionGrant` (TASK-THYROX-0699, 0702).

*Métrica:* `provenance.json` e `import.json` que escribe el propio flujo,
salida de `llama-simple` y `llama-perplexity`.
*Ciega a:* el pico de memoria de la validación, que este flujo aún no
registra (el de 0718 sí lo hace por paso).
