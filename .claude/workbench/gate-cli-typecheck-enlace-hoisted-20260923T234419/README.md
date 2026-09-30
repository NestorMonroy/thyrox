# check-cli-typecheck: el enlace hoisted vive en un ancestro

`bunfig.toml` declara `linker = "hoisted"` (H-THYROX-154): `bun install`
enlaza los workspaces en `node_modules/@thyrox/` de la raíz. El gate decidía
«workspace sin enlazar» mirando sólo `src/packages/cli/node_modules/@thyrox/`,
así que publicaba sin enlazar a `@thyrox/mcp-runtime` —enlazado en la raíz— y
rehusaba el veredicto: bloqueó un commit que sólo tocaba un test de `cli`. Su
arreglo propuesto, `bun install` en el paquete, no crea nada bajo ese linker.

El `TS2307` es real y otro: `cli` importa `@thyrox/mcp-runtime` por su raíz y
el `exports` del paquete no declara `"."` (su barrel sigue bloqueado).

| Archivo | Qué es |
|---|---|
| `rojo.txt` | `tests/verify/test-cli-typecheck.sh` con el caso 8 (enlace en un ancestro): 16 ok, 2 fallos |
| `verde.txt` | con `linked_in_ancestor`: 18 ok |
| `anulado.txt` | el chequeo mirando sólo el paquete: caen exactamente los 2 casos nuevos |

Con veredicto real, `cli` da 2447 en los dos proyectos, bajo el baseline de
2449: el baseline baja a 2447.
