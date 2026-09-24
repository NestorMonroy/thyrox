# Porte completo de compaction/compact.ts y su cierre de dependencias

Directiva del ejecutor: nada de portes parciales; lo que falte se implementa.

## Medicion (antes de portar)

- `outputs/source-imports.txt`: los 50 imports de `ccnmt: agent/compaction/compact.ts`.
- `probes/check_imports.ts` + `outputs/import-check.tsv`: esos imports
  llevados a `@thyrox/*` y comprobados con el compilador; 10 simbolos no
  resuelven, 8 de ellos no definidos en ningun modulo de thyrox.
- `probes/port_coverage.ts` + `outputs/coverage-*.tsv`: cobertura simbolo por
  simbolo de cada modulo del cierre contra su fuente.
- `outputs/thyrox-defined-names.txt`: nombres declarados en todo
  `src/packages`, para separar lo reubicado de lo ausente.

| Modulo (fuente) | Ausentes en su archivo | Ausentes en todo src/packages |
|---|---|---|
| agent/contextAnalysis.ts | 3 | 3 |
| agent/context.ts | 7 | 4 |
| config/global/config.ts | 93 | 11 |
| agent/compaction/compact.ts | 32 | 16 |
| agent/hooks.ts | 41 | 38 |
| agent/attachments.ts | 95 | 86 |

Metrica: declaraciones de nivel superior por nombre.
Ciega a: un simbolo renombrado al portarlo, y un homonimo de otro significado
que cuenta como presente; la segunda columna es por eso una cota inferior de
lo ausente.

Orden de porte: de menor a mayor, cada modulo completo en un paso del lazo.

## Pausa por licencia (antes de portar)

Un primer intento copio en bloque el texto de la fuente a `messages.ts` y
`provider/errors.ts`. La fuente es `UNLICENSED` (`ccnmt: package.json:8`) y su
`ATTRIBUTION.md` pide revision manual de derechos para reutilizarla; la regla
de porte completo manda reimplementar el patron y el contrato de lo
propietario, sin pegar su texto. El intento se revirtio sin commitear. Los
`outputs/*-plan*.tsv` y `*-applied.tsv` solo listan nombres de simbolos y lineas
de import, no codigo. La forma del porte (reimplementacion nativa o copia
autorizada) la decide el ejecutor.
