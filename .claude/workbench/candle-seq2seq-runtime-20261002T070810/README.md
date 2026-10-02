# candle-seq2seq-runtime

## El encargo

<!-- verbatim, sin parafrasear -->

> si, la implementacion de MADLAD, considera usar clean-code revisa las reglas, de igual manera los nombres de archivos, clases, funciones firmas de funciones e identificadores son en ingles, los comentarios pueden ir en español pero sin coloquialismos, en donde los términos técnicos se quedan en ingles

## La premisa, si se corrigio al primer comando

Se suponía que MADLAD correría en el runtime de Transformers o en Ollama. La
cabecera de `google/madlad400-3b-mt@fa184c67:model-q4k.gguf` (leída por rango
HTTP, sin descargar) es GGUF v2 con cero metadatos y 742 tensores con nombres
de Hugging Face (578 Q4K, 164 F32): el formato de candle. Ollama, llama.cpp y
la carga GGUF de Transformers exigen `general.architecture`; el safetensors
oficial pesa 11 761 587 872 B. La única copia oficial que cabe en disco exige
un runtime de candle.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/candle-worker/Cargo.toml` | el worker: candle 0.11.0 fijado, tokenizers 0.22 |
| `probes/candle-worker/Cargo.lock` | resuelto en una unidad con `cargo generate-lockfile` |
| `probes/unit-cargo.sh` | una ExecutionUnit de TASK-THYROX-0764 con el toolchain de Rust del anfitrión montado |

## Los resultados

**En curso.** Pausado por la integración de `feature/complete-orm-root`, que
destapó la colisión de citas TASK-THYROX-0754…0764 y H-THYROX-311/312 entre las
dos ramas; la renumeración espera la decisión del ejecutor.

*Metrica:* pendiente.
*Ciega a:* pendiente.
