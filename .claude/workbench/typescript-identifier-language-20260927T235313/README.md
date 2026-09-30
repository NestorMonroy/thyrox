# El idioma de los identificadores en TypeScript

`src/verify/check_identifier_language.py` medía sólo `.py`, y la mayor parte
del código del proveedor es TypeScript (`src/packages/**`): sus
identificadores no tenían instrumento.

## Qué queda

- `src/verify/ts_declared_identifiers.ts`: el `declared_identifiers` del gate
  sobre el AST de TypeScript, con el compilador del árbol. Declaraciones de
  función, clase, método, interfaz, tipo, enum y sus miembros, variable
  (también desestructurada), parámetro, propiedad, el alias de un import y la
  clave de un objeto literal que puede ser un nombre. Un archivo que el
  compilador rechaza vuelve con `parsed: false` y no se cuenta como medido.
- El gate le entrega los `.ts/.tsx/.mts` en una sola invocación de `bun` y los
  juzga con el mismo léxico, sin copiarlo. Sin `bun` o sin el recorrido rehúsa
  con exit 2 y sin cifra. `THYROX_TS_IDENTIFIER_EXTRACTOR` sustituye el
  recorrido.
- El recorrido por defecto mide lo **versionado** (`git ls-files`): en disco
  había 2963 `.d.ts` de los `dist/` sin versionar, deuda de un código que
  nadie escribe.
- `.githooks/pre-commit` pasa también los `.ts` staged de `src/` y `tests/`.

## La deuda y el léxico

- 4916 archivos medidos; 2291 identificadores en `.ts` y 23 en `.tsx`.
- Antes de congelarla se leyó la lista de palabras: el criterio de corpus
  marcaba como español palabras inglesas de programación que el corpus
  español también atestigua (`resolver` de `ConflictResolver`, `invocable` de
  `userInvocable`, `paren`) y abreviaturas del código portado (`coord`,
  `uds`, `napi`, `dle`/`efe` de `termio/ansi.ts`, Fisher-`yates`). Entran en
  `TECHNICAL_VOCABULARY`; con ellas salen del baseline seis entradas `.py`
  que eran el mismo falso positivo (`Resolver`, `CANT_PROCEED_RE`).
- `.claude/baselines/identifier_language_baseline.txt`: 4259 entradas
  (2075 `.py`).

## Controles de anulación

`probes/annul.sh`, salida en `outputs/annul.out`: variantes del gate
(`probes/annul-gate.tsv`) y del recorrido (`probes/annul-extractor.tsv`).

*Métrica:* identificadores declarados por AST, contra el léxico del gate.
*Ciega a:* un identificador cuyas palabras existen en los dos idiomas, y a
una abreviatura nueva que el corpus lea como española hasta que se triage.
