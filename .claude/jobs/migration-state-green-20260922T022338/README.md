# migration-state-green

## Qué se lanzó

```
bunx tsc --noEmit
```

## Qué se preguntaba

¿Desaparecen los diagnósticos de guards y timestamps de migración con tipos concretos?

## Qué se recogió

*Métrica:* 5 225 diagnósticos en 1 033 archivos; cero diagnósticos de las seis propiedades.
*Ciega a:* La conducta end-to-end de cada migración contra servicios externos.
