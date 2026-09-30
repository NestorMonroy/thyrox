Haces que cada worktree de ítem del pool tenga las dependencias que su verify necesita,
sin que ninguna resuelva al código del árbol principal (H-THYROX-261). El `Item:` de
abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con `sed`,
`gawk` o `bash bin/replace_literal`; corre Python con `uv run --python 3.12 python`.

Lo medido:
- Un worktree nuevo sólo tiene lo versionado. `node_modules` (raíz, 870 MB) y los
  `src/packages/*/node_modules` y `.venv` (247 MB) están en `.gitignore`.
- En el worktree, `tests/session/test-headless-pool-thyrox-p.sh` da 2 ok y 10 fallos,
  con y sin cualquier parche: el proxy de credencial rehúsa por `node_modules` ausente
  y `.venv` sin generar.
- Los enlaces de workspace son RELATIVOS: `node_modules/@thyrox/agent -> ../../src/packages/agent`.
  Enlazar el directorio `node_modules` entero del árbol principal haría que `@thyrox/*`
  resuelva al código del árbol principal, y un verify probaría el código equivocado.
  Lo mismo aplica a cualquier `.pth` o instalación editable de `.venv` que apunte a
  `src/` del árbol principal.

Lo que se pide, en `src/session/item_worktree.sh` (paso de creación del worktree):
1. Dejar en el worktree `node_modules` y `.venv` utilizables. Elige y MIDE la forma:
   `bun install --frozen-lockfile` / `uv sync --frozen` dentro del worktree (usan la
   caché compartida), o un árbol de enlaces que reconstruya `@thyrox/*` apuntando al
   worktree. Publica el tiempo y el disco que añade cada opción que pruebes, y justifica
   la elegida con esas cifras.
2. Invariante que no se negocia: dentro del worktree, `@thyrox/<paquete>` resuelve a
   `<worktree>/src/packages/<paquete>` y el `src/` que importa Python es el del worktree.
3. Si la preparación falla, el ítem no se marca `verificado`: se reporta como fallo de
   preparación con su causa, igual que hoy `1.prepare.err`.
4. Una variable `THYROX_*` para desactivarlo sólo si la necesitas; si la añades, va a
   `.env.example` y lleva prueba (gate `checkEnvPrefix`).

Pruebas en `tests/session/test-headless-pool-worktree.sh`:
- roja primero: en el worktree de un ítem, `@thyrox/*` no resuelve (o resuelve al
  árbol principal) y el `.venv` no existe;
- verde: resuelve al worktree y el `.venv` existe;
- el caso que protege la invariante: si un ítem modifica un archivo de
  `src/packages/<x>`, el código cargado desde el worktree ve la modificación.
Control de anulación: si la preparación se retira, caen exactamente las aserciones que
dependen de ella; si los enlaces apuntan al árbol principal, cae la de la invariante.
Publica los conteos y restaura.

Cierre del ítem (obligatorio):
- Todo en primer plano. No lances trabajos en segundo plano, no uses `git stash`, no
  escribas fuera de tu worktree y de su scratchpad, ni termines esperando una notificación.
- Tu mensaje final incluye la roja, el verde de las suites del verify, las cifras de
  tiempo y disco medidas y el control de anulación con sus conteos.
