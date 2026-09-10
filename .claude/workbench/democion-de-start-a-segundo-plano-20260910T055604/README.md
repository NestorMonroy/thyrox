# Democion de `start` a segundo plano

## La pregunta
`bg.sh` tenia dos desenlaces —el trabajo se asienta, o el `wait` agota su
timeout de 1800 s— y le faltaba el tercero: *llevo N segundos, sigo vivo,
devuelvo el control*. Sin el, quien llama tiene que decidir ANTES si el
comando es largo, y esa es justo la decision que no puede tomar.

## La forma la fija la referencia, no una preferencia
`_references/claude-code-bin/2.1.266/claude_strings.txt` declara
`var ggo=120000,hgo=600000` como el default y el maximo de
`BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS`. De ahi salen
`_GRACE_DEFAULT=120` y `_GRACE_MAX=600`. El 1800 previo era 15x ese default.

## Los dos controles de anulacion, y que cayo en cada uno
| Causa retirada | Aserciones que caen |
|---|---|
| el `\|\| true` del filtro de presentacion | **1** — «un trabajo corto devuelve SU codigo de salida» |
| el bloque de democion entero | **3** — esa misma, mas el 125 y el aviso |

«y el trabajo SIGUE VIVO» sobrevive a las dos, y es correcto: no depende de
ninguna. Si hubiera caido, estaria midiendo otra cosa.

## El defecto de segundo orden que la mitad roja destapo
La suite salia **EXIT=0 con 4 fallas**: su bloque de resumen estaba en medio
del archivo, asi que el `[[ $fallo -eq 0 ]]` corria antes de la seccion nueva.
Un verde que no alcanza a las aserciones que le siguen. Corregido moviendo el
resumen al final — `outputs/rojo-antes-del-arreglo.txt` lo conserva.

## El otro defecto, que era del INSTRUMENTO y no del codigo
`grep -v "^__BG_EXIT__=" "$LOG" | tail -40` sale 1 cuando el log contiene solo
el marcador, y bajo `set -e` abortaba la funcion antes del `return "$rc"`: un
trabajo que salio 7 se reportaba como 1. El codigo de salida de un filtro de
presentacion no es un veredicto. Estaba en `start` y en `wait`, los dos.
