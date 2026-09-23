# Retirar imports sin uso: sólo imports, con el checker

Herramienta: `src/verify/removeUnusedImports.ts` (`organizeImports` en modo
`RemoveUnused`). Suite: `tests/verify/removeUnusedImports.test.ts`.

Por qué es mecánico: `tsconfig.json` no declara `verbatimModuleSyntax`, así
que tsc y el transpilador de Bun ya eliden un import sin uso. Retirarlo no
cambia el runtime. Un local o un parámetro sin uso NO se toca: es firma o
porte a medias.

## Anulación, en tres intentos — dos no discriminaban

| Archivo | Sustituto | Cayeron | Por qué |
|---|---|---|---|
| `annulled-without-noUnused-options.txt` | `unusedIdentifier_delete` sin `noUnused*` en las opciones | 4 de 6 | sin esas opciones TS6133 no existe; el sustituto no hacía nada |
| `annulled-delete-only-no-imports.txt` | `unusedIdentifier_delete` con opciones | 4 de 6 | ese id NO retira imports (medido: hay otro, `unusedIdentifier_deleteImports`) |
| `annulled.txt` | los dos ids juntos: «retirar todo lo sin uso» | **1 de 6**: «no toca locales ni parámetros» | la anulación válida |

`restored.txt`: 6 de 6.

Métrica: casos de la suite por implementación.
Ciega a: imports cuyo módulo alguien espere cargar por efecto sin usar
ningún binding (tsc ya los elide, la conducta no cambia).

## Segunda versión: el primer lote reformateaba

Aplicada al proyecto, `organizeImports` con opciones de formato vacías
reescribía los bloques que conservaba: `;` añadidos, sangría perdida, comas
sin espacio, en 230 archivos (+2426 / −2727). Uno de ellos declara que sus
imports no se reordenan (`ANT-ONLY import markers`). El lote se revirtió
entero sin verificar y el tsc que lo medía se detuvo (exit 143, recogido).

Caso rojo nuevo: «no reformatea lo que conserva». Implementación nueva:
`unusedIdentifier_deleteImports`, que edita sólo el tramo del binding.

| Archivo | Anulación | Cae |
|---|---|---|
| `v2-annulled-organize.txt` | volver a `organizeImports` | sólo «no reformatea» |
| `v2-annulled-everything.txt` | `deleteImports` + `delete` | sólo «no toca locales ni parámetros» |
| `v2-restored.txt` | — | 7 de 7 verdes |

## Tercera versión: un nombre que el checker da «sin uso» y el archivo nombra

El lote v2 bajó tsc de 4 787 a 4 475, pero introdujo 3 diagnósticos nuevos:
- `provider/src/fastMode.ts`: `local-observability` reexporta
  `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` como TIPO
  (`export type { … }`) y el archivo lo usa como valor (`typeof X`). El
  checker da TS2693 en los usos y TS6133 en el import. Retirar el import
  cambió 3 diagnósticos por 2 TS2304 (neto −1) escondiendo el defecto, que
  está en el uso.
- la propia herramienta: `getCombinedCodeFix(…, undefined)` no tipa.

Por qué los casos en memoria no lo vieron: el host preguntaba al disco por el
directorio virtual `/p`, recibía «no existe» y **todo import quedaba sin
resolver (TS2307)**. Cada caso en memoria medía imports rotos. Control nuevo
del arnés: la fixture no da TS2307 y el caso `typeof` da TS2693. Y la primera
aserción del caso nuevo tampoco discriminaba (el nombre sigue en el cuerpo);
ahora se mide sobre la declaración `import`.

Guard: si un nombre marcado sin uso aparece como identificador fuera de las
declaraciones `import`, el archivo se saltea y se reporta con juicio
pendiente. Y un primer guard comparaba por subcadena (`unused` contiene
`used`) y salteaba de más; ahora compara por igualdad.

| Archivo | Anulación | Cae |
|---|---|---|
| `v3-annulled-named-guard.txt` | el guard devuelve `[]` | sólo «no retira un binding que el archivo nombra» |
| `v3-annulled-organize.txt` | volver a `organizeImports` | sólo «no reformatea» |
| `v3-annulled-everything.txt` | `deleteImports` + `delete` | sólo «no toca locales ni parámetros» |
| `v3-restored.txt` | — | 9 de 9 verdes |
