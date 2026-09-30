# `thyrox -p` como máscara de `claude -p`, y `headless-pool --runner`

`thyrox -p` necesita una credencial para hablar con el modelo. Dentro de un
entorno de claude, el único proceso que la tiene es el `claude` oficial: el
anfitrión se la entrega y la retira de los hijos. thyrox no la lee ni la
reenvía. Medido en `.claude/workbench/claude-p-from-shell-20260928T234121/`.

Tres piezas:

1. **Máscara en `thyrox -p`**
   (`src/packages/cli/src/entry/printDelegation.ts`): primero valida la
   línea con su propio contrato. Si thyrox no tiene credencial propia y hay
   un `claude` en el PATH, delega la misma invocación con `--session-id`
   propio. No delega un proveedor distinto de `http` ni las banderas propias
   de thyrox.
2. **`headless-pool --runner thyrox|claude`** (`src/session/headless-pool.sh`):
   `thyrox` por defecto. `claude` es la forma explícita: `--session-id` por
   ítem, TTL con `CLAUDE_CODE_PROMPT_CACHE_TTL` y `--credential-proxy`
   integrado igual que con thyrox.
3. **Alta de worktrees serializada** (`src/session/item_worktree.sh`): un
   `flock` por ejecución alrededor de `git worktree add`.

## Controles

| Mitad de juicio retirada | Caídas | Salida |
|---|---|---|
| máscara: exigir falta de credencial propia | 1 | `anulacion-mascara-credencial.txt` |
| máscara: `--session-id` propio | 2 | `anulacion-mascara-sesion.txt` |
| máscara: proveedor distinto de http | 1 | `anulacion-mascara-proveedor.txt` |
| máscara: banderas propias de thyrox | 1 | `anulacion-mascara-banderas-propias.txt` |
| pool: `--session-id` por ítem | 2 | `anulacion-session-id.txt` |
| pool: TTL con la variable de claude | 1 | `anulacion-ttl-claude.txt` |
| pool: `claude` como ejecutor | 10 (+3 de «dos pools», de carga) | `anulacion-bin-claude.txt` |
| pool: rechazo propio sin claude en el PATH | 0: redundante con el rechazo genérico (`falta el ejecutor de los ítems`); se retiró | `anulacion-claude-en-path.txt` |
| worktree: el `flock` | la prueba estuvo en rojo (1 de 3 prepares) antes de la corrección | `tests/session/test-item-worktree-lock.sh` |

## Incidentes

- **Dos anulaciones concurrentes compartieron el respaldo `$W/.o`.** La
  segunda lo sobrescribió y lo borró, así que la restauración de la primera
  falló y la mutación `bin-claude` quedó en `headless-pool.sh`. La detectó
  la suite (10 caídas en un árbol que debía estar verde) y se restauró a
  mano. Lección: cada anulación lleva su propio respaldo.
- **El pool de los ítems R-2b-3, R-2c y R-2b-4** (`--runner claude`) perdió
  los ítems 1 y 3 por `no se pudo preparar el worktree del item`: los
  reintentos cortos de `worktree add` se agotaron sobre este árbol. De ahí
  la pieza 3.

Las caídas de GPU y de «dos pools» que aparecieron en algunas anulaciones
coincidieron con el pool real corriendo en paralelo y con la carga de las
propias suites; no dependen de las líneas anuladas.
