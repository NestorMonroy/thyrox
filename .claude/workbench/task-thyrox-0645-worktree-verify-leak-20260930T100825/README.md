# TASK-THYROX-0645 — el verify de un ítem aislado medía el árbol principal

Hallazgo de origen: H-THYROX-287 (pool A2 rechazó 0284 y 0261; aplicados en el
árbol principal, pasan). Medido desde el worktree
`.thyrox/pool-worktrees/d8dda5fc002a/3` (HEAD 330d7f051), 2026-09-30.

## 1. Causa de 0284 — `@thyrox/agent` se resuelve fuera del worktree

`bunx tsc --traceResolution` sobre un `import "@thyrox/agent"` escrito en
`src/packages/repl/` del worktree:

```
Directory '<wt>/src/packages/repl/node_modules' does not exist …
Directory '<wt>/node_modules' does not exist …
Directory '<wt>/../node_modules' … '<wt>/../../node_modules' … '/home/user/thyrox/.thyrox/node_modules' does not exist
Found 'package.json' at '/home/user/thyrox/node_modules/@thyrox/agent/package.json'.
Module name '@thyrox/agent' was successfully resolved to
  '/home/user/thyrox/node_modules/@thyrox/agent/dist/index.d.ts'
```

- El worktree no tiene `node_modules` (ni raíz ni `src/packages/*/`): es un
  checkout de git y `node_modules/`, `dist/`, `.venv/` están en `.gitignore`.
- El worktree vive DENTRO del árbol principal (`<top>/.thyrox/pool-worktrees/`),
  así que el ascenso de la resolución de Node llega a `<top>/node_modules`, y
  ahí `@thyrox/agent -> ../../src/packages/agent` es el paquete del árbol
  principal, con SU `dist/`. Con `preserveSymlinks: true` (COMPILER_OPTIONS de
  `emit_declarations.py`) la ruta reportada es la del enlace; sin la bandera
  sería `<top>/src/packages/agent/…`: las dos son el árbol principal.
- `check_package_typecheck` con `THYROX_ROOT=<wt>` reconstruye providers viejos
  en `<wt>/src/packages/*/dist` (`packages_by_name(reach.thyrox_root())`), pero
  tsc nunca lee ese `dist/`: lee el del principal. Un ítem que cambia `agent`
  se tipa contra el contrato viejo de `agent` → «repl: 0 -> 28».
- `main/node_modules/@thyrox/`: 38 enlaces relativos `../../src/packages/<x>`;
  `@ant/` 4 y `@anthropic/ink` 1 más; 51 de 68 enlaces de primer nivel apuntan
  al workspace. 10 paquetes tienen `node_modules/` propio con deps hoisted
  (`repl/node_modules/diff`, `*/node_modules/chalk`).

Métrica: salida de `--traceResolution` para un solo import, y `ls -la` de
`node_modules/@thyrox`. Ciega a: paquetes que resuelvan por `paths` propios
del `tsconfig` (ninguno de los medidos lo hace).

## 2. Causa de 0261 — `bin/*` sin `.venv` avisa por stderr

`bin/check_package_typecheck` (y cada envoltorio de `generate_bin.py`) busca
`$THYROX_ROOT/.venv/bin/python`; en el worktree no existe y cae a
`/usr/local/bin/python3` con dos líneas por stderr:

```
bin/tool_use_preflight: sin entorno del proveedor; corre con /usr/local/bin/python3.
              Generalo con: cd "<wt>" && uv sync
```

Los dos casos de `test_user_wiring.py` que fallaban (`obtenido=` arriba)
exigen `stderr == ""`: 122 ok, 2 fallos en el worktree. Con
`ln -s /home/user/thyrox/.venv <wt>/.venv`: 124 ok, 0 fallos. El venv de uv
es relocalizable por enlace: `pyvenv.cfg` no lleva su propia ruta
(`home = /usr/local/bin`), `bin/python -> /usr/local/bin/python3`, y
`<link>/.venv/bin/python -c 'import sys; print(sys.prefix)'` da la ruta del
enlace con `import sphinx` OK.

Métrica: conteo de la suite y stderr del caso. Ciega a: un venv creado con
rutas absolutas (`virtualenv` sin `--relocatable`), que no es el de este árbol.

## 3. Un enlace llamado `node_modules` NO está ignorado por `node_modules/`

