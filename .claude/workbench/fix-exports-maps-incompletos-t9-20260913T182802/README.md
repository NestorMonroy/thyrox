# fix-exports-maps-incompletos-t9

## El encargo

<!-- verbatim, sin parafrasear -->
"vamos a Fix incomplete per-package exports maps (9 packages, 33 files) [...]
en TDD usando las las herramientas que proporciona thyrox de manera corecta
[...] /home/user/thyrox/src/session/**"

## La premisa, si se corrigio al primer comando

**No.** La tarea traia una cifra de un audit ad-hoc anterior: "9 paquetes, 33
archivos". El primer comando real (portar el algoritmo de
`tests/package/exports.test.ts` -- el propio test del paquete raiz, que SI
recorre disco -- a una nueva "bloque 4" de `tests/package/sibling_exports.test.ts`,
que antes solo validaba las entradas YA existentes en cada mapa, nunca el
arbol de archivos) dio **12 paquetes**, no 9. La cifra vieja no se corrigio en
la tarea original: se remidio con el instrumento correcto y se documenta aqui
la discrepancia, no se oculta (`calibration-verified-numbers.md`).

## Las piezas

| archivo | que hace |
|---|---|
| `tests/package/sibling_exports.test.ts` (bloque 4) | el test rojo->verde: recorre `src/` de cada paquete hermano y exige que TODO `.ts`/`.tsx` resuelva a si mismo por el mapa de `exports`, exacto o por el comodin `*` mas largo |
| `probes/probe-uncovered.ts` | guion de diagnostico standalone (misma logica que bloque 4) usado para listar, por paquete, el archivo sin cobertura y la entrada de `exports` que haria falta -- corrido antes de tocar ningun `package.json` |
| `outputs/fallidos-en-anulacion.txt` | los 12 nombres de paquete que fallan bajo la anulacion (fix retirado, test con su propia correccion intacto) -- identicos a los 12 que fallaron en la medicion original |
| `outputs/suites-por-paquete.log` | `bun test` de cada uno de los 12 paquetes tocados, corridos en PARALELO via `src/session/run-task-pool.sh --width 4` (ancho `nproc`) |

## Los resultados

**12 paquetes, 44 entradas nuevas** en sus `exports` (nunca se toca ninguna
entrada existente -- cada diff es puramente aditivo, confirmado linea a linea):
`app-host` +6, `command-runtime` +10, `context-compression` +13,
`ide` +1, `provider` +3, `shell` +1, `storage` +1, `swarm` +3, `teleport` +2,
`tool-registry` +1, `updater` +1, `voice` +2.

**Dos formas del defecto, no una:**

1. **Modulos de directorio** (`src/commands/clear/index.ts`, `src/mailbox/index.ts`, …):
   el comodin generico `"./*": "./src/*.ts"` que casi todo paquete hermano
   declara SOLO sabe producir `<subpath>.ts` -- nunca `<subpath>/index.ts`. Un
   directorio nuevo con `index.ts` queda invisible al comodin y necesita su
   propia entrada explicita, igual que el paquete raiz (`thyrox`) ya hace para
   los suyos (82 entradas, todas explicitas, `tests/package/exports.test.ts`
   bloque 2, que SI pasaba -- por eso el defecto nunca se vio ahi).
2. **Archivos `.tsx`** (`context/fpsMetrics.tsx`, `hooks/useIDEIntegration.tsx`, …):
   el mismo comodin genera `.ts`, nunca `.tsx`. Varios paquetes YA tienen una
   entrada `.js`-sufijada especifica para el archivo `.tsx` (p. ej.
   `"./hooks/useIDEIntegration.js": "./src/hooks/useIDEIntegration.tsx"` en
   `ide`) pero les falta la gemela SIN sufijo -- la convencion real del arbol
   admite ambas formas por archivo (medido: 602 imports internos con sufijo
   `.js` en el subpath, 454 sin el), y el paquete raiz usa EXCLUSIVAMENTE la
   forma sin sufijo (0 de 82 con `.js`). Esta correccion sigue esa segunda
   convencion -- la del propio paquete raiz, mas grande y mas escrutado.

**El porte tuvo TRES correcciones declaradas sobre el original, no dos** --
la tercera la destapo el fix mismo, no una lectura previa:

1. `.tsx` incluido en `sourceModules` (el original solo mira `.ts`).
2. Operar por directorio de PAQUETE, no fijo a la raiz de `thyrox`.
3. `src/index.ts` cuenta cubierto tambien si `.` resuelve a el -- pero **NO**
   como colapso incondicional. El primer intento hardcodeaba
   `subpathFor('index') === '.'`, y eso rompio `@thyrox/permission`: su `.`
   apunta a `permission.ts`, no a `index.ts` -- `index.ts` ahi es un modulo
   SECUNDARIO real, ya cubierto por el comodin generico via su propia ruta
   (`./index`). Colapsar siempre a `.` habria hecho que
   `resolveSubpath(exports, '.')` devolviera `permission.ts`, que nunca
   coincide con `index.ts`, y el test lo habria marcado falsamente como sin
   cubrir. La forma correcta: `.` es una ruta ALTERNATIVA de cobertura, no la
   unica -- se prueba la ruta propia primero, `.` solo como fallback. Esto
   tambien evito una entrada espuria `"./index"` que el primer intento del
   fix habia insertado en `context-compression` (redundante con `.`, que ya
   cubre el mismo archivo) -- se detecto ANTES de commitear, no quedo en el
   arbol.

**Control de anulacion** (`git stash` sobre solo los 12 `package.json`, test
intacto): reaparecen **exactamente** los mismos 12 paquetes que la medicion
original -- ni uno de mas, ni uno de menos (`outputs/fallidos-en-anulacion.txt`).
`git stash pop` + `git status --short` confirman restauracion sin perdidas.

**Verificacion, con las herramientas de `src/session/` pedidas:**

```
$ bun test tests/package/sibling_exports.test.ts    # verde: 113 pass, 0 fail
$ bun test tests/package/                            # derivado (transversal
                                                       # al tocar exports):
                                                       # 182 pass, 0 fail
$ printf '%s\n' <12 comandos "bun test" por paquete> \
    | bash src/session/run-task-pool.sh --width 4 --timeout 300 -
  # 12 de 12 trabajos EXIT=0 (ver outputs/suites-por-paquete.log)
```

`src/packages/agent/loop/index.ts` no consume ninguno de los 12 paquetes por
su subpath faltante especificamente (se confirma por exclusion: ninguno de
los 12 aparece en el `sinCubrir` de `tests/package/exports.test.ts`, que
mide el mapa RAIZ -- ese mapa ya declaraba la entrada de directorio para
cada uno de los subpaths que `agent` importa, via su propia entrada
explicita `./packages/<paquete>/src`). Su relevancia para esta tarea era
como CONSUMIDOR REAL de referencia, no como superficie a tocar -- y su
suite (`tests/package/`) ya cubre esa direccion sin cambios adicionales.

*Metrica:* `sourceModulesOf(paquete)` (recorrido AST-libre de `src/`, solo
extension) contra `resolveSubpath(exports, subpathFor(...))` -- coincidencia
exacta de destino, por archivo, por paquete.
*Ciega a:* un archivo alcanzable por una ruta que el algoritmo NO prueba (solo
prueba la ruta canonica + `.` como fallback para el indice de raiz) -- si
existiera una tercera convencion de acceso legitima en este arbol, este test
no la veria y podria pedir una entrada que ya era redundante por otra via no
contemplada aqui. Los 44 casos medidos no mostraron ese patron.
