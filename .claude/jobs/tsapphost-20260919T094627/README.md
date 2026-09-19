# tsapphost

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

`TASK-THYROX-0229`. El envoltorio de `AppState.tsx` declara una «divergencia 2»
cuya razón —*«`@thyrox/config` no tiene ese módulo»*— quedó falsa al cerrar
`TASK-THYROX-0226`: el módulo carga. Primer intento del desenlace A de la tarea:
**retirar el envoltorio** y sustituirlo por un `import` estático.

## Qué se recogió

**5684** líneas / **5682** ubicaciones únicas, contra **5683/5681** del estado
de partida (`dfb0cb6d`). El intento **no compila**, y la única ubicación que
añade lo dice:

```
AppState.tsx(223,33): error TS2345: Argument of type
'(updater: (prev: AppState) => AppState) => void' is not assignable to
parameter of type '(f: (prev: SettingsChangeTarget) => SettingsChangeTarget) => void'
```

No es un hueco del porte: es **covarianza del retorno**. El updater que
`applySettingsChange` recibe devuelve un `SettingsChangeTarget` de 4 claves
donde `AppState` exige ~80 requeridas. La conducta en runtime es correcta —el
`...prev` conserva el resto— y el tipo no puede expresarlo.

*Metrica:* ubicaciones `archivo(línea,col): error TSNNNN` del `tsc --noEmit` del
árbol entero, deduplicadas y comparadas por conjunto contra la corrida previa.
*Ciega a:* un error que cambia de columna sin cambiar de causa —aparecería como
par desaparecido/aparecido y no lo es—; y a si el runtime realmente funciona,
que el typecheck no ejercita.
