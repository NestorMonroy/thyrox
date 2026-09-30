# Una sesión nueva de thyrox, validada, y el barrido de huérfanos al arrancar

**Pregunta:** ¿`bin/cli` arranca todavía una sesión nueva, y lo implementado
hoy (admisión de disco, liberación de worktrees, aislamiento de trabajos)
cumple su criterio en una sesión nueva?

## La sesión nueva funciona

`bin/cli --prompt x --provider recorded --grabacion proj/turns.json
--settings-source project --json` sale 0, un turno, `lastText: "ya"`
(`outputs/cli.json`). El hook `SessionStart` de `proj/.claude/settings.json`
se dispara con `source: "startup"` (`outputs/session-start-payload.json`).

## Lo que no cumplía: nada recoge al arrancar lo que un pool muerto dejó

La admisión de disco, el aislamiento de trabajos y la liberación viven en el
código que se ejecuta en cada uso, así que valen en cualquier sesión. El
`sweep` de worktrees, en cambio, sólo corre al final del propio pool
(`headless-pool.sh`); si el pool muere, sus worktrees —una copia del árbol
cada uno— sobreviven a la sesión, y el cableado declarado sólo tenía
`SessionStart` con matcher `compact`. Medido en disco al empezar:
`.thyrox/pool-worktrees/7448ea9ad7f1/` vacío y su `.lock`, restos del pool
`credentials-effort` que murió por disco.

## Lo que se construyó

- `item_worktree.sh lock-path` y `sweep-orphans`: un directorio de ejecución
  es huérfano si su candado está libre y ningún proceso tiene su cwd dentro
  (esto último cubre pools lanzados antes del candado). Lo no entregado se
  salva como parche en `<raíz>/salvaged/` y se nombra con `salvado: <ruta>`.
- `headless-pool.sh` retiene ese candado toda su vida; `sweep` borra el
  directorio y el candado de la ejecución al terminar.
- `declared_wiring()` declara `SessionStart` con matcher `startup`: un
  `sweep-orphans` por árbol alcanzado.

Controles de anulación (cada mitad de juicio retirada tumba sus casos):
candado, cwd vivo y salvado en `test-item-worktree-orphans.sh`; retener y
limpiar en `test-headless-pool-worktree.sh`.

*Métrica:* worktrees listados por git bajo el directorio de la ejecución.
*Ciega a:* un proceso vivo que trabaje en el worktree sin tener su cwd dentro
y en un pool anterior al candado; y al cableado vivo: `declared_wiring()` lo
declara, instalarlo en el `settings.json` del usuario es aparte.
