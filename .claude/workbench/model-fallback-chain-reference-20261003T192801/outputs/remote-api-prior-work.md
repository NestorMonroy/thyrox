# Lo que ya probamos con modelos por API — revisión de los bancos

Encargo: «un modelo remoto entraría en la cadena, solo si se tiene API, revisa
todas las pruebas que hemos realizado y revisa como es que los hemos hecho»
(ejecutor, 2026-10-03). Fuente: `rg` sobre `.claude/workbench/` (683 bancos)
por dashscope, qwencloud, token-plan, deepseek, openai-compatible,
providerSelection; leídos los que concentran las coincidencias.

## Cómo se ejecutó un modelo por API

`provider-selection-migration-20261002T105550/probes/delegate.sh` (copiado de
`mechanism-registry-20261002T061646`):

- **Protocolo Anthropic, sin traductor:** `ANTHROPIC_BASE_URL=https://token-plan.maas.qwencloudapi.com/apps/anthropic`;
  `thyrox -p --model qwen3.8-flash|deepseek-v4.1-flash` le habla directo.
- **La credencial es un ExecutionSecret montado** en la unidad
  (`/run/secrets/THYROX_OPENAI_COMPAT_API_KEY`) y pasa sólo al entorno del
  proceso `thyrox -p`. Sin el archivo, sale 2: **sin API no hay ejecución**.
- **Contexto:** `THYROX_CODE_DECLARED_CONTEXT_WINDOW=110000` como techo operativo.
- **Vigilancia:** inactividad medida (transcript o CPU del árbol) → 125.
- **Rastro:** una línea por ejecución en `outputs/cutover-executions.jsonl`
  con proveedor, modelo, tokens y `claudeInvocations: 0`.

## Qué se midió

| medición | banco | resultado |
|---|---|---|
| ¿el 502 depende del tamaño? | `managed-podman-execution-boundary-20261001T164746/outputs/p2-provider-502-size.txt` | no: 344 447 tokens de entrada responden 200; los trabajadores fallaron entre 66 k y 91 k. Sin causa medida → `provider_transient` |
| coste por agente mediano | `flash-model-cost-20261001T160947` | lo decide el precio de caché (98.32 % de la entrada es caché); deepseek-v4.1-flash off-peak 0.14 USD, qwen3.8-flash 3.39 USD sin descuento de caché |
| T001 de TASK-THYROX-0750 delegado por API | `provider-selection-migration-20261002T105550/outputs/continuation.jsonl` | 4 intentos (3 qwen3.8-flash, 1 deepseek-v4.1-flash), los cuatro `502 upstream`; T001 nunca se integró |

## Lo que quedó en el árbol y lo que no

| pieza | estado |
|---|---|
| `selectProvider` genérico (`258ca8791`) | en el árbol; sin consumidor fuera de su prueba |
| catálogo de API de Model Studio (`95b0729cf`, `apiModels/alibaba-model-studio.tsv`, 51 modelos) | en el árbol |
| `candidateSources.ts` (T001) | **no** |
| `providers.tsv` + `providerRegistry.ts` + `bin/select-provider` (T002) | **no** |
| migrar `recommend.ts`, `headless-pool`, `tsc_cycle`, `task_continuation` a esa entrada | **no** |

## Consecuencia

El diseño de T002 ya responde «sólo si se tiene API»: cada fila del registro
lleva `secretName` (el NOMBRE, nunca el valor), y un proveedor participa sólo
si la política lo lista. Falta lo que lo haría verdad en ejecución: que un
remoto sin su secreto presente no sea elegible (hoy `delegate.sh` lo descubre
al lanzar y sale 2). La cadena de TASK-THYROX-0920/0923 vive en la vía que 0750
iba a migrar (H-THYROX-453): las dos tienen que converger en una sola autoridad.

## Los endpoints de Qwen Cloud, declarados por el ejecutor (2026-10-03)

Transcritos de la consola de Qwen Cloud, sin parafrasear las URL:

