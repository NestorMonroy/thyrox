# tsc-after-l4-merge

## Qué se lanzó

`bash -lc 'bunx tsc --noEmit'`, mediante `bin/thyrox-bg`, después de integrar
`feature/thyrox-l4` y materializar el lock con `--linker hoisted`.

## Qué se preguntaba

¿La integración cambia el baseline hoisted del décimo/duodécimo bloque?

## Qué se recogió

El resultado reproduce exactamente 4 919 diagnósticos en 936 archivos,
TS2305=495 y TS2307=19. La rama integrada no reduce por sí sola TypeScript;
aporta mecanismos de medición y corrige el carril Python.

*Métrica:* cabeceras TypeScript analizadas, no líneas del log.
*Ciega a:* instalación isolated, ya documentada por H-THYROX-154.
