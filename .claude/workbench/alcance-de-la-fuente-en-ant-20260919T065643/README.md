# El alcance de la fuente en `@ant/`, y el control que no lo veía

`TASK-THYROX-0178`. Tres defectos que el typecheck destapó juntos, y uno es
del control que escribí en el pase anterior.

## Lo que había

Los cinco paquetes `@ant/` llegaron en el porte de #487 **después** de que
`TASK-THYROX-0169` reescribiera el alcance en `src/packages`. Trajeron **40**
líneas de `import` que nombran **nuestros** paquetes con el alcance de la
fuente —`@claude-code-how-works/mcp-runtime/normalization.js`,
`@claude-code-how-works/config/env/paths`, …— en 14 archivos de
`@ant/computer-use-mcp/src/legacy/`.

Un import así **no resuelve**: es 100 % error, no procedencia. Y el eje es el
que ya separó las dos lecturas de ese literal: nombrar **nuestro** paquete es
defecto; citar **la fuente** en un comentario es correcto. Medido aquí: de los
40 hits, **40 son líneas de import y 0 son comentarios**, así que la corrección
no pudo destruir ninguna cita de procedencia.

## Antes de renombrar: ¿existen los destinos?

Si alguno faltara, el renombre cambiaría un `TS2307` por otro y se leería como
arreglado — un hueco de porte disfrazado de defecto de alcance. Medidos los
**23** especificadores distintos: **23 resuelven**, 0 ausentes.

La primera medición dijo «6 AUSENTE» y era **mi sonda, no el árbol**: componía
`src/packages/X/src/…` y `config` no tiene `src/` — sus módulos cuelgan de la
raíz del paquete, como su propio `exports` declara (`"./env/utils":
"./env/utils.ts"`). Re-medidos contra el `exports` real, los seis están.

## El control que no discriminaba — y es mío

`tests/package/package_identity.test.ts` publicaba estos 40 como
`imports con el alcance de la fuente fuera del workspace: 40` y **pasaba en
verde**. Dos premisas, las dos falsas al medirlas:

| Lo que el test asumía | Medido |
|---|---|
| `@ant/` no es miembro del workspace | el `package.json` de la **raíz** —el que bun lee— declara `src/packages/*` **y** `src/packages/@ant/*` |
| el conjunto se componía del `package.json` **interior** | su lista son nombres **planos** (`agent`, `computer-use-mcp`); contra un `rel` de `@ant/computer-use-mcp` da `false` siempre |

No era un control **vacío** —para un paquete plano acertaba— era un control
**ciego a la mitad del árbol** donde vivían los infractores. La distinción
importa: la lectura fuerte («no podía fallar nunca») es falsa, y estuve a punto
de publicarla.

El conjunto se deriva ahora de `dirs`, que es lo que los dos globos de la raíz
recorren. Así no hay una segunda fuente de verdad que desincronizar, y el cubo
«fuera del workspace» queda estructuralmente muerto y se retira.

## Los dos controles de anulación

**Sobre el arreglo.** Revertido **un** import (`common.ts:1`), el test falla
nombrando **exactamente** esa línea y ninguna otra; restaurado, `diff -q` da
idéntico y vuelve a 3/0.

**Sobre el control.** Restaurado el conjunto **ciego** con el **mismo**
infractor puesto, el test publica **3 pass, 0 fail**. Ése es el resultado: un
control que no distingue «el mecanismo funciona» de «el test no pregunta» —
sub-patrón D, con mi propio control como sujeto. Verbatim en
`outputs/control-de-anulacion.txt`.

## La cita, que era la quinta de memoria en esta sesión

El archivo citaba `TASK-THYROX-0210` **dos veces**. Resuelta por sujeto contra
el store, esa cita nombra «NOTIFICATION_CHANNELS está declarado dos veces
dentro del paquete config» — otro sujeto. La correcta es `TASK-THYROX-0178`,
«Traer a thyrox los 5 paquetes @ant/ (228 módulos), conservando su alcance».

Es la misma familia que `TASK-DOCS-0434` ya tiene abierta: el defecto no es
olvidar la regla, es escribir la cita antes de resolverla. Se cuenta ahí, no
abre hallazgo nuevo.

*Métrica:* líneas que casan `^\s*(import|export)\b` con el alcance de la fuente
bajo `src/packages/@ant/`; existencia en disco de cada especificador distinto;
y el veredicto del test en cuatro estados (antes, después, con el arreglo
anulado, con el control anulado).
*Ciega a:* un import dinámico (`import()`, `require()`) que no empiece la
línea — el predicado es el mismo que el test usa, así que comparten la ceguera;
y a si los símbolos importados **existen** dentro de cada módulo destino, que es
otro eje (`TS2305`, no `TS2307`) y lo mide el typecheck, no este control.

## El typecheck NO se movió, y eso es el resultado

Relanzado el gate tras el renombre, el veredicto es **idéntico**: **3942**
líneas de error antes y después, **64** `TS2307` dentro de `@ant/` en los dos,
y **cero** códigos de error con delta. Lo que cambió es el *nombre* del módulo
que no resuelve — de `@claude-code-how-works/X` a `@thyrox/X`.

Es exactamente la trampa que se cuidó en el paso 1 y que aquí aparece por el
otro lado: **el destino existe como archivo y aun así no resuelve**, porque
resolver no es existir. Medido, la causa es anterior y mucho mayor que este
arreglo:

```
node_modules/            4 entradas: @types, react, selfsigned, typescript
node_modules/@thyrox/    0 enlaces
```

Con **cero** enlaces de workspace, ningún `@thyrox/*` resuelve en ningún
paquete — por eso los 16 `TS2307` de esa forma que ya existían antes del
renombre viven en archivos del propio `cli` (`src/headless/sdk/…`,
`src/mcpServersHandlers.ts`), no en `@ant/`. Y por eso `ws`, `semver`, `diff`,
`sharp`, `@modelcontextprotocol/sdk` y `@commander-js/extra-typings` también
fallan: **no están instalados**.

**Los dos ejes son distintos y sólo uno se cerró aquí:**

| Eje | Estado |
|---|---|
| **identidad** — el import nombra el paquete correcto | **cerrado**, y con control que lo guarda |
| **resolución** — el nombre correcto encuentra el módulo | **abierto**: exige `bun install`, que es red y disco |

Lo que sí se cerró del segundo eje es su mitad **declarativa**, que no cuesta
red: `@ant/computer-use-mcp` **usaba 10** hermanos `@thyrox/*` y **declaraba
0**. Ahora los declara como `workspace:*`, que es la forma que
`TASK-THYROX-0449` fijó. `@ant/ink` ya declaraba sus tres.

**Y el gate no separa las dos cosas.** Su cabecera afirma que `PACKAGES_DIR`
«es lo que separa "el enlace falta" de "la dependencia no existe"», pero su
salida publica `el paquete no compila` a secas. Con `node_modules` vacío, ese
veredicto se lee como «el código está roto» cuando la causa medida es «no hay
nada instalado». Es la forma de `TASK-THYROX-0384` —marcada `completed`— en un
camino que su arreglo no cubre.

*Métrica:* conteo de `error TS<n>` por código en los dos logs, con `join` sobre
las dos distribuciones; entradas de `node_modules` y de `node_modules/@thyrox`.
*Ciega a:* si `bun install` cerraría los 3942 o sólo una parte — no se corrió,
porque es red y disco sobre un volumen que esta misma sesión acaba de bajar del
100 %; y a si algún error sobrevive por un defecto real de tipo, que sólo se
puede saber con las dependencias puestas.
