# TASK-THYROX-0722 — preflight del 7B directo sin volumen externo (2026-10-01)

La parte de software está lista: `--scratch-dir` es el único lugar de los
bytes grandes, Podman sólo lo monta, y `--minimum-free-bytes` se compara con
el espacio libre real del sistema de archivos del scratch (`statfs`).

`bin/local-models-quantize run --repository Qwen/Qwen2.5-Coder-7B-Instruct
--revision c03e6d358207e414f1eca0bb1891e29f1db0e242 --minimum-free-bytes
42949672960` sobre `/home/user/.thyrox-lab/direct-7b-scratch` (que está en
`/dev/vda`) salió con **exit 2, sin descargar, sin convertir y sin métricas
de pasos** (`refusal.json`):

| | Bytes |
|---|---|
| Libre en el scratch | 3 808 989 184 |
| Pico estimado (BF16 + F16) | 30 754 050 250 |
| Mínimo declarado (40 GiB) | 42 949 672 960 |

No se creó ninguna VM, archivo-disco ni loop device. La ejecución real queda
bloqueada sólo por el volumen virtio adjuntado por el hipervisor y por la
admisión de laboratorios (TASK-THYROX-0709).

## Qué capacidad exacta de 0709 falta (no es una dependencia nominal)

El pipeline ya reserva disco y RAM por `resource_admission`, y eso basta
mientras todo vive en `/dev/vda`. Con un scratch en otro volumen, el contrato
actual falla en tres puntos, medidos en `src/session/resource_admission.py`:

1. **Un solo registro para todos los sistemas de archivos.** Las reservas se
   guardan por pid en un único `disk-admission.json`, y `disk_headroom`
   (líneas 477-482) resta **todas** las reservas vivas del techo del `--path`
   pedido. Una reserva sobre `/mnt/quantize` (vdb) se restaría también del
   techo de `/`, y al revés. Hace falta registrar por sistema de archivos
   (`st_dev` del montaje) y restar sólo las del mismo.
2. **Una reserva por dueño.** El registro va por pid; el 7B directo necesita
   a la vez el scratch en vdb y lo pequeño que escribe en `/` (estado,
   registro): dos reservas del mismo dueño en dos sistemas de archivos.
3. **Un piso fijo de 2 GiB para cualquier volumen** (`THYROX_DISK_ADMISSION_FLOOR_MB`):
   el piso de un scratch dedicado se declara por volumen, no se hereda del
   de `/`.

Ésa es la condición de cierre de la dependencia: 0722 queda lista para correr
cuando `disk-admit` admita reservas por sistema de archivos con su propio piso,
y el volumen virtio exista. El `disk-headroom` ya mide cualquier montaje
(`statvfs` sobre la ruta): ese lado no falta.
