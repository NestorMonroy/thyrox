# tsgen2

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

Tercer intento del desenlace A de `TASK-THYROX-0229`, y el que **cierra** la
rama: si la inferencia cae al constraint (`tsgen`), se le da el argumento de
tipo a mano — `applySettingsChange<AppState>(source, setAppState)`.

## Qué se recogió

**5684 / 5682**. Sigue sin compilar, pero **el error cambia**, y ese cambio es
el resultado: la ubicación TS2345 de los dos intentos previos desaparece y la
sustituye otra, una columna antes:

```
AppState.tsx(223,25): error TS2344:
Type 'AppState' does not satisfy the constraint 'SettingsChangeTarget'
```

Ya no falla al **pasar el argumento**: falla al **satisfacer el constraint**.
`AppState` no es asignable a `SettingsChangeTarget` por la **regla de tipo
débil** — un objetivo cuyas propiedades son todas opcionales rechaza una fuente
sin ninguna propiedad en común. La firma de índice que se sospechaba ausente no
era el bloqueo: la sonda de varianza la falsificó por separado
(`.claude/workbench/appstatelike-modo-estricto-20260919T093659/`).

Con los tres intentos medidos, el desenlace A queda **descartado con
evidencia** y la tarea pasa al B: corregir la razón declarada por la real.

*Metrica:* ídem `tsapphost`.
*Ciega a:* si existe una cuarta forma de tipar el puente que sí compile — se
midieron tres, no el espacio entero.
