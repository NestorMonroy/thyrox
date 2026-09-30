# Análisis — pipeline de modelos locales, agnóstico del modelo

Tarea: TASK-THYROX-0694. Directivas del ejecutor 2026-09-30: *«Ollama tiene que
ser usado realmente por Thyrox»*; el pipeline *«tiene que ser para cualquier
modelo»*; *«si ya tienes qwen2.5:0.5b úsalo»*; y el nombre de cada modelo lo
identifica —nombre y versión correctos— con el prefijo `thyrox-`, para que N
modelos convivan sin interferencia.

## Lo medido (este banco)

| Medición | Resultado | Evidencia |
|---|---|---|
| `ollama create --quantize` (0.35.0) | sólo `int4, int8, nvfp4, mxfp4, mxfp8`, y sólo desde **safetensors**; rechaza `q8_0` y `q4_K_M` | `outputs/ollama-quantize-targets.txt`, log de `quant-lab` |
| tipos GGUF que el binario de Ollama **lee** | `Q2_K`…`Q8_0`, `IQ*`, `F16`, `BF16`, `MXFP4` | `outputs/ollama-binary-capabilities.txt` |
| llama.cpp en la imagen de Ollama | sólo bibliotecas (`libllama-quantize-impl.so`), sin CLI | ídem |
| imagen `ghcr.io/ggml-org/llama.cpp:full` | 1 137 637 540 bytes comprimidos, 2 957 557 436 locales; pull 42 s; trae `convert_hf_to_gguf.py`, `llama-quantize`, `llama-perplexity`, `llama-bench` | `outputs/llama-cpp-image-layers.txt`, `outputs/llama-cpp-image-contents.txt` |
| fuente HF `Qwen/Qwen2.5-0.5B-Instruct` | revisión `7ae557604adf…`, 999 586 347 bytes, BF16, `Qwen2ForCausalLM`, 24 capas, 2 cabezas KV | log de `quant-lab` |
| disco libre al empezar | 14 796 386 304 bytes | `df` |

Consecuencia: **las cuantizaciones K de GGUF las produce llama.cpp**; Ollama es
el runtime que las sirve (y un cuantizador sólo para safetensors a int4/int8/
fp4/fp8). El pipeline tiene dos backends de cuantización, no uno.

## El flujo, con sus dueños

```
fuente (HF safetensors @revisión | GGUF ya cuantizado | registro de Ollama)
   │  ModelSource: descarga fijada a una revisión, sha256 por archivo, disco admitido
   ▼
GGUF F16/BF16            ModelConverter  (llama.cpp convert_hf_to_gguf.py)
   │
   ▼
GGUF Q8_0/Q6_K/Q5_K_M/Q4_K_M/…   ModelQuantizer (llama.cpp llama-quantize | Ollama create -q para int4/int8)
   │
   ▼
validación               perplexity (llama-perplexity), inferencia mínima,
   │                     tokens/s, carga, RAM del cgroup (container_measure)
   ▼
registro en un runtime   RuntimeRegistrar (Ollama: API de blobs + /api/create)
   │                     con el NOMBRE del contrato de abajo
   ▼
uso                      proxy local, upstream OpenAI-compatible → modelo por nombre
```

Cada paso de llama.cpp es un **worker efímero** (sin red, volúmenes de fuente
`ro` y de artefactos `rw`) sobre la primitiva `@thyrox/podman-execution`; Ollama
es **infraestructura** (`thyrox-ollama`). Los artefactos viven en un volumen con
nombre, no en el contenedor.

## El contrato de nombre

`thyrox-<org>--<repo>:<quant>-<source>-<revision12>`, todo en minúsculas:

