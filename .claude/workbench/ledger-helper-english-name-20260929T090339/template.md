Renombras en thyrox (bash) un identificador en español de `tests/session/test-headless-pool.sh`.
El `Item:` de abajo nombra el único archivo que te pertenece; no toques ningún otro. Usa
`bash bin/replace_literal --all`, no reescribas el archivo.

La función `reservas_en_registro` y su variable local `archivo` violan la regla de identificadores
en inglés (los comentarios siguen en español). Renómbralas a `ledger_reservation_count` y `ledger`,
en su definición y en todas sus llamadas. No cambies su conducta ni los textos de las aserciones.

Comprueba con `grep -c reservas_en_registro` que queda 0, y corre la suite.

Criterio de cierre: `bash tests/session/test-headless-pool.sh` en verde (128 de 128).
