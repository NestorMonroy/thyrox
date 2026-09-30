# La raíz de configuración y el archivo de instrucciones migran a thyrox

Decisión del ejecutor 2026-09-27 («Migrar a .thyrox»): `THYROX_CONFIG_DIR`,
`~/.thyrox` y `THYROX.md` son los nombres propios; los heredados se leen
como respaldo.

## Lo que el ejecutable fija (2.1.283, extraído con `bin/binary`)

- `symbol-Se-rWn.txt`: `Se=Fo(()=>(o()??u(R(),".claude")).normalize("NFC"),o)`,
  con `o()` = `process.env.CLAUDE_CONFIG_DIR` (`symbol-o-Ryn.txt`). Memoizado
  por la variable, sin mirar el disco.
- `literal-CLAUDE_CONFIG_DIR.txt`: los 39 sitios que leen la variable.
- `literal-CLAUDE_CONFIG_DIR-nullish.txt`: 0 — la forma minificada no conserva
  el `??` junto al nombre; por eso se localizó por `rWn`.

## Lo que thyrox hace

- `config/env/configHome.ts`: `THYROX_CONFIG_DIR` → `CLAUDE_CONFIG_DIR` →
  `~/.thyrox` si existe → `~/.claude` si existe → `~/.thyrox`. Una variable
  vacía no cuenta. Memo por las dos variables y `homedir()`.
- `config/env/instructionFiles.ts`: ranuras `THYROX.md`/`CLAUDE.md`,
  `THYROX.local.md`/`CLAUDE.local.md`, `.thyrox/THYROX.md`/`.claude/CLAUDE.md`;
  reglas de `.thyrox/rules` y `.claude/rules` (las dos).
- Se retiraron once copias locales del resolver (memory, bridge, ide, storage
  ×4, command-runtime, agent, app-host, updater) y las lecturas diferidas de
  permission; todas importan el módulo único.
- `pathSafety` protege `.thyrox` igual que `.claude`.

## Controles de anulación (cada uno cayó exactamente lo suyo)

| Anulación | Cae |
|---|---|
| resolver sin respaldo a `~/.claude` | 1 de 10 (`un usuario sin migrar…`) |
| `CONFIG_DIR_NAMES` sólo con `.claude` | 3 de 18 de pathSafety (los de `.thyrox`) |
| `slotPath` sin comprobar existencia | 2 de 8 (los dos de respaldo) |
| ranura anidada fija a `CLAUDE.md` | 1 de 8 (`getMemoryFilesForNestedDirectory`) |
| prompt del bucle sin el primer candidato | 1 de 13 |
| `getIdeLockfilesPaths` sin `~/.claude/ide` (el estado previo) | 1 de 2 |

`rWn` (`symbol-Se-rWn.txt`) busca también `~/.claude/ide` cuando la raíz se
declaró por variable: las extensiones de editor escriben ahí. El porte no lo
tenía; ahora se añade siempre que la raíz resuelta no sea `~/.claude`.

## Hallazgo lateral

`tool-registry/src/hooks/__tests__/appState.test.ts` exigía el mensaje
«dispatcher». Tras cualquier render en el mismo proceso React deja su
despachador de sólo contexto y el mensaje es «Invalid hook call»: la prueba
dependía del orden. La reproduce el par con `searchTextRenderFidelity`
(f4efeb7b). Se acepta la pareja de mensajes; su anulación declarada (subpath
inexistente) sigue tumbando 3.

Métrica: casos de bun test por anulación. Ciega a: consumidores de
`CLAUDE.md` en prosa (prompts, textos) — fase C, sin tocar aquí.

## Segundo hallazgo lateral: una caché de settings duplicada

`config/settings/settings.ts` llevaba una copia local de sus tres cachés con
la nota «`./settingsCache.ts` no existe»; el módulo existe y exporta
`resetSettingsCache`. Quien lo llamaba limpiaba cachés que nadie leía. Lo
destapó `claudemdInstructionFiles.test.ts`: los settings leídos con sus
bindings llegaban a `getMemoryFiles.test.ts` (`claudeMdExcludes` caía). Ahora
`settings.ts` usa el módulo; la suite nueva limpia al terminar, y quitar esa
limpieza vuelve a tumbar exactamente ese caso.
