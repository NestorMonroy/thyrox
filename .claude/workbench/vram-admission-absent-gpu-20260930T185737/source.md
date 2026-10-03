# La admisión de VRAM rehúsa enseguida sin GPU que medir — TASK-THYROX-0669

## Medido el 2026-09-30, en un contenedor sin NVIDIA

`bash bin/gpu_monitor admit 100 --ledger <tmp> --owner $$ --timeout 2` sale
con **3** («venció el plazo sin sitio») tras agotar el plazo. Sin `--timeout`
el plazo es 600 s (`src/session/gpu_monitor.py:187-188`, y el argparse).
Causa: `headroom` devuelve `None` sin lectura de la GPU
(`gpu_monitor.py:175-181`), y `admit_with`
(`src/session/resource_admission.py:141-158`) trata `None` como «no admite
todavía» y sigue sondeando hasta el plazo. Una máquina sin NVIDIA espera 10
minutos para informar una causa falsa: no falta sitio, falta GPU.

Directiva del ejecutor: NVIDIA se usa si la máquina la tiene; si no, lo que
haya. Una ausencia no es una espera.

## Lo que se construye

- `gpu_monitor admit` rehúsa al instante con **exit 2** y un stderr que nombra
  la ausencia (`nvidia-smi` no responde) cuando no hay con qué medir, como ya
  distingue el subcomando `available`. No escribe en el registro.
- El contrato de `admit_with` para `None` se decide en su sitio: una medida
  AUSENTE al principio no es lo mismo que una medida que llega y no alcanza.
  Si el cambio va en `resource_admission.py`, la admisión de RAM conserva su
  conducta (su medida nunca es `None` en Linux; que su suite lo pruebe).
- `src/packages/config/gpuAdmission.ts` ya lanza una excepción con el stderr
  para cualquier código distinto de 0 y 3: su docstring lo dice; que su prueba
  cubra el exit 2 con un `nvidia-smi` ausente.
- `headless-pool.sh:597-606` llama a `admit` sólo cuando mide la GPU; que
  siga así, y que el pool sin NVIDIA no cambie de conducta (su línea `gpu:`
  ya lo declara).

## Pruebas

Casos reales: `nvidia-smi` ausente (un PATH sin él, o `--nvidia-smi` hacia una
ruta inexistente) → exit 2 en menos de un segundo y registro intacto; el
`nvidia-smi` falso de `tests/session/fakes/stateful-nvidia-smi.sh` con sitio →
exit 0; sin sitio → exit 3 al vencer. Control de anulación de la rama nueva:
retirarla hace caer exactamente sus casos, con los números.

Te pertenecen `src/session/gpu_monitor.py`, `src/session/resource_admission.py`,
`tests/session/test_gpu_monitor.py`, `tests/session/test_resource_admission.py`,
`tests/session/test-gpu-admission-cli.sh`, `src/packages/config/gpuAdmission.ts`
y `src/packages/config/__tests__/gpuAdmission.test.ts`.
