# project-config-green

## Qué se lanzó

```
bunx tsc --noEmit
```

## Qué se preguntaba

¿Desaparecen los cuatro diagnósticos del contrato MCP sin alterar otras familias?

## Qué se recogió

*Métrica:* 5 233 diagnósticos en 1 036 archivos; cero diagnósticos del sujeto.
*Ciega a:* El estado de migraciones de GlobalConfig, que se midió en el job sucesor.
