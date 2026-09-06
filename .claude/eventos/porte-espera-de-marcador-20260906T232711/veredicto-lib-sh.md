# `src/lib/lib.sh` — provisión que nunca encontró su necesidad

La suite `tests/legacy/test-lib.sh` es de clase B y muere por la misma
aritmética que las otras once (`../../..` → `/home/user`). Al ir a portarla, el
sujeto resultó no tener a quién servir.

*Métrica:* archivos que hacen `source` de `lib.sh`, medido con
`grep -rn "source .*lib\.sh\|\. .*lib\.sh"` sobre `thyrox/src`, `thyrox/tests`,
`thyrox/.githooks` y el `.claude/`, `scripts/` y `.githooks/` de los cinco
clones `kaupamex-*`.

    consumidores                                   : 0
    .sh en thyrox/src/                             : 43
      con su propia paleta de color                :  4
      con su propio die/fatal                      :  0
      con su propio chequeo de dependencia         :  0

Las tres cifras de abajo son las que deciden. No está muerta **por falta de
adopción** de algo necesario —eso se vería como N guiones reimplementando
`lib_die` y `lib_require`, y son cero—: está muerta porque la necesidad nunca
existió. Treinta y nueve de los cuarenta y tres ni siquiera quieren la paleta.

*Ciega a:* un consumidor que la invocara por una ruta construida en variables,
que ningún literal `lib.sh` delataría; y a un uso futuro previsto y no escrito.

## Veredicto: se retira, con su suite

Es el defecto que `flow-selection-agile.md` describe —registrada, nunca
seleccionada— y va en contra de la dirección declarada del trabajo: la
reducción de shell a Python. Una librería **compartida de bash** sólo tiene
sentido si el shell va a crecer, y no va a crecer.

Lo que se retira: `src/lib/lib.sh` (80 líneas) y `tests/legacy/test-lib.sh`.
Nada rompe —cero consumidores, medido— y el git log la conserva si alguna vez
hace falta. Si el ejecutor la quería como provisión deliberada, revertir cuesta
un `git revert`; la alternativa —dejarla— cuesta que siga sin medirse.
