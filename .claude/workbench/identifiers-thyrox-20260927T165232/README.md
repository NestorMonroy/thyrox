# Fase B: identificadores y variables con «Claude» → thyrox (TASK #67)

## Censo de partida (medido con `rg`, sin `dist/` ni `__tests__/`)

`outputs/identifier-forms.txt`: 588 formas, 3851 apariciones. De ellas, 350
nombres `CLAUDE_*` de entorno, 30 constantes y 208 identificadores de código.
`outputs/paths.txt`: 52 rutas con «claude». `outputs/claude-code-env-by-area.txt`:
reparto de `CLAUDE_CODE_*` por paquete (≈1 560 apariciones).

## Cómo lo resuelve OmniRoute (commit `a58000c7`), y qué se toma

| Clase | OmniRoute | thyrox |
|---|---|---|
| configuración propia | `OMNIROUTE_*` (329 de 1 319 lecturas de `process.env`) | `THYROX_CODE_*` |
| convención del SDK del proveedor | lee `ANTHROPIC_AUTH_TOKEN ?? OMNIROUTE_API_KEY` (`bin/cli/commands/launch.mjs:90`) | `ANTHROPIC_*` no se renombra: `credentials.ts` ya lo trata así |
| frontera con el cliente ajeno | `CLAUDE_*` sólo al ESCRIBIR su `settings.json` (`setup-claude.mjs`) o al lanzarlo (`launch.mjs`) | `CLAUDE_CODE_*` sólo donde thyrox trata a propósito el entorno del cliente ajeno, con la marca `thyrox-rename: keep` |

OmniRoute casi no lee `CLAUDE_*` para sí: tres lecturas marginales
(`CLAUDE_CODE_REDIRECT_URI`, `CLAUDE_DISABLE_TOOL_NAME_CLOAK`).

## El anfitrión de esta sesión

Pone 50 `CLAUDE_*`/`ANTHROPIC_*` para su cliente (`CLAUDE_CODE_REMOTE`,
`CLAUDE_CODE_SESSION_ID`, …). Son de él, no de thyrox: que thyrox deje de
leerlas es la consecuencia buscada, no un efecto lateral.

## Mecanismo

`src/verify/renameEnvPrefix.ts`: `CLAUDE_CODE_<X>` → `THYROX_CODE_<X>` con
límite de palabra, idempotente (H-THYROX-171), respeta `thyrox-rename: keep`
en la línea o en la anterior, y `--check` para lo que quede.
