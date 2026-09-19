# tscfg2 — la mitad VERDE

## Qué se lanzó

```
bun run typecheck
```

## Qué se preguntaba

Si las dos correcciones del porte —las tres claves de `ProjectConfig` y
el segundo argumento de `writeThroughGlobalConfigCache`— cierran los
tres errores propios sin abrir ninguno.

## Qué se recogió

`__BG_EXIT__=2` (el árbol sigue rojo por otras causas), **5704**
errores. El sujeto baja de **4 a 1**, y el que queda es el
pre-existente:

```
config.ts(563,5): TS6133 'lastReadFileStats' is declared but never read
```

La línea se mueve de 546 a 563 porque el bloque de cabecera creció 17
líneas; es el mismo error.

El diff contra `tscfg` da **6 desaparecidos y 0 aparecidos**: los tres
míos más tres TS2339 pre-existentes en `repl`, en archivos que este pase
no tocó, que completar el tipo cerró de paso. Ver
`.claude/workbench/porte-mitad-de-proyecto-config-20260919T084755/outputs/atribucion-delta-typecheck.txt`.

*Metrica:* `comm` entre los dos conjuntos de errores, normalizados
quitando `(línea,columna)` para que un desplazamiento de línea no se lea
como un error nuevo.
*Ciega a:* un error que cambie de TEXTO sin dejar de existir — se leería
como uno que desaparece y otro que aparece. Aquí el cubo «aparecieron»
está vacío, así que no ocurrió.
