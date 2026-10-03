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

| Modelo | Tool calling | Tokens/s | RAM cargada |
|---|---|---|---|
| `qwen2.5-coder:1.5b` | 1/6 | 11,5 | 2,86 GB |
| `qwen2.5-coder:3b` | 1/6 | 0,3 (contención) | 6,78 GB |
| **`qwen2.5:3b`** | **6/6** | 8,0 | 7,87 GB |
| `llama3.2:3b` | 5/6 | 8,2 | 12,34 GB |
| `qwen3:4b` | **no medido** | — | — |

`qwen3:4b` no se midió: el benchmark se detuvo cuando la RAM disponible cayó
a 2,28 GB con el ítem de TASK-THYROX-0691 corriendo al lado. El laboratorio
no pasa por la admisión de recursos, así que ya había provocado un OOM sobre
un ítem del pool; se prefirió declarar el hueco a repetirlo.

Los `coder` fallan el tool calling (1/6) aunque declaran la capacidad
`tools`: emiten la llamada como texto en vez de `tool_calls`. El candidato
para el trabajo de thyrox es `qwen2.5:3b`. La RAM cargada incluye la del
servidor y crece con el contexto que cada candidato reserva, así que compara
el perfil de despliegue, no el tamaño del modelo.

*Métrica:* casos deterministas acertados y tokens/s por `/v1/chat/completions`.
*Ciega a:* la calidad de implementación o traducción más allá del formato de
la llamada, y al reposo de la máquina (carga media ~22 durante la medición).

## La política de loopback, corregida, y el criterio de aceptación

Directiva del ejecutor: no compensar en el wrapper una política incorrecta de
una capa inferior. `isSafeUpstreamUrl()` acepta loopback por defecto
(`97fbdc34e`); `THYROX_GATEWAY_ALLOW_LOOPBACK` se retiró.
`probes/e2e_local_model.sh` → `outputs/e2e-without-exception.txt`:
`variables_de_excepcion_en_el_entorno=0`, respuesta `ready`, `exit=0`.

## Los 9,3 GB son la imagen, no el modelo (`outputs/ollama-image-breakdown.txt`)

La necesidad de disco de `thyrox-ollama` (3,75 GB comprimidos + 5,51 GB
desempaquetados, durante el pull) es del SOFTWARE; los pesos viven aparte en
el volumen (0,4 GB para el 0.5B Q4_K_M) y cuantizar reduce sólo esos. De los
5,5 GB de la imagen, 4,7 son backends de GPU: `mlx_cuda_v13` 2,7 GB,
`cuda_v12` 1,2 GB, `cuda_v13` 0,8 GB. Una imagen CPU derivada y aplanada
(`probes/ollama-cpu-image/Containerfile`, `outputs/ollama-cpu-image.txt`)
pesa **520 MB** y sirve el mismo modelo del volumen (`4` a 2+2). Encaja con
ADR-007 1.6.0: sin evidencia de GPU, la imagen CPU; con ella, la completa.
