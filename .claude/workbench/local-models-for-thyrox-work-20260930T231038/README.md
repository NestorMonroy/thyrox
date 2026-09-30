# local-models-for-thyrox-work

Directiva del ejecutor 2026-09-30: buscar modelos que ayuden con lo que thyrox
hace —tareas de implementación pendientes, traducción, los `bin/` que usan
modelos— y el flujo para usarlos vía Podman. Tareas: TASK-THYROX-0694 (pipeline)
y TASK-THYROX-0663 (el recomendador deriva un modelo abierto).

## Quién usa un modelo hoy (`probes/bin_model_consumers.sh`, `outputs/bin-model-consumers.tsv`)

El censo por marcas literales encuentra 27 comandos, y casi todos sólo NOMBRAN
un modelo. Los que lanzan uno de verdad:

| Consumidor | Cómo | Modelo hoy |
|---|---|---|
| `headless-pool` | un `thyrox -p` por ítem; `--task-class` → `bin/agent-recommend` | Claude: `mecanica` → `claude-haiku-4-5`, el resto opus/sonnet/fable |
| `tsc_cycle`, `pool-calibrate` | lanzan `headless-pool` con su clase | ídem |
| traducción (identificadores y prosa) | la hacen ítems de pool o agentes | Claude |
| `semantic-search` | el store existe (ADR-008) pero **no hay embedder**: nada produce vectores | ninguno |

*Métrica:* marcas literales en el guion destino de cada envoltorio.
*Ciega a:* un modelo que se llame desde un módulo importado y no desde el guion.

## La cadena ya funciona de extremo a extremo (`outputs/e2e-thyrox-p-*.txt`)

`thyrox -p --model thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701`
con `THYROX_OPENAI_COMPAT_BASE_URL=http://127.0.0.1:51434/v1` y el mismo modelo
en `THYROX_OPENAI_COMPAT_MODEL`: el proxy local se lanza solo, enruta al
upstream OpenAI-compatible y `thyrox-ollama` responde (exit 0). Dos hallazgos:

1. **El guard SSRF rehúsa el loopback** (`baseUrl insegura`) salvo con
   `THYROX_GATEWAY_ALLOW_LOOPBACK=1`, y el servicio gestionado es loopback por
   diseño (ADR-007, Regla 5). Hoy lo tiene que declarar quien llama.
2. **Un 0.5B no sirve para trabajo de thyrox:** con el prompt de sistema y las
   herramientas de `thyrox -p`, a «What is 2+2? Answer with only the number.»
   respondió `3` (por la API directa, sin ese prompt, responde `4`).

## Candidatos, medidos en el registro sin descargar (`probes/registry_candidates.sh`)

`outputs/registry-candidates.tsv`: bytes de la capa de pesos y los 12 hex del
sha256 del manifiesto, que es el ID que `ollama list` muestra (comprobado:
`qwen2.5:0.5b` → `a8b0c5157701` por los dos caminos) y la revisión del
contrato de nombre.

| Uso | Candidato | Pesos |
|---|---|---|
| implementación | qwen2.5-coder 1.5b · 3b · 7b | 0.99 · 1.93 · 4.68 GB |
| implementación | qwen3 4b · 8b | 2.50 · 5.23 GB |
| traducción | qwen2.5 3b · 7b · llama3.2 3b | 1.93 · 4.68 · 2.02 GB |
| embeddings | nomic-embed-text · qwen3-embedding 0.6b · embeddinggemma · bge-m3 | 0.27 · 0.64 · 0.62 · 1.16 GB |

Recursos al medir: 4 núcleos, sin GPU, 16.9 GB de RAM con 5.2 GB disponibles
(tres pools corriendo), 8.0 GB de disco libre. Un 7B (4.7 GB de pesos más KV
cache) no cabe hoy en RAM junto a los pools; cabe en disco.

## Benchmark de tool calling (`outputs/benchmark.tsv`)

El instrumento es el de `ollama-cpu-benchmark-20260930T191740`: contenedor de
laboratorio propio, un candidato a la vez (lo borra antes del siguiente), seis
casos deterministas por `/v1/chat/completions`, RAM del cgroup, carga,
primer token, tokens/s y 1/2/4 peticiones concurrentes. Corre con contención:
los tiempos no son la cifra de la máquina en reposo; los aciertos sí se comparan.