`.gitignore` con `node_modules/` y `.venv/` (con barra: sólo directorios) y un
enlace `node_modules` → `git status`: `?? node_modules`. `finalize` hace
`git add -A`: los enlaces entrarían al parche del ítem. Cerrado con un
`core.excludesFile` en la configuración DEL WORKTREE (`git config --worktree`,
requiere `extensions.worktreeConfig`, ya `true` en thyrox por el
`sparse-checkout`): con `/node_modules` en ese archivo, `git status` calla.
`info/exclude` no sirve: `git rev-parse --git-path info/exclude` en el
worktree da `/home/user/thyrox/.git/info/exclude` — es común a todos.

## 4. Cómo lo hace la referencia (2.1.283, sólo lectura con `rg`)

| símbolo / literal | chunk:línea | qué hace |
|---|---|---|
| `worktree.symlinkDirectories` (schema) | `chunk-379zyrv7.js:14` | «Directories to symlink from main repository to worktrees to avoid disk bloat. Must be explicitly configured — no directories are symlinked by default. Common examples: node_modules, .cache, .bin» |
| `mGn(e,n,r)` | `chunk-csayct82.js:984` | por cada nombre: rehúsa absoluto o `..` (`pGn`); rehúsa si el destino escapa del worktree por un enlace commiteado (`pTe`); si la fuente no existe en el principal, la salta con log; `symlink(src, dst, "dir")`, tolera `ENOENT`/`EEXIST` |
| `bTe(e,n)` | `chunk-csayct82.js:987` | tras `worktree add`: copia `settings.local.json`, configura `core.hooksPath` del principal, y aplica `symlinkDirectories` si hay |
| `vg(e)` | `chunk-csayct82.js:983` | los worktrees de agente viven en `<repo>/.claude/worktrees` |
| `["worktree","add", ...]` con `--no-checkout` si `sparsePaths` | `chunk-csayct82.js:985` | mismo patrón que `add_worktree` de `item_worktree.sh` |

Portado: la lista de nombres relativos, el salto de la fuente ausente, el
rechazo de `..`/absoluto, la tolerancia a `EEXIST`. Divergencias declaradas:

- **Un enlace plano al `node_modules` del principal no cierra la fuga**: sus
  entradas `@thyrox/<x> -> ../../src/packages/<x>` se resuelven en el sistema
  de archivos relativas al directorio REAL, o sea al principal. Se construye
  un `node_modules` sombra: cada entrada cuyo enlace sale del directorio
  enlazado hacia dentro del repositorio se vuelve a enlazar a la misma ruta
  relativa DENTRO del worktree; el resto se enlaza a su ruta real en el
  principal; un subdirectorio real que contiene enlaces así (`@thyrox/`) se
  sombrea a su vez. Medido: con la sombra, `@thyrox/agent` resuelve a
  `<wt>/node_modules/@thyrox/agent/index.ts`.
- **Hay valor por defecto** (`node_modules .venv src/packages/*/node_modules`),
  porque sin él el verify del pool mide el árbol equivocado en silencio; la
  referencia lo deja vacío porque su worktree es para una conversación, no
  para un veredicto. `THYROX_ITEM_WORKTREE_LINK` lo cambia; vacío no enlaza.
- **La exclusión de git** (sección 3) no existe en la referencia: su
  `.gitignore` sí cubre directorios y ella no hace `git add -A` en el worktree.
- No se copia `settings.local.json` ni se toca `core.hooksPath`: el ítem corre
  con `--setting-sources project` y el pool ya pone su propio `git` en PATH.

## 5. Lo que no se toca y por qué

- `src/typescript/emit_declarations.py`, `src/verify/check_package_typecheck.py`:
  con el `node_modules` sombra ya miden el worktree; ninguna ruta suya apunta
  al principal (`reach.thyrox_root()` honra `THYROX_ROOT`, medido en
  `reach.py:895`). Sin cambio.
- `src/session/headless-pool.sh` bloque `item-root`: exporta
  `THYROX_TOOLCHAIN_NODE_MODULES_HOME=$THYROX_ROOT/node_modules` con el
  principal ANTES de reasignar `THYROX_ROOT`; con el worktree enlazado puede
  quedar en `$workdir/node_modules`. Cambio exacto en la respuesta; no se
  aplica aquí (archivo compartido con pools en curso).

## 6. Suite

`bash tests/session/test-item-worktree-links.sh` — sus casos y los controles
de anulación están en la respuesta del ítem.
