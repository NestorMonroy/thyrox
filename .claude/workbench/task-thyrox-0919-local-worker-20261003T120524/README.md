# task-thyrox-0919-local-worker

## El encargo

<!-- verbatim, sin parafrasear -->
> En cuanto A6 pase, empieza inmediatamente la autoimplementación [...] Selecciona automáticamente una TASK
> real pequeña y compatible con task:mecanica, qwen3-4b, context <= qualification aprobada. [...]
> Prioridad sugerida: 1. mecanismos necesarios para Search Existing permanente [...] El controlador NO
> implementa el código de producto una vez que Qwen pueda hacerlo.
> — el ejecutor, 2026-10-03.

## La premisa, si se corrigio al primer comando

- TASK-THYROX-0769 (registro de mecanismos) es real y pendiente, pero T001 entero —registro, consulta,
  verificador de deriva y gate— excede a un modelo de 4B. Se acota a su consulta:
  `src/verify/search_existing_mechanisms.py` (reglas 1–4, FOUND/RELATED/NONE). Cita propia: TASK-THYROX-0919.
- `headless-pool` rehusaba `--execution unit` con `--isolation worktree`: EXTEND en `bb88cf8a4`.
- Independiente de la cualificación (`batch-worker-mecanica@1`): ningún caso de esa suite es esta tarea.

## Las piezas

| archivo | que hace |
|---|---|
| `tests/verify/test_search_existing_mechanisms.py` | la mitad RED, escrita por el controlador: el contrato del verifier (6 de 8 caen sin implementación; las 2 que pasan se anulan contra la implementación) |
| `prompt.md` | lo que recibe el worker: Search Existing obligatorio con su bloque, contrato, prueba |
| `outputs/` | salida del pool por ítem (`<n>.patch`, `<n>.files`, `<n>.verdict`) e integración |

## Los resultados

*Metrica:* veredicto del verifier por ítem, aserciones de la prueba, modelo y contexto del grant.
*Ciega a:* calidad del código más allá de la prueba.

### r1 — el runner perdió la imagen declarada

`podman-execution-execute: falló la etapa create … Trying to pull localhost/thyrox-task-runner:dev` (la imagen por
defecto, no la de `THYROX_EXEC_IMAGE`). Medido: Bun carga el `.env` del `cwd` (`cwd con .env: si` / `sin .env: ausente`);
en las A6 el `cwd` era la raíz y en modo worktree es el worktree, sin `.env`. EXTEND de la entrada de la primitiva:
`runnerEnvironment` compone el entorno con `readEnvFile` (`@thyrox/paths/reach`) del `.env` del proyecto montado, o
de `THYROX_ENV_FILE`; el proceso gana. RED → GREEN 31/31; anulación: caen exactamente las 2 pruebas nuevas.
Consumidores: ownership 14/14, contención e2e 8/8, aislamiento delegado 4/4, build declarado 13/13; paquete 221/221.

### r2 — corre en Qwen local, pero a <1 tok/s y con razonamiento por acción (H-THYROX-449)

Imagen correcta (`docker.io/th3rox/thyrox-task-runner@sha256:1cced65c…`), exit 124 por timeout a los 5 441 s con el
stream vacío. `llama-server`: 3 turnos; prompt 11 212 → 13 144 tokens; generación 908 / 1 579 / 1 298 tokens a
0.97 / 0.89 / 0.84 tok/s (25, 31 y 27 min por turno). La cualificación midió 3 tok/s con prompts cortos.
La traducción Messages→OpenAI no fija `reasoning_effort` con el razonamiento apagado: Ollama razona por defecto.
Siguiente medición: `probes/think_control.sh` (qué campo apaga el razonamiento en el `/v1` de Ollama).

### Tras r2 — el contenedor del ítem sobrevivió al `timeout`

