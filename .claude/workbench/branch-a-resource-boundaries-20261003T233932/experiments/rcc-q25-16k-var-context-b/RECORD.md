# Experimento — variable 1: contexto 16K (inmutable)

Lanzado 2026-10-04T00:08:12Z (`.claude/jobs/rcc-q25-ctx16k-b-20261004T000812/`). Única variable cambiada
respecto de `rcc-baseline-q25-8k-post-branch-a`: `--context 16384` (8192 → 16384). Prerrequisito admitido:
`batch-worker-mecanica@1` 4/4 a 16384 (`.claude/jobs/mecanica-q25-16k-20261004T000723/`); el primer intento
lo rehusó la política por contexto medido insuficiente (`../rcc-q25-16k-var-context/`).

## OBSERVATION

- veredicto `sin-cambios`; cualificación `suspendida` 0/1, 1.6 tok/s (contended);
- 3 turnos, 3710 tokens de entrada y 1406 de salida;
- 1 `Read`; 1 `Edit` con `old_string` `raise NotImplementedError\("title_slug"\)` (escape de regex) contra
  `raise NotImplementedError("title_slug")`; cierre en texto, sin otro intento.

## INTERPRETATION

El contexto no es la causa: con el doble de ventana el modelo usa lo mismo (3710 vs 3790) y falla en el mismo
punto, el `old_string` no literal. Clasificación TOOL_PROTOCOL, no RUNTIME_PROFILE.

## CURRENT VERDICT

Variable descartada para este caso. Siguiente: `Edit` literal (el rechazo muestra las líneas cercanas).
