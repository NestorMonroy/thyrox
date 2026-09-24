# gate-de-lectura-cruzada-con-izado-anidado

## El encargo

Commitear el motor de hooks: el pre-commit lo rechazó porque
`check-cross-model-read` rehusó con exit 2 sobre `src/packages/agent`.

## La premisa, si se corrigio al primer comando

El remedio que imprime el gate —`bun install --frozen-lockfile`— no cambia
nada (*«Checked 650 installs … (no changes)»*): el árbol ya era el del
lockfile. El defecto está en el gate.

## Las piezas

| archivo | que hace |
|---|---|
| `tests/lib/test-node-resolution.sh` casos 11 y 12 | izado con `node_modules` anidado: el lockfile de la raíz lo declara (acepta) o no (rehúsa) |
| `src/lib/node_resolution.sh::declared_in_root_lock` | busca `"<workspace>/<paquete>": ["<paquete>@<version>"` en el `bun.lock` de la raíz |

## Los resultados

Con `linker = "hoisted"` y dos versiones pedidas del mismo paquete
(`@anthropic-ai/sdk` ^0.110.0 en la raíz, ^0.124.0 en `@thyrox/agent`), Bun
materializa la segunda como directorio real en
`src/packages/agent/node_modules/`, y el `bun.lock` de la raíz la declara
(línea 1970). El gate conocía dos layouts —izado sin anidar y aislado bajo
`.bun/`— y rehusaba el tercero. Además su recorrido contaba como entrada el
ejecutable de `.bin/`, que enlaza dentro del propio jardín.

| Archivo | Qué es |
|---|---|
| `outputs/rojo.txt` | 12 de 14: falla el árbol real y el caso 11 |
| `outputs/rojo-bin.txt` | con el `.bin` en el caso 11: la misma forma que el árbol real, 12 de 14 |
| `outputs/verde.txt` | 14 de 14; `test-cross-model-read.sh` 6 de 6 |
| `outputs/anulado-lockfile.txt` | aceptando cualquier anidado: cae exactamente el caso 12 |

`tests/lib/test-node-resolution.sh` estaba en la lista de rojos de shell; su
único fallo era este.

*Métrica:* aserciones de las dos suites.
*Ciega a:* un lockfile cuyo formato de clave cambie; la búsqueda es literal
sobre la forma de `bun.lock` de Bun 1.3.11.

**Sucesor abierto:** alinear la versión del SDK entre la raíz y
`@thyrox/agent` quitaría el anidado; es un cambio de dependencia y no se
toma aquí.
