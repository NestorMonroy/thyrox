# Anulación de destinos, detección y paso directo (F4)

`src/packages/mitm/src/{targets,detection}/` y `passthrough.ts`. Salida
literal en `results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — la ruta no consulta la exclusión | los tres de precedencia exclusión > destino |
| A2 — la resolución distingue mayúsculas | el caso insensible a mayúsculas |
| A3 — el glob no exige el primer tramo | ninguno: **no discriminaba** |
| A3b — ídem, con el caso nuevo | el prefijo fijo que ancla el inicio |
| A4 — un destino cuyo handler no resuelve a su clase | el que resuelve cada handler portado |
| A5 — un tutorial que vuelve a nombrar la referencia | el que exige el nombre de este producto |
| A6 — el glob no exige el último tramo | el glob del usuario y el sufijo que ancla el final |

A3 no discriminaba porque ninguna prueba de la referencia usa un patrón con
un tramo fijo al principio; sin esa ancla, `api.*` cubre `evil-api.example.com`.
