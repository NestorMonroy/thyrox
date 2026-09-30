# global-config-consumers-green

## Qué se lanzó

```
bunx tsc --noEmit
```

## Qué se preguntaba

¿Quedaron en cero los diagnósticos de propiedades GlobalConfig/ProjectConfig censadas por los cuarenta trabajos?

## Qué se recogió

*Métrica:* 5 066 diagnósticos en 952 archivos; cero diagnósticos de la familia objetivo.
*Ciega a:* propiedades que aún no alcanza TypeScript por imports o providers sin resolver.