Tras el exit 124, el contenedor del ítem seguía vivo y su `thyrox -p` seguía pidiendo turnos al modelo
(`n_gen` creciendo con el pool ya cerrado; el coordinador rehusaba pararse con 1 ticket vivo). El `timeout`
mata al runner y la entrada no manejaba señales. `reconcile-orphans` (extendido en `62dfeec20`) lo retiró.
EXTEND: `retireOwnedContainers` (REUSE de `retireOrphanedWorkerContainers` con el PID del propio runner) en
SIGTERM/SIGINT de `bin/execute.ts`. Unitaria: RED → GREEN, anulación exacta. Control real con Podman
(`probes/runner_sigterm.sh`): con el manejador `vivo_tras_sigterm=0`; sin él, `1` (`runner_sigterm.annulled.out`).
La sonda de razonamiento (`probes/think_control.sh`) quedó sin datos: la unidad estaba ocupada por ese cliente.

### El razonamiento por defecto de Qwen3 en Ollama (H-THYROX-449, segunda causa)

`probes/think_control.sh` contra la unidad ociosa, «¿17 + 25?»: por defecto 319 tokens (740 caracteres de
razonamiento) en 90 s; `"reasoning_effort":"none"` 3 tokens en 1 s; `"think":false` 287 tokens y `"low"` 264, los
dos razonando. EXTEND del relé admitido (sólo modelos locales; la traducción compartida no se toca porque otros
upstreams pueden rechazar `"none"`): sin razonamiento pedido, envía `"none"`; el pedido pasa tal cual. RED → GREEN,
anulación exacta. **Sin medir**: la calidad de Qwen3-4B sin razonar en `mecanica` —la cualificación se tomó con
razonamiento—; r3 la mide sobre la TASK real.

### r3 — 18 turnos en 35 min; Search Existing hecho; 13 heredocs sin cuerpo (rechazado)

Con el razonamiento apagado: 18 turnos en 2 088 s (r2: 3 en 5 441 s). El worker corrió las tres búsquedas y
escribió su bloque SEARCH-EXISTING; después emitió 13 veces `cat > src/verify/search_existing_mechanisms.py <<'PY' && chmod +x …`
**en una sola línea**: el cuerpo del heredoc no llegó a la herramienta y el archivo quedó vacío; el verifier lo rechazó.
`probes/multiline_tool_call.sh` mide si los `arguments` crudos de Ollama traen los saltos de línea.

### La caché de prompts de llama-server mató la unidad (OOM)

`dmesg`: `CONSTRAINT_MEMCG … Killed process (llama-server) anon-rss:8353764kB`. El log de la unidad:
«prompt cache is enabled, size limit: 8192 MiB» —el límite entero de la unidad— y, al llegar un prompt de otro
prefijo, «saving prompt with length 13830, total state size = 1945.003 MiB». `LLAMA_ARG_CACHE_RAM` existe en
`libllama-common.so` de la imagen. EXTEND del perfil de Ollama (`OLLAMA_UNIT_ENVIRONMENT` en
`hostCoordinatorComposition.ts`): `LLAMA_ARG_CACHE_RAM=0`. RED → GREEN 7/7; anulación exacta. Pendiente: el log
de una unidad nueva que lo confirme.

### Dónde se pierde el cuerpo del heredoc

- Unidad nueva: `llama-server` registra «prompt cache is disabled» (`LLAMA_ARG_CACHE_RAM=0` confirmado en real).
- `probes/multiline_tool_call.sh` (no-stream): Ollama devuelve `{"command":"cat > /tmp/x.py <<'PY'\nimport sys\nprint(1)\nprint(2)\nPY"}` — saltos de línea intactos.
- Streaming (`probes/heredoc-short.sse`): los `arguments` llegan completos en un fragmento, y
  `probes/translate_sse.ts` —nuestra traducción `messagesEventsFromOpenAISse`— los conserva.
- Falta el caso largo (un programa de ~40 líneas, como en r3): `heredoc-long.sse`.
- Caso largo **con** `&& chmod` en la primera línea (`probes/heredoc-long-chained.sse`): Ollama devuelve sólo esa
  línea. **Sin** el encadenado (`probes/heredoc-long-plain.sse`): el programa completo. Causa: la forma que pedía el
  prompt del controlador (H-THYROX-450). `prompt.md` pide ahora un heredoc sin nada tras `<<'PY'`; sin `chmod`.
