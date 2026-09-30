# Dos tsc a la vez frente a uno solo

Decide si medir en N=2 worktrees en paralelo gana, en 4 núcleos. Medido el
2026-09-25 en `thyrox-medicion` y `thyrox-control`, ambos en HEAD `191ba7db`.

| Corrida | Segundos |
|---|---|
| solo, antes | 42.7 |
| par 1, pared (a 47.6, b 49.6) | 49.6 |
| par 2, pared (a 47.0, b 46.6) | 47.0 |
| solo, después | 42.8 |

Dos mediciones en ~48 s de pared contra ~85 s en serie: **1.77x**. El solo
de antes y el de después coinciden (42.7 / 42.8), así que la máquina no
derivó entre las corridas. Los 4 tsc a la vez del día (175–797 s) eran otra
cosa: competían con los tsc de los subagentes.

## Lo que decide el diseño

El historial de la ruta (`run-20260924T175031`, 57 lotes) aceptó algo en 53:
93 %. Con aceptación así, medir dos unidades contra la MISMA base obliga casi
siempre a medir el estado combinado, que es la base de la ronda siguiente, y
ese tsc extra se come la ganancia. De ahí la especulación por prefijos: el
worktree 2 mide `u1+u2` mientras el 1 mide `u1`; la diferencia entre los dos
logs es la contribución de `u2`, y el log de `u1+u2` ya es la base medida de
la ronda siguiente.

*Métrica:* reloj de pared por corrida, `date +%s.%N`.
*Ciega a:* n=2 pares, y a los worktrees con el reflejo de `@types`
defectuoso de entonces (los dos medían el mismo programa, así que el tiempo
comparado vale; el conteo de 202 no es el del árbol principal).
