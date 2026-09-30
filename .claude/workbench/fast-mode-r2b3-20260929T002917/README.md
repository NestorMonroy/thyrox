# R-2b-3 con el mecanismo corregido

Reintento del ítem 3 del banco `fast-mode-pool-unbounded-20260929T000919`.
Ahí se quedó en `error_max_turns` y no pudo escribir en su worktree, que
entonces vivía bajo `.git/`. Aquí corre con tres cambios del pool: sin tope
de turnos (lo acota `--timeout`), el worktree en `.thyrox/pool-worktrees/` y
una plantilla que prohíbe esperar en segundo plano.

- Ítem: `items.txt`. La spec es la versionada del banco original, porque el
  worktree sale de `HEAD`.
- Lanzador: `launch.sh` (`--width 1 --timeout 3600`, verificación con las
  pruebas de provider y agent).
- Veredicto: `outputs/1.verdict` = `verificado`. La verificación da
  2691 pass y 0 fail (`outputs/1.verify.log`).
- Integración: `bin/pool_integrate outputs` → `aplicados=1 conflictos=0`.
- Herramientas que usó el ítem (del `stream.jsonl`): 16 `Bash` y 2 `Write`.
  El pool le ofrecía `Write`/`Edit` por defecto; eso se corrige aparte.

Control de anulación sobre lo integrado: si `shouldEnableFastModeForModel`
ignora la preferencia, fallan exactamente 2 de los 8 casos, los dos que
dependen de ella.
