# Superficie pública local de feature flags

## Pregunta

¿Los 16 `TS2305` de `@thyrox/config/feature-flags` exigen portar un cliente
GrowthBook remoto o completar wrappers sobre el resolvedor local existente?

## Rojo

El módulo ya resolvía env → override en proceso → default → fallback, pero no
publicaba siete nombres consumidos. La suite añadida no pudo cargar y Bun
informó que `checkGate_CACHED_OR_BLOCKING` no estaba exportado. El typecheck
completo conservó los 16 imports ausentes en `outputs/red-missing-exports.txt`.

## Implementación

Las dos formas dynamic config y el gate delegan en el mismo resolvedor local.
La forma `BLOCKS_ON_INIT` conserva Promise aunque aquí no haya red. El ciclo de
refresh usa subscribers con una función de unsubscribe; reset borra overrides
y notifica. No se fabricó un cliente remoto ni se devolvió siempre el fallback.

## Resultado

Las ocho pruebas conductuales pasan. El typecheck bajó de 5 066 diagnósticos en 952 archivos a 5 050 en 946; TS2305 bajó de 635 a 619. Las 16 aristas cuyo provider era `@thyrox/config/feature-flags` quedaron en cero.

*Métrica:* pruebas conductuales y cabeceras TS2305 del provider, no líneas.

*Ciega a:* segmentación remota de GrowthBook, que no existe en este despliegue.
