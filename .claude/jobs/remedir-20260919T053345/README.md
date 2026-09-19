# remedir — ¿los rojos eran del árbol o de mi invocación?

## Qué se lanzó

```
bash remeasure_both_invocations.sh
```

El guion está **en este directorio**, no en el scratchpad: la fila `launch` del
manifiesto cita la ruta efímera desde la que se lanzó, y esa ruta muere con el
contenedor. Un instrumento que no sobrevive no es reproducible.

## Qué se preguntaba

Si los rojos que publiqué —en el banco de `TASK-THYROX-0216`, en la bitácora del
progreso y en `H-THYROX-112`— eran del árbol o de haber medido con
`python3 tests/xxx.py` **pelado**, cuando el corredor exporta el árbol
(`tests/run.sh:38`).

## Qué se recogió

```
SUITE                                          pelado     PYTHONPATH=src
tests/hooks/test_error_log.py                  ROJO       ok
tests/agents/test_final_message_closing.py     ok         ok
tests/session/test_user_wiring.py              ROJO       ok
tests/paths/test_child_env.py                  ok         ok
tests/session/test_generate_bin.py             ROJO       ROJO
```

**Eran de mi invocación.** El único rojo real de Python que queda bajo el
corredor es `test_generate_bin.py`, y está bloqueado por directiva hasta que las
tres lenguas estén en verde.

*Métrica:* código de salida de cada suite en las dos invocaciones, con
`__pycache__` borrado antes de empezar.
*Ciega a:* un rojo intermitente —una corrida por invocación—; y a la *causa* de
cada rojo, que es otro eje: la de `test_user_wiring.py` se leyó del log del
baseline (`NameError: name 'reach' is not defined`, línea 7954), no de aquí.

## La tercera población

Las dos columnas de arriba no bastan: ninguna dice cómo estaba el árbol **antes**
de tocarlo. Eso lo da `.claude/jobs/suite-baseline-20260919T042243`, corredor
real, **12 ROJO sobre 189 suites**, instantánea limpia pre-reparación (ver su
README). Las tres juntas son lo que sostiene la corrección.
