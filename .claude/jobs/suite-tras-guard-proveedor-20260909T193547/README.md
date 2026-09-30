# suite-tras-guard-proveedor

## Qué se lanzó

```
bash tests/run.sh
```

## Qué se preguntaba

Si el guard del proveedor —recién cableado— movió el estado de las tres
lenguas.

## Qué se recogió

```
  TypeScript: 529 archivo(s), EN ROJO
  Python: 102 suite(s), 6 en rojo
  shell: 76 suite(s), 28 en rojo, 0 sin medir

FALLA: 3 lengua(s) en rojo
EXIT=1
```

*Métrica:* archivos y suites que el corredor alcanza, por lengua, con su
veredicto agregado.
*Ciega a:* qué falla dentro de cada rojo — el agregado no atribuye.

## Su hermano, y lo que el par destapa

Este run tiene un gemelo lanzado **siete segundos después**:
`suite-tras-guard-proveedor-20260909T193540` y `…193547`. Sobre el mismo
árbol, sin ningún cambio entre medias, sus agregados de Python **no coinciden**:
7 suites en rojo en el primero, 6 en el segundo. TypeScript y shell dan lo
mismo en los dos.

O sea que el agregado de Python **no es determinista**, y una comparación
antes/después de un solo par de corridas no puede distinguir «el cambio arregló
una suite» de «la suite fluctúa». **Cuál** de las suites flipó no se identifica
aquí: el log agregado no lo dice y aislarlo es trabajo del triaje de rojos, no
de este run.

## Por qué estos dos runs existen a posteriori

Vivían en `.claude/workbench/` con **un solo `run.log` dentro** y sin
manifiesto — la salida de un trabajo alojada en la familia de la evidencia. Su
hogar es `jobs`, que es la que `src/session/bg.sh` produce para justo eso.
El `git mv` conserva su historia.

Y su propia existencia es el caso que la familia `jobs` fue construida para
resolver: dos lanzamientos del **mismo nombre**, que en la forma plana se
habrían pisado. Aquí conviven, y por eso se puede comparar uno con otro — que
es exactamente lo que destapó la no-determinación de arriba.
