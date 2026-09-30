# Retiro verificado de src/packages/package.json y src/packages/bun.lock

Tarea #62. Antes de retirar, se midio si algun flujo real depende del
manifiesto anidado (`@thyrox/packages`) o de su lockfile. Cada sonda deja su
salida al lado.

| Sonda | Que busca | Resultado |
|---|---|---|
| `p1-text-references.txt` | toda mencion textual de las dos rutas o de `@thyrox/packages` en lo versionado (sin bancos, trabajos, cache ni `_references`) | 16 menciones fuera del propio manifiesto, **todas prosa**: comentarios, docstrings y cuatro `description`. Ninguna abre el archivo |
| `p2-executable-readers.txt` | codigo que construye la ruta por partes o lee la clave `workspaces` | **2 lectores reales**: `tests/reference/home.test.ts:57` y `tests/task/extraction.test.ts:77` toman el agregador como autoridad. `check_stale_divergence.py` lee el manifiesto de la raiz. El resto son arboles sinteticos en temporales |
| `p3-install-commands.txt` | `bun`/`npm` lanzado con cwd en `src/packages` y toda invocacion de `bun install` | 0 lanzados desde `src/packages`. `check-cli-typecheck.sh:167` **recomienda** `cd src/packages/cli && bun install` |
| `p4-bun-root-from-package-before.txt` | con que raiz trabaja bun desde un paquete | toma `src/packages/` como raiz de workspace y falla en los `@ant`: el manifiesto anidado **rompe** el comando que el check recomienda |

No hay CI (`.github/workflows` no existe). Los hooks (`.githooks/`) no lo
nombran. `src/packages/node_modules` no existe: bun resuelve por la raiz.

Veredicto: ningun flujo depende de el para funcionar; dos pruebas lo toman
como autoridad y se reapuntan a la raiz; un comando recomendado funciona mal
POR su existencia. Se retira.

*Metrica:* menciones y lectores en lo versionado, y la conducta de
`bun install --dry-run` desde un paquete.
*Ciega a:* un flujo fuera de este clon (un consumidor que clone thyrox y
lance `bun install` desde `src/packages/`), y a una construccion de ruta que
no use ninguna de las formas buscadas.

## Cinco lockfiles por paquete, hallados al medir el universo del check

`p5-per-package-lockfiles.txt`: `bridge`, `daemon`, `headless-sdk`, `ide` y
`server` versionan su propio `bun.lock`, los cinco del 2026-09-07. **0**
lectores en lo versionado, ninguno declara `workspaces`, y bun no los lee:
desde `src/packages/ide` sube a la raiz de workspace y falla igual que desde
`cli`. Son la misma segunda fuente de verdad; entran en el mismo retiro.

## La ceguera declarada de la sonda 2 se cumplio

`p2-executable-readers.txt` hallo dos lectores y habia **tres**:
`tests/package/sibling_exports.test.ts` lee `join(PAQUETES, 'package.json')`,
una ruta armada con una variable que ninguna de las formas buscadas cubria.
Lo destapo la verificacion posterior al retiro (ENOENT en su bloque 0), no la
sonda. Se reapunto a la raiz igual que los otros dos. La lectura correcta de
esta tabla es la de arriba mas esta fila: el retiro se valido por conducta
(las suites sobre el arbol sin el archivo), no solo por busqueda.

## Despues del retiro

- `p7-gate-after-removal.txt`: 0 segundas raices en 52 601 rutas.
- `p8-bun-after-removal.txt`: desde `src/packages/cli`, bun resuelve contra la
  raiz sin errores; en la raiz, `--frozen-lockfile` no cambia nada.
- `p9-mentions-after.txt`: las 8 menciones que quedan nombran el retiro.
