# tsconfig-extends-raiz

`TASK-THYROX-0196` (board #505) — *«Los 10 tsconfig de paquete no hacen
extends de la raíz»*. **Este banco NO la cierra: mide que su arreglo declarado
es el caro**, y aplica el barato en su lugar.

## La premisa, medida antes de tocar nada

`TASK-THYROX-0197` declaró `jsx: react-jsx` **en la raíz** y quedó `completed`.
Lo que ninguna medición había cerrado es si los paquetes lo heredan: no lo
hacen, porque `src/packages/cli/tsconfig.json` no declara `extends`. El
compilador seguía negándose a leer los `.tsx` del paquete.

## Precondición que hubo que reparar primero

El gate `check-cli-typecheck.sh` rehusaba con **exit 2** —«workspace sin
enlazar»— nombrando `@thyrox/image-processor-napi` y `@thyrox/stdin-napi`. La
causa no era el código: `bun.lock` lo escribió por última vez `f7704c99`
(09-19 08:28) y el izado a la raíz aterrizó en `0beb5445` (09-19 10:42) — el
`bun install` nunca se volvió a correr tras cambiar los manifiestos. Se corrió
en la **raíz del workspace**, no dentro del paquete: 406 paquetes en 219 ms,
con `node_modules` de 278M a 919M y un coste real de espacio libre de **12M**
(993M → 981M), porque el backend por defecto es `hardlink` y la caché está en
el mismo sistema de archivos.

Sin eso, ninguna cifra de abajo sería del código: *un módulo sin resolver
arrastra tipos*, como el propio gate declara. Cierra la mitad de instalación de
`TASK-THYROX-0098`; su mitad de manifiestos ya estaba en `0beb5445`.

## Las tres mediciones

| Variante | errores TS | archivos | TS6142 |
|---|---|---|---|
| línea base (con enlaces, sin `jsx`) | 3552 | 224 | 240 |
| **A — sólo `"jsx": "react-jsx"`** | **2931** | **501** | **0** |
| B — `extends` de la raíz | 3287 | 595 | 0 |

**El conteo de archivos sube porque el compilador por fin los lee.** 224 → 501
no es regresión: es que los 639 `.tsx` dejaron de rebotar en TS6142 y entraron
a la comparación. Un instrumento que leyera «más archivos con error = peor»
mediría el fenómeno contrario al real.

**B también cierra TS6142** —la raíz declara `jsx`, que es de donde salió la
variante A— y aun así **pierde por 356**. La razón está en el diff de familias:
la raíz declara además `noUncheckedIndexedAccess`, `noUnusedLocals`,
`noUnusedParameters` y `noFallthroughCasesInSwitch`, que el paquete no tenía.
**302 de los 356 son unused-***: TS6133 0 → 282 y TS6196 0 → 20. Los otros 54
se reparten entre TS18048 (+12), TS2532 (+11), TS2322 (+11), TS2345 (+10) y
TS6192 (+7), todos de `noUncheckedIndexedAccess`.

`extends` hereda sólo `compilerOptions`; el `include` propio del paquete se
conserva, así que la diferencia es enteramente de rigor, no de alcance.

## El control que podía fallar, y falló donde debía

La hipótesis al abrir el banco era que `extends` —el arreglo que la tarea
nombra— sería también el más barato. La variante B es ese control, y salió
**peor** que el mínimo. Sin correrla, `TASK-THYROX-0196` se habría cerrado
aplicando el `extends` y subiendo el árbol a 3287.

## Qué queda abierto

`TASK-THYROX-0196` sigue **pending**. El `extends` completo no se descarta: lo
que se descarta es aplicarlo **hoy**, porque arrastra una subida de rigor que
es una decisión aparte de la herencia de configuración. Esa decisión —adoptar
los cuatro flags estrictos de la raíz en los paquetes, con sus 356 errores
nuevos— no la toma este banco.

## Reproducir

```bash
bash bin/thyrox-bg start tc --grace 0 -- \
  bash src/verify/check-cli-typecheck.sh
bash bin/thyrox-bg register tc
bash bin/wait-jobs wait --timeout 1800
```

## El eje de las cifras: UN proyecto, no el veredicto del gate

Las tres mediciones de arriba son de `tsconfig.json` —lo que `bun run
typecheck` compila—, **no del gate**. `check-cli-typecheck.sh` corre los dos
proyectos del paquete, y su cabecera declara por qué: si alguien afloja los
`compilerOptions` de `tsconfig.tests.json`, el de producción se seguiría
midiendo con los suyos.

Medido con la variante A en disco, los dos por separado:

```
tsconfig.json       -> errores=2931 archivos=501
tsconfig.tests.json -> errores=2931 archivos=501
```

**Idénticos**, porque `tsconfig.tests.json` extiende al de fuente y su
`include` lo contiene (`src/**` + `bin/**` + `__tests__/**`). Los 19 archivos
de `__tests__/*.ts` no aportan ni un error propio hoy. Por eso el log del gate
publica **5862**: es la misma población contada dos veces.

Esa duplicación es correcta como gate —dos proyectos, dos veredictos— y
engañosa como cifra: 5862 no es el tamaño del problema. Todo conteo de este
banco se cita sobre **un** proyecto.

*Métrica:* líneas `): error TSxxxx` y rutas distintas antes del primer `(`, de
la salida de `tsc --noEmit -p tsconfig.json` sobre `src/packages/cli` —UN
proyecto—, con los enlaces de workspace presentes.
*Ciega a:* si los 2931 restantes son defectos reales o ruido de tipos de
hermanos aún sin portar — el conteo mide lo que el compilador rechaza, no lo
que está mal escrito; y a cualquier error que un módulo todavía sin resolver
siga ocultando.

## Salidas

- `outputs/linea-base-con-enlaces.log` — la medición completa de la línea base.
- `outputs/{linea-base,variante-a-jsx,variante-b-extends}.resumen.txt` — conteo,
  archivos y familias de cada variante, derivados con el comando que cada
  archivo cita en su cabecera.
- `outputs/cli-tsconfig-antes.json` — el archivo antes de tocarlo.
- Los logs completos de A y B viven en `.claude/jobs/tc-jsx-20260919T113203/`
  y `.claude/jobs/tc-extends-20260919T113250/`, versionados; no se duplican
  aquí (1.4M) porque su resumen derivado es lo que sostiene el veredicto.
