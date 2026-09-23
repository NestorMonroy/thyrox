# tsc_proposers: los proponentes del lazo tsc cero, reunidos

`src/verify/tscProposers.ts` (`bin/tsc_proposers`). Suite:
`tests/verify/tscProposers.test.ts`, más el caso nuevo de
`tests/verify/removeUnusedImports.test.ts`.

Emite el JSONL de candidatos que leen `bin/tsc_schedule --candidates` y
`bin/batch_verification --proposals`: una propuesta por proponente y archivo,
con `targets` en la forma exacta de `tsc --pretty false` (la suite la compara
con `ts.formatDiagnostics`), `edits` y `bases` (sha256 del texto sobre el que
se propuso). Cada proponente conserva sus guardas; el módulo sólo reúne y
etiqueta. Las claves son relativas al directorio del `tsconfig`, desde donde
corre `tsc -p` en la raíz y en `cli`.

## Lo que el primer rojo destapó

1. **La guarda de `removeUnusedImports` no veía el binding único.** Con un solo
   nombre importado, TS6133 cubre la declaración entera, y la guarda comparaba
   el tramo con el texto del nombre: sólo reconocía el caso de varios bindings,
   que era el único de su suite. Ahora cuenta el binding que el tramo contiene.
2. **Dos propuestas del mismo archivo no se componen.** Aplicar la segunda sobre
   el resultado de la primera metió `: number` en otro sitio (TS2693): las
   posiciones son del texto original. De ahí `bases`, y el aplicador rehúsa si
   el archivo cambió. `tsc_schedule` ya no junta dos propuestas de un archivo.

## Anulaciones (`annulment.jsonl`)

| Pieza anulada | Cae |
|---|---|
| `single-binding-guard` — comparar el tramo con el nombre | «con un solo binding TS6133 cubre la declaración entera…», «keeps the unused-imports guard…» |
| `touches` — todo diagnóstico reclamado cuenta como tocado | «claims only the diagnostics its edits touch», «the edits of each candidate close its targets…» (reclama el TS6133 del local, que la edición no cierra) |
| `claimed-codes` — sin filtro por código | «claims only the diagnostics its edits touch» (reclama el TS2305 pegado) |
| `base-hash` — sin comprobar la base | «refuses to apply a candidate over a file that changed…» |

Sin caso que discrimine, declarado: la rama que descarta una edición sin
ningún objetivo reclamado. Ningún proponente actual produce esa forma en una
fixture; su condición de cierre es un proponente que la produzca.

Métrica: casos de las dos suites por pieza anulada.
Ciega a: si las claves aparecen en el log real de `tsc` — lo mide
`batch_verification`, que da `no-targets` cuando no aparecen.
