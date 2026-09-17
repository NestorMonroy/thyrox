# Barrer las citas a `2.1.266` en kaupamex-docs

`TASK-THYROX-0069` · cierra la mitad de consumidor de la falsificación de
`H-DOCS-1274`, cuya mitad de proveedor es `thyrox@325ce8cd`.

## Por qué un censo y no un `sed`

Una cita a una build vieja puede ser **correcta**. La evidencia fechada de un
episodio cita la build que midió ese día, y reescribirla borraría la memoria
episódica — el mismo criterio con que
`referencia-odoo-gobierna-las-decisiones.md` conserva las citas históricas a
`odoo19x/`. Lo que sí caduca es el **puntero a corpus** de un documento que
presenta el mecanismo como vigente.

## El resultado — 1 de 28

```
citas=28 archivos=14 subárboles=source,.claude
  corpus_pointer         4
  dated_evidence_path   10
  dated_in_line          1
  unclassified          13
```

Aplicado el juicio sobre los dos cubos que lo piden:

- **27 se quedan.** Los 13 `unclassified` son todos de la forma
  `2.1.266: <símbolo>` — el **alias que etiqueta la población**, igual que
  `odoo19c:`/`odoo18c:`. Tres de los 4 `corpus_pointer` citan el chunk o el
  volcado **como la fuente que midieron**, con fecha.
- **1 se corrige:** `hallazgo-H-DOCS-1274`, cuyo `.. warning::` declaraba
  `2.1.266/claude_strings.txt` como fuente de la cadena **vigente** y publicaba
  una cifra de otra unidad.

## El control de anulación

Retirada la mitad de puntero a corpus (`--no-corpus-rule`), caen **exactamente**
esos 4 al cubo sin clasificar —13 → 17— y ninguna otra cifra se mueve. Es lo
que hace del instrumento un control y no un adorno: si el cubo no discriminara,
el reparto sería el mismo con y sin la regla.

```
outputs/census.log                      el reparto con la regla activa
outputs/anulacion.log                   el reparto con la regla retirada
outputs/citations-2.1.266.jsonl         las 28 citas, una por línea
outputs/citations-no-corpus-rule.jsonl  ídem bajo la anulación
```

## La cifra corregida

| Corpus | ocurrencias crudas | líneas | cadenas distintas |
|---|---|---|---|
| `2.1.266: claude_strings.txt` (binario **entero**) | 164 | **68** | 32 |
| `2.1.274: chunk-ayyj05ne.js` (**un** chunk) | **43** | 4 | 24 |

«68 ocurrencias» era el conteo de **líneas** del volcado, rotulado como
ocurrencias. Y las dos filas no son comparables por tres ejes: corpus, unidad,
y —lo que decide— **cambió la forma de lo que se cuenta**:
`anthropic-ratelimit-unified-5h-utilization` da **0** en el chunk de 2.1.274 y
**2** en el volcado de 2.1.266, porque la build vigente lo compone por
interpolación (`${s}`). De ahí que el extractor se ancle en el prefijo.