| plan | protocolo | base URL |
|---|---|---|
| Token Plan (Individual) | OpenAI | `https://token-plan.maas.qwencloudapi.com/compatible-mode/v1` |
| Token Plan (Individual) | Anthropic | `https://token-plan.maas.qwencloudapi.com/apps/anthropic` |
| Pay-As-You-Go | OpenAI | `https://maas.qwencloudapi.com/compatible-mode/v1` |
| Pay-As-You-Go | Anthropic | `https://maas.qwencloudapi.com/apps/anthropic` |

Contra lo medido:

- Los dos de Token Plan son los que T002 ya declaraba; el de Anthropic es el
  que usó `delegate.sh`.
- **Pay-As-You-Go no aparece en ningún banco**: es un proveedor nuevo para el
  registro, con dos filas (una por protocolo).
- La consola dice que Pay-As-You-Go usa sus propias claves («API keys for
  Pay-As-You-Go billing»), así que su secreto es otro que el de Token Plan
  (`THYROX_OPENAI_COMPAT_API_KEY`). Su NOMBRE no está decidido y no se
  inventa aquí: lo fija la tarea del registro.
- Regla para el registro: cada fila (proveedor, protocolo) es elegible sólo si
  su secreto está presente. Con la clave de Token Plan sola, Pay-As-You-Go no
  participa, y al revés.
- Ninguna de las cuatro URL se probó en esta sesión. Lo medido por API son los
  4 intentos de T001 contra el de Anthropic de Token Plan (502) y las sondas
  de tamaño y caché de los bancos citados arriba.

## Cómo los estábamos usando (segunda pasada, 2026-10-03)

Censo: las URL de Qwen Cloud aparecen SÓLO en bancos — cero en `src/`, `bin/`
y `tests/`. 66 menciones del endpoint Anthropic de Token Plan, 3 del OpenAI
de Token Plan, ninguna de Pay-As-You-Go antes de hoy.

- **Credencial:** siempre `THYROX_OPENAI_COMPAT_API_KEY`, de `.env`, entregada a
  la unidad como `ExecutionSecret` (`--secret-from-env`, montaje en
  `/run/secrets/THYROX_OPENAI_COMPAT_API_KEY`), nunca por argv ni `--env`, y
  sólo al entorno de `thyrox -p`.
  `managed-podman-execution-boundary-20261001T164746/outputs/cutover-bootstrap.md`.
- **Cualificación de un modelo por API, ya hecha como sonda de banco**
  (`managed-podman-execution-boundary-*/probes/cutover_bootstrap.sh`, contra el
  endpoint OpenAI de Token Plan): secreto visible, autenticación, respuesta
  simple, contexto ×2 (caché del proveedor), tool call estructurado, lectura,
  modificación controlada, resultado parseable de `thyrox -p`, cero Claude.
  qwen3.8-flash y deepseek-v4.1-flash pasaron; deepseek siguió instrucciones
  exactas. El banco la declara «uso experimental, no cualificación
  productiva»: no escribió en el registro de cualificaciones.
- **Rutas:** `local-models-publication-20261002T114251/outputs/route-probe-*.tsv`
  midió las dos rutas de Token Plan: 200 en las dos, pequeño y 40 k. Y una
  señal sobre el 502: deepseek-v4.1-flash **con streaming** 200; **sin
  streaming** con `max_tokens 4000`, 502 «upstream request failed» a los 30.9 s
  (n = 1).
- **Este clon:** `.env` no trae `THYROX_OPENAI_COMPAT_API_KEY` con valor y
  `/run/secrets` está vacío. Con la regla «sólo si se tiene API», hoy ningún
  remoto sería elegible aquí.

Lo que esto fija para la tarea de convergencia: la cualificación remota ya
tiene criterios medidos (los de `cutover_bootstrap.sh`), falta llevarlos de
sonda a producto y escribir su veredicto en el registro de cualificaciones; la
elegibilidad remota exige el secreto presente; y el 502 tiene una pista medida
(sin streaming) que hay que confirmar con n > 1 antes de tratarla como causa.
