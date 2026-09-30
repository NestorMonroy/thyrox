# Las fotos del worktree se conservan al publicar

La instrucción original del ciclo de vida dice que los snapshots son un
requisito de seguridad para no perder código y que no se eliminan ni se
sustituyen por las salidas finales. `headless-pool.sh` retiraba la ref
`refs/thyrox/snapshots/<run>/<item>/<gen>` de todo ítem publicado con
exit 0.

- `outputs/red.txt`: con el retiro, sólo queda 1 de 6 refs; caen exactamente
  las 2 aserciones de retención (35 de 37).
- `outputs/green.txt`: sin el retiro, 37 de 37.

La mitad roja es también el control de anulación: reponer el retiro hace
caer esas dos aserciones y ninguna más.
