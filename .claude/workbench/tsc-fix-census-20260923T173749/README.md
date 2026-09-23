# tsc_fix_census: el censo de proponentes del lazo tsc cero

`src/verify/tscFixCensus.ts` (entrada `bin/tsc_fix_census`, vía
`src/verify/tsc_fix_census.sh`): para cada diagnóstico del servicio de lenguaje,
los code fixes ofrecidos y su clase (`safe`, `judgment`, `hides`,
`unclassified`) según el plan tsc cero. Suite: `tests/verify/tscFixCensus.test.ts`.

Refactor previo: los servicios de lenguaje en memoria y de proyecto salieron de
`removeUnusedImports.ts` a `src/verify/tsLanguageService.ts`; la suite del
eliminador (11 casos) siguió verde.

## Lo que se midió al construirlo

- **El servicio sólo pone `fixId` cuando hay más de una instancia arreglable en
  el archivo** (sonda `fixid-presence`: una instancia → sin id; dos →
  `unusedIdentifier_deleteImports`). Clasificar por `fixId` haría depender la
  clase de cuántos errores hermanos tiene el archivo. Por eso:
  - `unusedIdentifier` se clasifica por su EFECTO: si todas sus ediciones son
    borrados dentro de declaraciones `import`, es `safe`; si no, `judgment`;
  - las demás clases se buscan por `fixId` y, si falta, por `fixName`: son dos
    tablas, y la suite ejerce las dos.

## Anulaciones (con `bin/annulment_control --replace`)

| Pieza | Cae |
|---|---|
| `closed-list` — `unclassified` por defecto pasa a `safe` | «un fixId fuera de la lista cerrada no se admite» |
| `effect-guard` — `unusedIdentifier` siempre `safe` | «un parámetro sin uso NO es seguro» |
| `unused-special-case` — sin el trato por efecto | «un import sin uso, SOLO en su archivo, trae un arreglo seguro» |
| `hides-by-id` — sin la entrada `hides` de la tabla por id | «con DOS instancias (fixId presente) sigue tapando» |
| `hides-by-name` — sin la entrada `hides` de la tabla por nombre | «una conversión sin solape trae un arreglo que TAPA el error» |

`*-NONDISCRIMINATING-hides-entry*`: la primera anulación de la entrada `hides`
no tumbó nada, porque la tabla por `fixId` no la ejercía ningún caso. Se
conserva como evidencia; el caso de dos instancias es su corrección.

Las cuatro primeras se corrieron con la suite de 8 casos; la quinta y la sexta,
con la de 9.

Métrica: casos de la suite por pieza anulada; blob del sujeto antes y después
en `annulment.jsonl`.
Ciega a: un `fixId` que el servicio ofrezca en el proyecto y ningún caso cree;
ésos salen `unclassified` y no se admiten, que es el lado seguro.

## Un proveedor de TypeScript que lanza (2026-09-23)

El primer censo real sobre el árbol murió con exit 1: un proveedor de code
fixes de TypeScript 5.9.3 lanzó `TypeError: … 'type.symbol.declarations'`
sobre algún diagnóstico, y un solo proveedor roto abortaba el censo entero
(job `tsc-fix-census-*`). Ahora esa fila queda con `fixError`, sin arreglos
admitidos (el lado seguro), y el resumen publica `providerErrors`.

| Pieza | Cae |
|---|---|
| `provider-guard` — relanzar el error en vez de registrarlo | sólo «un proveedor que lanza no aborta el censo» |

`*-INVALID-provider-guard-finally*`: una primera anulación cambió `catch` por
`finally`. Eso deja el `continue` ejecutándose siempre, y tumbó 7 casos en vez
de 1. No anulaba la guarda: rompía el recorrido. Se conserva como evidencia de
una anulación mal diseñada.
