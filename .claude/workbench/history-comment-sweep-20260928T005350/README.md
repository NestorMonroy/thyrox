# Barrido de historial en comentarios (#84)

Un comentario dice qué hace el código y por qué; cuándo cambió y en qué
episodio es `git log` o un hallazgo. El barrido es por juicio, no por `sed`.

## Criterio

- **Se reescribe a intención** la línea que narra un cambio («antes era…»,
  «Corregido …», fecha de un episodio, «iter N»): queda la razón vigente.
- **Se conserva** el puntero a un hallazgo o error (`H-…`, `ERR-…`, `:ref:`):
  es la procedencia buscable de la decisión, no su historia.
- **Se conserva** la procedencia copiada verbatim de la fuente portada
  (auditorías, notas de eval, rutas de especificación).
- **Se conserva** «episodio» cuando nombra un concepto del dominio y no un
  suceso.

## Instrumentos

- `probes/scan.py` — líneas marcadas por archivo versionado, con el mismo
  detector que el hook (`src/hooks/detect_history_comment.py`).
- `probes/show.py` — `archivo:línea` de cada línea marcada.
- `outputs/scan.tsv` — el censo con que arrancó el barrido.

*Métrica:* líneas de comentario que el detector marca.
*Ciega a:* historia narrada sin ninguno de sus marcadores, y al falso
positivo que es procedencia legítima — ése lo separa el juicio de arriba.
