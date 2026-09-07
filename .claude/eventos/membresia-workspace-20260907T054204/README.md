# La dependencia cruzada inalcanzable NO es una decisión: es membresía de workspace

Medido con sonda aislada (`prueba/`), dos ejecuciones idénticas salvo una
línea del manifiesto de la raíz:

| Caso | `workspaces` | Resultado de `import { MARCA } from '@probe/proveedor/pieza'` |
|---|---|---|
| A | sólo el proveedor | `error: Cannot find module '@probe/proveedor/pieza'` |
| B | proveedor **y** consumidor | `resuelve: del-proveedor` |

Mismo código, mismo `exports`, misma versión de bun. El único cambio es que el
consumidor figure en `workspaces`. **El control discrimina en los dos
sentidos**: si la membresía no fuera la causa, A y B darían lo mismo.

## Qué invalida

Tres portes escribieron una reimplementación local de un símbolo del hermano
por creerlo inalcanzable, y dos de ellos atribuyeron la restricción a
«DEC-04». DEC-04 es otra decisión — «thyrox exporta mecanismo; el repo
consumidor aporta el parámetro» — y no dice nada sobre resolución de módulos.

Medido sobre `src/packages/package.json`: `workspaces` declara 16 miembros y
**no** incluye `headless-sdk`, `memory`, `mcp-runtime`, `output` ni `swarm`,
que son justo los portes recientes. Cada uno paga el mismo peaje.

*Métrica:* resolución de un import por nombre de paquete con y sin membresía,
en un árbol sintético de dos paquetes.
*Ciega a:* si añadir un miembro a `workspaces` en el árbol real rompe algo más
—una colisión de versión, un ciclo de instalación—, que sólo se sabe
ejecutando `bun install` sobre él. Por eso la sonda es sintética: el árbol real
tiene agentes escribiendo y su `bun.lock` es archivo compartido.
