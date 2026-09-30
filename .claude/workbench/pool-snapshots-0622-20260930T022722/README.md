# TASK-THYROX-0622 — fotos periódicas del worktree de un ítem en curso

Hecho en el árbol principal, sin pool: el pool del grupo 3 no pudo crear
worktrees por falta de disco (`pool-group3-20260929T234149/outputs-relaunch`).

## Contrato

- `THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS` (entero; 0 o ausente = sólo la
  foto final, como antes). Con `--isolation worktree`, mientras el ítem vive,
  una foto cada N segundos bajo `refs/thyrox/snapshots/<run>/<n>/<gen>`.
- Cada foto avanza la ref sólo si todavía apunta al commit que se leyó
  (`snapshot_store take --advance-from`, comparación atómica de
  `git update-ref`). Una ref movida por otro actor o ausente se rehúsa.
- Cada foto pasa por la transición RUNNING→SNAPSHOTTING con la generación del
  ítem: un actor desplazado no fotografía (I4) y el bucle deja de intentarlo.
- La foto final se toma siempre, después de que el bucle termina; ninguna foto
  periódica la reemplaza.
- Si el proceso cae entre dos fotos, se pierde como mucho el intervalo: la ref
  apunta siempre a la última foto válida de la generación dueña.

## Evidencia

| Archivo | Qué muestra |
|---|---|
| `red-lifecycle.log` | caso 6 en rojo antes del cambio: 33 de 36 |
| `green-lifecycle.log` | con el cambio: 36 de 36 |
| `control-lifecycle.log` | disparador periódico anulado: 34 de 36; caen exactamente las dos aserciones de la foto en curso |

`tests/session/test_snapshot_recovery.py` caso 16: el avance atómico de la
ref (63 de 63). Con `advance_from` ignorado, la segunda foto se rehúsa y el
caso cae en su primera aserción.

En el rojo, una tercera aserción fallaba por diseño de la prueba, no del
código: leía el registro de foto del runtime, que se retira al publicar. Se
cambió por la lectura del manifiesto con `snapshot_store show`.
