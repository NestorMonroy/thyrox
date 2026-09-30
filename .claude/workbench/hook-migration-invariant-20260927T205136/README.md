# Migración de hooks como invariante medido

Pregunta: ¿se puede verificar con un comando que un renombre de hook
(`pretooluse_dispatch.py` → `tool_use_preflight.py`) no dejó referencias
vivas ni comandos de hook rotos, sin depender de recordar el orden?

Instrumento: `src/session/hook_migration.py` (`bin/hook_migration`), con
`refs`, `broken`, `probe` y `confirm`. Procedimiento en
`.claude/rules/migracion-de-hooks.md`.

## Resultado sobre el renombre real

- `outputs/refs-pretooluse_dispatch.txt`: `LIVE=0 CURRENT_DOC=0
  UNCLASSIFIED=0 HISTORICAL=236`, exit 0. La primera medición daba
  `CURRENT_DOC=1`: `kaupamex-api/.claude/rules/operaciones-de-archivo-con-bash.md`
  seguía nombrando el archivo viejo; la búsqueda manual anterior no lo vio.
- `outputs/refs-pretooluse_scatter_gather.txt`: todo en 0 (el nombre
  intermedio nunca llegó al árbol).
- `outputs/broken.txt`: `rotos=0` en los seis repositorios y en los
  `settings` del usuario.

## Controles de anulación

`probes/annul-hook-migration.tsv`, corridas con `bin/annul_parallel`
(`outputs/annul.txt`). Base 28/28; cada variante tumba sólo lo suyo:

| Variante | Cae |
|---|---|
| sin la fila del banco como HISTORICAL | 2 |
| sin `source/gestion/pm/` antes de `source/` | 1 |
| `refs_verdict` siempre 0 | 2 |
| `git grep` sin `--untracked` | 1 |
| sin los `settings` del usuario | 1 |
| `>=` en vez de `>` en el atime | 2 |

Métrica: aserciones de `tests/session/test_hook_migration.py` por variante.
Ciega a: una referencia escrita de otra forma (el nombre partido, o sin la
extensión cuando se busca con ella) y a un consumidor que no esté en
`reach.paths()`.

## Lo que el commit del renombre no dijo

`b2e2a213` sólo contiene el renombre. La instalación del cableado vivo
también añadió `kaupamex-api` a SessionStart, SubagentStart y SubagentStop:
es una reconciliación aparte, está en
`.claude/workbench/tool-use-preflight-rename-20260927T204422/README.md` y
en la copia `.claude/settings-backups/settings.local.json.20260927T204306`,
y no en git, porque `~/.claude/settings.local.json` vive fuera del árbol.
