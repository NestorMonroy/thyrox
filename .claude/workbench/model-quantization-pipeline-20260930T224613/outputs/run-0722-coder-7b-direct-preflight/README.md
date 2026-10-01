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
