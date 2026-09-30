# Anulación del inspector sin E/S (F3a)

Módulos puros del inspector en `src/packages/mitm/src/inspector/`, probados
con las pruebas de la referencia portadas y con casos propios. Salida
literal en `results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — `pricing` sin el catálogo de `@thyrox/agent` | los tres que tasan un `claude-*` que ya no está en la tabla |
| A2 — el búfer lee `INSPECTOR_BUFFER_SIZE` sin prefijo | el caso de `THYROX_INSPECTOR_BUFFER_SIZE` |
| A3 — el parser despacha un bloque sin campo `data` | ninguno: **no discriminaba** |
| A3b — ídem, con los casos de la semántica WHATWG | el bloque sólo con `event:` y el de sólo comentario |
| A4 — el parser sin quitar el BOM | el del BOM |

A3 no discriminaba porque ninguna prueba de la referencia cubre un bloque
sin `data`, y era justo la diferencia con `parseSSEFrames` que el docstring
afirma. Los seis casos nuevos fijan cada afirmación.
