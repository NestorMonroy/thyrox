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
| `src/types.ts` | contratos: mensaje, bloque, herramienta, uso, parada |
| `src/transcript.ts` | JSONL append-only + lectura tolerante a línea rota |
| `src/session.ts` | identidad, reanudación, ruta por proyecto |
| `src/hooks.ts` | ejecutor con el contrato del cliente |
| `src/permission.ts` | la decisión previa a ejecutar (fail-closed) |
| `src/tools/registry.ts` | registro + `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep` |
| `src/provider/` | interfaz + los dos adaptadores |
| `src/loop.ts` | el bucle |
| `bin/harness.ts` | el binario |

## Lo que todavía NO hace

Compactación, subagentes, cambio de modelo en vuelo, MCP y los otros 21
eventos de hook. Cada uno tiene su tarea en `tareas-construir-harness-propio`;
ninguno está aquí a medias.
