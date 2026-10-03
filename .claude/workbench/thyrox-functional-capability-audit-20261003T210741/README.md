# thyrox-functional-capability-audit

## El encargo

<!-- verbatim, sin parafrasear -->

## La premisa, si se corrigio al primer comando

## Las piezas

| archivo | que hace |
|---|---|

## Los resultados

*Metrica:*
*Ciega a:*

## TASK-THYROX-0928 — convergencia tras reciclado (fase 2)

Search Existing: REUSE `podman_lock_recovery` (`--classify` mide, `--after-reboot` repara),
`infrastructure_ensure`, `podman-execution-execute reconcile-orphans`, `model_coordinator start|status`;
EXTEND `local_control_plane_ready.sh`, que ya las componía a medias. Ningún gestor nuevo.

- `--help` imprime el uso y no llama a nada (antes llegaba a la recuperación: el episodio de la
  auditoría); `--status` sólo clasifica y pregunta al coordinador (exit 0 listo / 1 no);
  la convergencia sigue con `reconcile-orphans` y el coordinador, cortando con la salida del paso
  que falle.
- Rojo `outputs/red-0928.txt` (13 fallas, el caso 10 reproduce el incidente); verde 46/46;
  anulaciones `outputs/annul-0928.txt` (help 2, status 3, pasos de runtime 7).
- Real (`outputs/real-0928-*`): 0/13 → 13/13 HEALTHY; postgres, redis y ollama recreados y
  sanos con sus volúmenes preservados; 0 huérfanos; coordinador sano; `--status` 0; pids reales.

## TASK-THYROX-0930 — localidad garantizada (fase 4)

Search Existing: REUSE `decidePrintRoute`, `tunnelEnv` (ya retira credenciales propias),
`headless-pool --execution unit` (no entrega credenciales), `item_worktree finalize` (veredictos).
EXTEND, sin autoridad nueva.

- Un modelo `thyrox-*` se decide ANTES de la credencial: proxy declarado, lanzado, o el túnel ya
  declarado (local). Nunca `own` con una credencial remota.
- `thyrox -p` deja `served-by {"model","route","local"}` en stderr.
- `headless-pool --local-only`: exige `--execution unit`, un runtime local, y no cae al proveedor
  ni con Ollama caído; exporta `THYROX_POOL_LOCAL_ONLY=1`, y `finalize` da `no-local` al ítem
  sin servicio local declarado (o con alguno remoto), pase o no su verify.
- Rojo `outputs/red-0930-*`; verde; anulaciones `outputs/annul-0930.txt`: ruta 3, served-by 1,
  finalize 2, unidad 3, runtime 2, ensure 2.
