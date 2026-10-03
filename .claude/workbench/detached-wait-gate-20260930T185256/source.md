# Una espera desprendida con `&` o `disown` se señala — TASK-THYROX-0668

## El episodio, 2026-09-30

Se lanzó `bash bin/wait-jobs wait --only shell-gate-pool --timeout 7500
>/dev/null 2>&1 & disown`. Esa espera corre en el segundo plano del SHELL, no
en el del cliente: nadie recibe aviso cuando termina, su salida va a
`/dev/null`, y al terminar recoge el trabajo del ledger en silencio. La regla
`.claude/rules/trabajo-en-segundo-plano.md` («Una espera nunca va en primer
plano») prescribe el segundo plano del cliente (`run_in_background`), que es
lo único que notifica.

El detector `src/hooks/detect_foreground_long_command.py` avisó sobre ese
comando con «esta ESPERA bloquea el turno hasta que el trabajo termine»: lo
contrario de lo que hacía. `BLOCKING_WAIT` (líneas 115-117) casa la espera y
la condición sólo mira `run_in_background`; no distingue una espera en
primer plano de una desprendida con `&`, `nohup`, `disown` o `setsid`.

## Lo que se construye

Una rama propia, antes de la de `BLOCKING_WAIT`: una espera
(`BLOCKING_WAIT`) que además se desprende del shell (`&` final de su
segmento, `nohup`, `disown` o `setsid`) produce un aviso distinto que nombra
el defecto —la espera no notifica y recoge en silencio— y la forma correcta:
el mismo comando, sin `&` ni `disown`, con `run_in_background` del cliente.
Con `run_in_background` y sin desprenderse no avisa. Un heredoc no cuenta
(`strip_heredoc_bodies`).

El comando real del episodio, citado verbatim, es el control positivo, no uno
fabricado. Controles negativos: la misma espera con `run_in_background` y
sin `&`; un `thyrox-bg start … &` que no es una espera. Cada rama nueva con su
control de anulación: retirarla hace caer exactamente sus casos, con los
números.

Te pertenecen `src/hooks/detect_foreground_long_command.py` y
`tests/hooks/test_detect_foreground_long_command.py`.
