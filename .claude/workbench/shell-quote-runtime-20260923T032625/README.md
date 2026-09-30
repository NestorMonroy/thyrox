# Runtime seguro de shell-quote

## Pregunta

¿Los 16 `TS2305` directos/relativos de `shellQuote.js` corresponden sólo a
exports ausentes o al runtime seguro todavía no portado?

## Evidencia

El archivo sólo implementaba `quote`; consumidores reales ya invocaban parse,
quote estricto y dos detectores de divergencias de seguridad. La prueba roja
falló al importar `hasMalformedTokens`.

## Implementación

Se portó el contrato real sobre `shell-quote`: resultados discriminados sin
throw, clasificación de Bad substitution, validación de argumentos, detección
de delimitadores/quotes no balanceados y del diferencial de backslashes dentro
de single quotes. El paquete declara ahora su dependencia directa.

## Resultado

Cinco pruebas conductuales pasan. El typecheck baja de 4 911 diagnósticos en
932 archivos a 4 879 en 924; TS2305 baja de 480 a 464 y las 16 aristas de las
dos grafías de shellQuote quedan en cero.

*Métrica:* aristas TS2305, casos conductuales de seguridad y cabeceras globales.
*Ciega a:* ejecución por una shell real; aquí se mide tokenización segura.