| Parte | Regla | Ejemplo |
|---|---|---|
| prefijo | `thyrox-`: separa lo que thyrox gestiona de lo que un usuario creó a mano | `thyrox-` |
| `<org>--<repo>` | el repositorio de origen, con `--` entre organización y repo (convención de la caché de HF) — dos fine-tunes del mismo nombre de repo no chocan; del registro de Ollama, `<namespace>--<modelo>-<etiqueta>` | `qwen--qwen2.5-0.5b-instruct`, `library--qwen2.5-0.5b` |
| `<quant>` | nivel de cuantización normalizado | `q4_k_m`, `q8_0`, `f16`, `int4` |
| `<source>` | de dónde salió el peso: `hf` (convertido aquí) u `ollama` (registro) | `hf` |
| `<revision12>` | 12 hex de la revisión de origen: commit de HF o digest del manifiesto del registro | `7ae557604adf` |

Así, el mismo modelo en dos revisiones, o en dos niveles, son dos nombres; y
cualquier nombre dice de qué revisión exacta salió.

## Memoria y disco (lo que admite la infraestructura existente)

- **Disco** (`resource_admission disk-admit`): fuente + F16 + cada nivel, antes
  de empezar; el F16 se retira al terminar si el ejecutor no pide conservarlo.
  Un 27B desde BF16 necesita ~54 GB de fuente + ~54 GB de F16: aquí se rehúsa
  con la cifra, no falla a mitad.
- **RAM/VRAM al servir** (`resource_admission`, `gpuAdmission`): peso del GGUF
  + KV cache (`2 × capas × contexto × cabezas_kv × dim_cabeza × bytes`) + buffers;
  los parámetros salen de la metadata GGUF (`llama.block_count`,
  `*.attention.head_count_kv`, …), no de una tabla escrita a mano.

## Tareas que se derivan

1. **Contrato de nombre y metadata de artefacto** (`model-artifacts`, TS, TDD):
   `thyroxModelName`, normalización de niveles, manifiesto de procedencia.
2. **Backend llama.cpp** (convert + quantize + perplexity) sobre la primitiva.
3. **Registrador Ollama** por API de blobs, con el nombre del contrato, y el
   renombrado de lo ya servido (`qwen2.5:0.5b`).
4. **Estimador de memoria** desde metadata GGUF → admisión.
5. **Uso**: el proxy local enruta el modelo `thyrox-…` al servicio gestionado sin
   que el usuario declare URL (TASK-THYROX-0663 y P12).

## Registro con nombre del contrato (medido, `outputs/register-contract-names.txt`)

Ollama acepta los tres nombres del contrato; `qwen2.5:0.5b` se copió a
`thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701` y el nombre ambiguo
se retiró (comparten blobs: sin espacio extra). Los GGUF convertidos aquí se
registraron como `thyrox-qwen--qwen2.5-0.5b-instruct:{q8_0,q4_k_m}-hf-7ae557604adf`.

**El import por `files` no basta.** Sin más, Ollama guarda la plantilla Jinja
del GGUF (`tokenizer.chat_template`) y ningún `system`; el registrador tiene
que fijar la plantilla Go y el `system` de la familia (aquí, los del modelo del
registro de la misma familia). Con ellos, `outputs/compare-answers.txt`:

| Pregunta | registro Q4_K_M | propio Q4_K_M | propio Q8_0 |
|---|---|---|---|
| 2+2 | 4 | 4 | 4 |
| capital de Francia | Paris | Paris | Paris |
| «Reply with the single word: ready» | ready | processing | processing |

Los tres terminan en `stop`. La tercera es una instrucción ambigua para un
0.5B en decodificación voraz: la diferencia de pesos (otra conversión, otra
revisión) cambia la palabra elegida, no la capacidad de responder.

*Métrica:* respuesta a tres preguntas cerradas, temperatura 0, semilla 7, n = 1.
*Ciega a:* calidad general (eso lo mide la perplexity y el benchmark de tool
calling) y a rendimiento: la carga media era 22–27 sobre 4 núcleos con dos
pools en paralelo, así que ningún tokens/s de este banco es comparable.
