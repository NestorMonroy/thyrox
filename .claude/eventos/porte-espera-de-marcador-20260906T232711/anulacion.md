# La anulación que reescribió el caso que decía medir

El caso 6 —«el trabajo escribe el marcador y muere»— existía en la suite en
shell y **no medía la guarda de carrera**. Con `sleep 1` antes de escribir y un
intervalo de sondeo de 2 s, el marcador ya estaba en el log cuando el bucle
volvía a mirar: pasaba por el camino normal y la re-comprobación posterior a la
muerte nunca entraba. La aserción `exit 0` era correcta y no informaba de nada.

Lo destapó el control de anulación al portarlo, no una relectura:

    ok    marcador escrito al morir -> 0, no BAIL          <- caso 6, con guarda
    FALLO sin la guarda, la carrera cae a BAIL             <- anulación: NO cayó
          esperado=[2] obtenido=[0]

Un control que no puede fallar no mide nada — sub-patrón D de
`metrica-decide-la-conclusion.md`, cometido por la suite de origen y heredado
por el porte hasta que la anulación lo delató.

## La forma que SÍ produce la carrera, y no es artificial

Es la de `background.spawn_detached`: el marcador lo escribe el shell
**exterior** con `echo EXIT=$?` **después** de que el comando interior termina.
Quien vigile el pid interior lo ve muerto con el log todavía sin marcador.

    bash -c 'sleep 0.5; exit 7' & echo $! > pidfile
    wait $(cat pidfile); rc=$?; sleep 0.3; echo "EXIT=$rc" >> log

Vigilando el pid **interior**, con la guarda da `PRESENT` y sin ella `BAILED`.
Y cae exactamente ese caso: la muerte limpia sigue en `BAILED` en los dos modos.

## Lo que este porte NO afirma

El zombi. `background.py` documenta —medido— que `kill -0` responde «vivo»
sobre un proceso terminado y no cosechado, y que su pool giró sin salida por
eso. **Ese defecto no se reprodujo aquí**: medidas tres formas en este
contenedor —hijo directo, nieto huérfano y trabajo que escribe al morir—
`esperar-marcador.sh` con `kill -0` pelado devolvió el código correcto en las
tres, porque el huérfano fue cosechado. Ver `rojo-de-partida.txt`.

La sonda de `/proc` viaja en el puerto como **endurecimiento**, con esa
procedencia declarada en el docstring. Venderla como corrección de un fallo
reproducido sería afirmar un estado que no se observó.

*Métrica:* código de salida de `src/session/esperar-marcador.sh` frente a tres
formas de terminación, en este contenedor, con `PID 1 = process_api`.
*Ciega a:* un entorno cuyo subreaper no coseche —donde el zombi sí persiste— y
al caso de un padre vivo que no llame a `wait()`, que no se consiguió construir
de forma estable en este contenedor.
