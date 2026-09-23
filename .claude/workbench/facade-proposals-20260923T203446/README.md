# Fachadas TS2305 como proponente del lazo

`proposeFacades` en `src/verify/tscProposers.ts`, emitido por
`bin/tsc_proposers` con `proposer: ts2305-facade`. Suite:
`tests/verify/facadeProposals.test.ts`, con un control del arnés (la fixture
resuelve sus módulos y tiene sus dos TS2305).

Un miembro que falta en un módulo y está exportado UNA vez en el mismo paquete
se reexporta desde el archivo que lo declara: `export { M } from './decl.js'`,
o `export type` si es sólo tipo. Una propuesta por módulo proveedor, con los
TS2305 de los consumidores como objetivos. Es la forma del primer lote
verificado a mano (`thyrox@f49db1a4`), ahora mecánica.

| Pieza anulada | Cae |
|---|---|
| `facade-unique` — admitir más de una declaración | «two candidate declarations are judgment…» |
| `facade-same-package` — cruzar de paquete | «a declaration in another package…» |
| `facade-type-only` — reexportar tipos con `export {}` | «re-exports a value and a type…» |
| `facade-cycle` — sin el ciclo directo | «a declaration that imports the provider…» |
| `facade-host-bindings` — sin la guarda de H-THYROX-156 | «…delegates to host bindings is refused» |

Sin caso que discrimine, declarado: el descarte de un proveedor que ya declara
el miembro (un miembro declarado no da TS2305).

Ciega a: ciclos en runtime que no pasen por `getAgentHostBindings` ni por un
import directo; la guarda nombra el único patrón medido (H-THYROX-156).

## Censo de los TS2305 del árbol (sonda, `facade_census.probe.ts`)

Corrido sobre `tsconfig.json` raíz tras el paso que dejó `tsc` en 4004
(`facade_census.out`): 247 miembros no existen en ningún sitio (exigen porte),
93 existen sólo en otro paquete, 12 tienen varias declaraciones en el paquete y
12 son candidatos. Las fachadas del mismo paquete quedan agotadas con esos 12.
El siguiente margen son los 93 de otro paquete cuando el proveedor YA depende
del paquete que declara: sin dependencia nueva que nadie decidió.

Métrica: diagnósticos TS2305 del servicio de lenguaje, clasificados por las
declaraciones exportadas del miembro en el programa.
Ciega a: un miembro exportado sólo desde un `.d.ts` o desde `node_modules`,
que el índice excluye.

La sonda ocupó ~5 GB y, corrida junto al lazo, dejó sin memoria a sus
proponentes (SIGKILL, `run-20260923T204551`): dos cargas del programa completo
no corren a la vez en esta máquina (16 GB, sin swap).
