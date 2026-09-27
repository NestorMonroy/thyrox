# Fase C de TASK #67: el texto visible dice thyrox

Decisión del ejecutor 2026-09-27: todo texto visible dice thyrox, y el archivo
de instrucciones es `THYROX.md` con `CLAUDE.md` de respaldo.

## `/init`, portado de 2.1.283 y rebautizado

El porte llevaba un prompt anterior: le faltaba la «Phase 0» y la oferta de
importación. La fuente está en `claude_strings.txt` (el bundle principal, fuera
de `bunfs-root`, donde `bin/binary literal` da 0 — `literal-init-prompt.txt`).

| Pieza | Símbolo | Archivo |
|---|---|---|
| prompt original | `lWo` | `lWo.txt` |
| prompt por fases | `dWo` | `dWo.txt` (líneas 1-156 de `dWo-window.txt`) |
| oferta de importación | `RFe` | `RFe.txt` |
| selectores | `aWo` (`CLAUDE_CODE_NEW_INIT` o `tengu_slate_harbor_experiment`), `lme` (`tengu_import`) | `init-selectors.txt` |
| el comando | `cWo`: `aWo()?dWo():lWo()`, sin marcar onboarding | `dWo-window.txt:156` |

`gen_init_prompts.py` escribe `app-host/src/commands/initPrompts.ts`: el
texto verbatim más un mapa de nombres explícito, en orden. Rehúsa escribir si
queda el nombre del producto, así que el mapa incompleto no produce archivo.

Tampoco el mercado `claude-plugins-official` en `/plugin install x@claude-plugins-official`:
es el identificador de un recurso externo y thyrox instala de él
(`config/plugin/schemas.ts`, `officialMarketplaceGcs.ts`).

Lo que NO se rebautiza, porque thyrox sigue leyéndolo ahí: `.claude/settings`,
`.claude/skills/`, `.claude/worktrees/`. `.claude/rules/` pasa a
`.thyrox/rules/` al escribir y se nombran los dos al leer.

Única divergencia de contenido: la fase 0 busca `THYROX.md` y, si falta, el
heredado `CLAUDE.md`, y escribe el resultado en `THYROX.md` conservando lo que
decía. Sin eso, un proyecto con sólo `CLAUDE.md` lo perdería: el cargador
prefiere `THYROX.md`.

Pendiente declarado: `/import` y `thyrox import` no están portados; la rama
que los nombra sólo aparece con la bandera `tengu_import`, apagada por defecto.

## Controles

- `initPrompts.test.ts` (8) y `initCommand.test.ts` (2).
- Anulación: el generador sin su mapa rehúsa («quedó el nombre del producto»);
  con el mapa sin `${RFe}` en `lWo`, cae el caso de `tengu_import` (medido al
  escribirlo: la rama referenciaba un `RFe` inexistente).
