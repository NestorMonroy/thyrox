# board_store_drift — el control positivo de la propagación board → store

Capturado el **2026-09-12T18:45:11** desde la sesión viva
`168b0fdf-bfe4-590b-b6c0-b6be124c124a`, **antes** de cualquier `--aplicar`.
Es un positivo **real del repo**, no uno fabricado: fabricarlo lo escribiría
quien escribió el instrumento, y confirmaría su propio encuadre
(`hallazgo-abierto-genera-sucesor.md`).

| Archivo | Qué es |
|---|---|
| `card_369.json` | la tarjeta `369` del board, verbatim |
| `store_row_369.json` | la fila de `tasks` con `citation_id = TASK-DOCS-0542`, verbatim |

**La divergencia que reproduce.** Las dos piezas comparten `subject` —que es la
llave con la que el reconciliador aparea— y difieren en `description`: la
tarjeta lleva la causa **corregida** de H-DOCS-1264 (`docs@576393e3d`) y la fila
conserva la causa **falsa** que aquel hallazgo publicó primero. El `TaskUpdate`
nativo del harness escribe la tarjeta JSON y **no** toca el store, así que la
corrección se quedó en el board.

Medido en el momento de la captura, sobre las 368 tarjetas de la sesión:

```
same             324
status_drift       0
field_drift        1     <- #369 TASK-DOCS-0542  description
absent            42
ambiguous          1
```

**Por qué este caso y no otro:** es el único `field_drift` vivo, y su columna
divergente es `description`, que es la que `RECONCILED_FIELDS` añadió el
2026-09-12. Un control sobre `status` no habría discriminado —ese cubo estaba
en 0—, así que habría pasado con el mecanismo y sin él.
