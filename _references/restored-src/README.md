# restored-src — el árbol de Claude Code que el libro `heng` cita

Reconstrucción del código fuente restaurado de **Claude Code v2.1.88** a partir
de las rutas y los bloques de código que el corpus `heng` cita en sus 47
capítulos markdown.

**Generado, no escrito a mano.** El árbol entero lo produce
`.claude/eventos/restored-src-20260822T232740/sondas/extraer_restored_src.py`:

```bash
python3 .claude/eventos/restored-src-20260822T232740/sondas/extraer_restored_src.py
python3 .claude/eventos/restored-src-20260822T232740/sondas/extraer_restored_src.py --dry-run
```

Editar un archivo a mano es fabricar una segunda fuente de verdad que nadie
sincroniza. Lo que cambia es el generador; el árbol se vuelve a emitir.

## Ningún archivo de este árbol está completo

Cada archivo es el conjunto de **fragmentos** que el libro cita de él, en orden
de línea, con los huecos marcados explícitamente:

```
// ─── part1/ch01.md · líneas 9-20 ───
// nota del libro: 省略 ESLint 注释和空行
import { profileCheckpoint } from './utils/startupProfiler.js';
…
// ─── ausente: líneas 22-69 (48 líneas sin fragmento en el corpus) ───
```

El propio libro lo declara: la mayoría de sus cabeceras traen una nota entre
paréntesis de ancho completo diciendo qué omitió (`省略…` = «se omite…»). Un
fragmento es un **extracto con huecos declarados**, nunca un archivo.

## Procedencia — de dónde sale cada ruta

`MANIFEST.tsv` declara, por archivo, con qué evidencia se conoce. Los cinco
ejes están separados a propósito: confundirlos es el sub-patrón **A** de
`metrica-decide-la-conclusion.md` — un rótulo que nombra una métrica y contiene
otra.

| Eje | Qué es |
|---|---|
| `FRAGMENTO` | la ruta encabeza un bloque **con** el prefijo `restored-src/` |
| `RELATIVO` | la ruta encabeza un bloque **sin** el prefijo; se resuelve contra `restored-src/src/` |
| `MENCION` | la ruta aparece anclada en prosa o tabla, sin bloque |
| `IMPORT` | derivada de un especificador `./x.js` dentro de un bloque **con contenedor conocido** |
| `IMPORT_SUELTO` | derivada de un especificador en un bloque **sin cabecera**; el contenedor se **asume** `restored-src/src/` |

Un archivo puede tener varios ejes, así que el reparto no es una partición. El
conteo por eje **no se transcribe aquí** — es una propiedad del manifiesto, que
se regenera; lo publica el propio generador al correr, y se recupera con:

```bash
for e in FRAGMENTO RELATIVO MENCION IMPORT IMPORT_SUELTO; do
  printf '%-14s ' "$e"
  awk -F'\t' -v e="$e" 'NR>1{n=split($2,a,"+"); for(i=1;i<=n;i++) if(a[i]==e) c++} END{print c+0}' \
    _references/restored-src/MANIFEST.tsv
done
```

### Por qué existen dos ejes de cabecera

El apéndice A del libro lo declara verbatim: *«文件路径相对于
`restored-src/src/`»* — las rutas son relativas a ese directorio. En la
práctica el libro escribe la cabecera de **dos** formas, y medido sobre el
corpus la que **no** lleva prefijo es la mayoritaria: **192** bloques anclados
contra **235** relativos. Un instrumento que sólo viera la primera publicaría
menos de la mitad del corpus bajo el rótulo «fragmentos».

### Por qué `IMPORT_SUELTO` es el eje más débil

Su ruta descansa en una suposición: que el bloque ilustrativo sin cabecera
pertenece a un archivo en la raíz `restored-src/src/`. La suposición está
acotada por medición, no por confianza:

- los **10** especificadores de esos bloques son **todos** `./`-enraizados —
  **0** con `../`—, así que ninguno depende de saber a qué profundidad está su
  contenedor;
- el patrón tiene precedente anclado: `src/tools.ts` declara
  `require('./tools/WebBrowserTool/WebBrowserTool.js')` **con** cabecera, que es
  la misma forma que `./tools/SleepTool/SleepTool.js` sin ella.

### Lo que el generador NO resuelve, y declara

**59 bloques con cabecera de hoja ambigua** (`claudemd.ts`, `hooks.ts`,
`microCompact.ts`…) quedan fuera del árbol. Una hoja sin directorio se resuelve
sólo si el conjunto ya conocido la contiene de forma **única**; si no, su
directorio no consta y **no se inventa** — prefijarla con `src/` la colocaría en
el sitio equivocado, que es lo que ocurre con `claude.ts` (real:
`src/services/api/claude.ts`). El generador las lista al terminar.

## Métrica y ceguera

*Métrica:* cabeceras de bloque (ancladas y relativas), menciones ancladas en
prosa, y especificadores relativos resueltos contra su contenedor —declarado o
asumido— sobre los 47 markdown de la edición china del corpus.

*Ciega a:*

- los **350** bloques sin cabecera de ninguna forma: su código existe en el
  libro y no tiene archivo al que pertenecer;
- las rutas que el libro nombra **sólo** en prosa sin el prefijo `restored-src/`
  — el eje `MENCION` exige el ancla, así que una ruta suelta en un párrafo no
  entra;
- los especificadores **desnudos** (`import x from 'zod'`): son paquetes, no
  archivos del árbol;
- **el contenido de los archivos**: ningún archivo está completo, y el
  generador no puede saber cuánto falta salvo donde el libro declara el rango.

## Fuente

`.claude/references/harness-engineering/book/` — la **edición inglesa**, que es
la vendorizada. Licencia MIT («Copyright (c) 2026 Alex»); ver el
`PROVENANCE.md` de `harness-engineering/`.

**Por qué la inglesa, medido contra la china.** El mismo generador sobre las dos
ediciones da **167** rutas frente a 166, con fragmentos y líneas de código
idénticos (368 / 3287) — la estructura de bloques es la misma: 192 anclados,
235 relativos, 350 sin cabecera en ambas. Lo que las separa es el **contenido**:
**175** líneas de código difieren, y la muestra dice qué son —

```
zh:  // 如果不在 plan 模式，启用它
en:  // If not in plan mode, enable it
```

La edición china **traduce los comentarios dentro del código**. Para reconstruir
fuente eso no es una variante de idioma: es una alteración del material. Las 26
líneas restantes son la nota `（省略…）` de cabecera, que es metadato del libro,
no código.

*Métrica:* `diff` línea a línea de los dos árboles generados con el mismo
instrumento.
*Ciega a:* una alteración presente en **ambas** ediciones — el instrumento
compara una contra la otra, no contra el binario original.
