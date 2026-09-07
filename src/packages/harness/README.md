# @thyrox/harness

El **harness** propio: la capa que llama al modelo, atiende sus llamadas a
herramienta y decide cuándo parar. No es un envoltorio del cliente de Claude
Code — es el bucle, con sus herramientas, sus hooks, su transcript y sus
permisos.

Análisis, alcance y el inventario completo de tareas:
`source/gestion/pm/docs/iniciativas/construir-harness-propio/`.

## La restricción que ordena el diseño

Este contenedor **no tiene credencial de modelo** — medido:
`ANTHROPIC_API_KEY` ausente, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST=1`, y el
proxy de egreso no inyecta auth para `api.anthropic.com` (401 `x-api-key
header is required`). Por eso el proveedor es una **interfaz** con dos
adaptadores:

| Adaptador | Estado |
|---|---|
| `RecordedProvider` | ejecutable aquí; el bucle entero se prueba contra él |
| `AnthropicHttpProvider` | escrito y tipado, **sin ejercitar**; exige `ANTHROPIC_API_KEY` y falla diciéndolo |

## Uso

```bash
bun test                                    # publica su conteo al correr
bun run bin/harness.ts --prompt "..." --provider recorded --grabacion turnos.json --json
```

## Compatibilidad deliberada

Dos formatos se copian del cliente **a propósito**:

- **Hooks** — `stdin` JSON con `hook_event_name`, salida JSON con
  `hookSpecificOutput`, **exit 2 bloquea**. Los hooks del repo corren sin
  reescribirse.
- **Transcript JSONL** — una línea por evento con `type`, `timestamp`,
  `message` y `usage`. Verificado: `model_catalog.py sesion` lee un transcript
  nuestro sin cambios.

## Módulos

| Ruta | Qué es |
|---|---|
| `bin/harness.ts` | el binario |

El bucle y lo que necesita para CORRER —`loop/index.ts`, `types.ts`,
`transcript.ts`, `session.ts`, `hooks.ts`, `context/`— viven en
`@thyrox/agent/loop` (tarea #224, tramo 4). Lo que el bucle LLAMA vive en
paquetes hermanos, no aquí (tramo 2): `@thyrox/provider` (interfaz + los dos adaptadores),
`@thyrox/permission` (la decisión previa a ejecutar, fail-closed),
`@thyrox/tools` (registro + herramientas), `@thyrox/observability`,
`@thyrox/plan` y `@thyrox/skills`.

## Lo que todavía NO hace

Compactación, subagentes, cambio de modelo en vuelo, MCP y los otros 21
eventos de hook. Cada uno tiene su tarea en `tareas-construir-harness-propio`;
ninguno está aquí a medias.
