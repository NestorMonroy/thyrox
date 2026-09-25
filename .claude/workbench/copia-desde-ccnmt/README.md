# copia-desde-ccnmt

## El encargo

<!-- verbatim -->
«copia lo que puedas copiar hacia thyrox, porque se quedo registrado como lo
copiamos de claude-code-nestor-monroy-tools que ahora esta en
kaupamex-docs/.claude/eventos/recibir-nestor-monroy-tools-20260827T191257/extraido/claude-code-nestor-monroy-tools»

## Las piezas

| archivo | qué es |
|---|---|
| `classify_divergence.py` | clasifica cada par distinto en `alias` / `comentario` / `codigo` |
| `outputs/thyrox.txt`, `outputs/ccnmt.txt`, `outputs/comunes.txt` | los `.ts`/`.tsx` de cada árbol bajo `packages/`, y la intersección |
| `outputs/estado.txt` | `igual`/`distinto` por archivo común, medido con `cmp` |
| `outputs/cubos.tsv` | el cubo de cada archivo distinto |
| `outputs/directivas-distintas.txt` | los de cubo `comentario` cuyas directivas `@ts-*`/`eslint`/`biome` difieren: pasan a `codigo` |
| `outputs/a-copiar.txt` | lo que se copió: `alias` + `comentario` sin esas dos |

## Los resultados

Los 3293 `.ts`/`.tsx` de `ccnmt/packages` existen todos en `thyrox/src/packages`
con la misma ruta (thyrox tiene 3841: 548 son propios). De los 3293, 840 eran
idénticos byte a byte y 2453 distintos:

| cubo | archivos | qué se hizo |
|---|---|---|
| `alias` | 966 | copiados, reescribiendo `@claude-code-how-works/` → `@thyrox/` |
| `comentario` | 456 | 454 copiados igual; 2 difieren en directivas y van a `codigo` |
| `codigo` | 1031 (+2) | NO copiados: llevan las correcciones del lazo tsc y los portes de 2.1.275/2.1.281, y sobrescribirlos las revertiría |

Tras la copia, los 1420 son idénticos byte a byte a la fuente con el alias
reescrito (`cmp`, 0 distintos); 477 cambiaron en git, los otros 943 ya lo eran
salvo espaciado.

*Métrica:* igualdad de contenido tras normalizar alias, espacios al final y
líneas en blanco (`alias`), y además sin comentarios (`comentario`).
*Ciega a:* un comentario con semántica que no sea una directiva de las tres
familias medidas; y al cubo `codigo`, cuya copia sólo se decide archivo a
archivo en el lazo, midiendo tsc antes y después.

tsc tras la copia: **2379**, igual que `step-073/final.log`, y sin ningún
archivo que cambie su cuenta (`outputs/tsc-tras-copia.log`). Auditor de forma:
0 hallazgos. Es la prueba de que la copia no tocó código.
