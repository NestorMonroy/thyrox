# `@thyrox/binary`

Análisis del ejecutable de Claude Code. Lee el contenedor que Bun escribe
dentro del binario y lo deja en piezas nombradas, para que una medición cite
**un módulo** en vez de una ventana de 160 caracteres sobre un volcado.

## Por qué existe

Medido 2026-09-02 sobre `_references/claude-code-bin/`:

| build | archivos | `src/` | `bunfs-root/` |
|---|---|---|---|
| 2.1.241 | 150 | 25 | 11 |
| 2.1.246 | 1716 | 25 | 1576 |
| 2.1.250 | 2 | 0 | 0 |
| 2.1.251 | 2 | 0 | 0 |
| 2.1.258 | 2 | 0 | 0 |

Las tres builds recientes tienen **sólo el volcado de `strings`**. Toda cita
del binario en esas versiones —`qZt=20000`, `BZt=13000`, el bloque `aliases`,
los 19 registros de modelo— salió de `grep` sobre 801 543 líneas sin frontera
de módulo: no distingue una definición de una sombra, ni dice en qué chunk vive.

## Estado

| Etapa | Módulo | Estado |
|---|---|---|
| `extract` — ELF, trailer, tabla de módulos | `elf.ts` · `bunfs.ts` | hecha |
| `write` — corpus en disco con `MANIFEST.tsv` | `corpus.ts` | hecha |
| `reflow` — reformateo para que el texto sea citable | `reflow.ts` | hecha |
| `graph` — imports entre módulos | `graph.ts` | hecha |
| `organize` — reparto por papel en el grafo | `organize.ts` | hecha |
| `freshness` — corpus contra ejecutable vivo | `freshness.ts` | hecha |
| `classify` — vendor contra aplicación | — | **sin señal**, tarea **#18** |

**`split` no aplica.** bun-demincer parte un `bundle.js` en módulos; nuestra
tabla ya trae 1802 entradas nombradas. Dentro de un chunk **no queda frontera
que recuperar** — medido sobre `chunk-vw215j9f.js`: `__commonJS` 0, `__esm` 0,
comentarios de ruta 0. Lo que sí hacía falta ahí era el reformateo.

## Uso

```ts
import { findSection, readModuleTable, deriveVersion, SECTION_HEADER } from '@thyrox/binary'

const bytes   = readFileSync('/opt/claude-code/bin/claude')
const seccion = findSection(bytes, '.bun')!
const payload = bytes.subarray(seccion.offset + SECTION_HEADER, seccion.offset + seccion.size)

deriveVersion(bytes.subarray(seccion.offset, seccion.offset + seccion.size))  // '2.1.258'
readModuleTable(payload)!.entries.length                                      // 1802
```

## Qué se derivó y qué se lee

El contenedor **no está documentado por Bun**. Los desplazamientos del ELF son
los del gABI; el trailer y la forma de la tabla se midieron:

- el trailer es `\n---- Bun! ----\n`, con `(offset, largo)` de la tabla como
  **u32** en `fin - 24` — leerlos como u64 devuelve offsets fuera del payload;
- la sección antepone **8 bytes** de cabecera, y los punteros del trailer son
  relativos al payload, no a la sección;
- el **paso entre entradas no está declarado en ninguna parte**: se prueba cada
  candidato y se acepta el que produce nombres imprimibles bajo `/$bunfs/root/`
  en *todas* sus entradas. Un paso equivocado produce basura, no rutas.

El payload es **JavaScript minificado en claro**, no bytecode: por eso esto es
un lector de formato y no un descompilador.

## Licencia — por qué se reimplementa

`claude-code-nestor-monroy-tools/bun-demincer` es un fork de
`vicnaum/bun-demincer`, **sin licencia declarada upstream** — el caso más
restrictivo de `porte-completo-no-parcial.md`. Se reimplementa el patrón de
forma nativa; no se copia texto. La fidelidad del resultado no baja por eso:
lo que cambia es el mecanismo, nunca el alcance.

## Control positivo

`extraer_modulos_del_binario.py`
(`.claude/eventos/extraer-binario-20260823T005658/sondas/`) extrajo 2.1.246 con
SHA-256 por archivo. Dos implementaciones independientes coinciden sobre
2.1.258: **1802 entradas, tabla de 93 704 B, 38 463 684 B de contenido**.

## Tests

```bash
cd .claude/packages/binary && bun test
```

## Comandos

```bash
bun run bin/binary.ts info                  # versión, sección, tabla, tipos
bun run bin/binary.ts extract [--out RAIZ]  # corpus en <RAIZ>/<versión>/
bun run bin/binary.ts graph [--json]        # 1628 nodos, 13 182 aristas
bun run bin/binary.ts freshness             # exit 1 si el corpus está atrás
bun run bin/binary.ts reflow chunk-x.js --out /tmp/x.js
```

## Lo que el reformateo compra

Medido sobre `chunk-vw215j9f.js` de 2.1.258 (5 493 162 B, 674 ms):

| | antes | después |
|---|---|---|
| líneas | 5 242 | 121 048 |
| ancho medio | 1 048 B | 54 B |
| línea mayor | 224 061 B | 55 702 B |

`grep -n "qZt=20000"` pasa de devolver una línea de 224 KB a devolver
`38829:    }var qZt=20000;`. Ésa es toda la diferencia entre citar un símbolo y
citar una ventana de caracteres alrededor de él.

Su única garantía es que **el texto sin espacio en blanco no cambia**, y se
comprueba sobre el chunk entero, no sobre casos escogidos. No renombra, no
reordena, no pliega: cada una de esas cosas disolvería la garantía.

## Lo que el gate de frescura reporta hoy

```
$ bun run bin/binary.ts freshness
el corpus llega a 2.1.246 y el ejecutable declara 2.1.258; extraer 2.1.258
exit=1
```

El discriminador es el `MANIFEST.tsv`, no la existencia del directorio:
`_references/claude-code-bin/2.1.258/` existe y trae dos archivos —README y volcado
de `strings`—, ninguna extracción. Contar la carpeta sería un verde que no
distingue «extraída» de «tiene carpeta con su nombre».

Sus aserciones se anclan a una de tres cosas y el comentario dice a cuál: el
**gABI**, el **contenedor de Bun**, o **la build medida**. Una build es
inmutable, así que fijar sus cifras es evidencia fechada.

Controles corridos (sub-patrón D): mover una cifra fijada tira **1** de 11
casos; declarar la build como desconocida hace fallar el mismo caso con el
mensaje que nombra la versión a medir — que es la señal de frescura que faltó
tres builds seguidas.
