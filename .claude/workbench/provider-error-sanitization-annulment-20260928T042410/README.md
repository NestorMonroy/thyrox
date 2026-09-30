# Anulación del saneador de errores públicos

`src/packages/provider/src/sanitize/`, porte del saneador de OmniRoute. Salida
literal en `results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — sin quitar la cola de traza | la traza multilínea y la armadura PGP, que ocupa varias líneas |
| A2 — reenvío sin la comprobación de credencial | el cuerpo que devuelve una credencial |
| A3 — reenvío sin la de filtración interna | el cuerpo con una ruta o traza del proxy |
| A4 — sin tachar `Bearer`/`Basic` | las redacciones previas y la credencial tras un espacio serializado |

Qué no se portó y por qué: la prueba de propiedades de la referencia usa
`fast-check`, que no está instalado; de `error-message-sanitization.test.ts`
sólo se portaron los casos del saneador, porque el resto prueba rutas y una
base de datos que aquí no existen. La capa de reenvío no tenía prueba directa
en la referencia; sus casos son propios.
