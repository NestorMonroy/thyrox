# replsolo — el control de no-regresión

## Qué se lanzó

```
bun test src/packages/repl
```

## Qué se preguntaba

Si el arreglo del typecheck movió la conducta. El porte (`beca2674`)
había dejado `repl` en **529 pass / 4 fail / 0 errors**; la pregunta es
si añadir tres claves al tipo y un argumento a dos llamadas lo cambia.

Se corre `repl` SOLO, y no el agregado de `replcfg`, porque un universo
de tres suites no es comparable con el baseline de una.

## Qué se recogió

**529 pass / 4 fail / 0 errors**, 533 casos en 29 archivos —
idéntico. El arreglo no regresó nada.

Los cuatro rojos son los mismos de antes y de otro sujeto:
`isBgAgentPanelEnabled` (2) y `shouldHideTasksFooter` (2), todos
bloqueados por `Cannot find package 'ajv'` desde
`tool-registry/src/tools/SyntheticOutputTool`. Esa es la dependencia sin
declarar que TASK-THYROX-0224 tiene abierta.

*Metrica:* conteo pass/fail/error de `bun test` sobre un solo paquete,
contra el mismo comando antes del cambio.
*Ciega a:* que «idéntico» signifique que los mismos CASOS pasan — se
compararon los totales y los cuatro nombres de fallo, no la lista
completa de 529.
