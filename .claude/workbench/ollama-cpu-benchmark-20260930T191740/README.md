# ollama-cpu-benchmark

## El encargo

> «escoger el modelo para ítems del pool con tool calling mediante benchmark
> CPU. No tomes `qwen2.5:0.5b` como modelo final sólo porque fue el usado para
> comprobar la descarga [...] publica al menos: tool calling correcto;
> latencia al primer token; tokens/s; RAM pico; tamaño en disco; tiempo de
> carga; comportamiento bajo concurrencia; compatibilidad con el upstream
> OpenAI-compatible.» — ejecutor, 2026-09-30, TASK-THYROX-0662.

## La premisa, si se corrigio al primer comando

Ninguna todavía. Las condiciones de la medición: Ollama
`docker.io/ollama/ollama:0.35.0` en Podman con `--network host`,
`OLLAMA_HOST=127.0.0.1:11536`, `OLLAMA_NUM_PARALLEL=4`, 4 núcleos y 16 GiB de
RAM, sin GPU.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/benchmark.py` | mide cada candidato de a uno y lo borra antes del siguiente, para acotar el disco |
| `outputs/smoke.tsv`, `outputs/smoke.jsonl` | prueba del instrumento con `qwen2.5:0.5b`, corrida **con dos pools en paralelo**: valida la mecánica, sus tiempos no son comparables |
| `outputs/benchmark.tsv`, `outputs/benchmark.jsonl` | la medición, corrida sin otros trabajos en la máquina |

## Los casos de tool calling

Todos por `/v1/chat/completions` (el contrato que consume el upstream de
TASK-THYROX-0661), temperatura 0 y semilla 7:

| caso | qué exige |
|---|---|
| `single_tool` | `get_weather{"city":"Madrid"}` |
| `integer_arguments` | `add{"a":17,"b":25}` con enteros, no cadenas |
| `choose_between_tools` | elegir `read_file` y no `list_dir` |
| `enum_argument` | `set_mode{"mode":"safe"}` dentro del enum |
| `no_tool_needed` | no llamar herramienta cuando no hace falta |
| `continuation_after_tool` | tras el `tool_result` con id `call_1`, usar el `42` |

## Los resultados

Pendientes de la corrida sin contención.

*Metrica:* por candidato, n = 1 por caso: tamaño y tiempo de descarga, tiempo
de carga (`load_duration`), `memory.current` del cgroup en reposo, cargado y
pico muestreado cada 0.2 s, latencia al primer fragmento en streaming,
tokens/s declarados por Ollama, aciertos sobre los seis casos y pared de 1, 2
y 4 peticiones simultáneas.
*Ciega a:* la variación entre corridas; la calidad fuera de estos seis casos
(un modelo que acierta aquí puede fallar en un ítem real del pool); la GPU; y
a que la RAM del cgroup incluye la caché de páginas del archivo del modelo.
