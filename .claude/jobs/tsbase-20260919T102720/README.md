# tsbase

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1
```

## Qué se preguntaba

El estado del árbol **antes** de izar las dependencias a la raíz
(`TASK-THYROX-0224`). Sin esta cifra previa, el typecheck posterior no
atribuye: mediría determinismo, no efecto.

Corre en segundo plano porque es un barrido determinista de minutos: cuesta
cero tokens como proceso y pagaría una conversación entera como agente
(`trabajo-en-segundo-plano.md`).

## Qué se recogió

**5624** ubicaciones únicas de error. Es el denominador contra el que se lee
`tsdespues`.

*Metrica:* líneas del `tsc --noEmit` del árbol entero reducidas a
`archivo(línea,col): error TSxxxx` y deduplicadas por **ubicación**, no por el
texto del mensaje —que cambia al declarar una dependencia sin que se mueva
ningún error— ni por conteo de líneas, que cuenta 5626 por los dos renglones
de resumen.
*Ciega a:* un error que cambia de línea sin cambiar de causa; y a un archivo
que el compilador deja de leer entero, cuyos errores desaparecen sin que nada
se haya arreglado.
