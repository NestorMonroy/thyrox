# rlvr-local-models

TASK-THYROX-0708: viabilidad de GRPO con LoRA en CPU sobre Qwen2.5-0.5B-Instruct,
con la suite de llamadas a herramientas como recompensa verificable.

## Intentos

| # | Resultado | Causa medida |
|---|---|---|
| 1 | pip falla con CERTIFICATE_VERIFY_FAILED | el `--build-arg` del proxy y la CA no llegaban al RUN: faltaba declararlos con `ARG` |
| 2 | `ImportError: GRPOConfig` | TRL 0.12 no trae GRPO; entra en 0.14 |
| 3 | `no space left on device` al escribir torch | disco lleno con el pool al lado (H-THYROX-298) |
| 4 | exit 137 en el paso 0 de GRPO | OOM del cgroup del contenedor: `anon-rss` 8 360 144 kB contra `--memory 8g`, con grupo 4 en fp32. Sólo murió el contenedor; el pool vecino siguió |
| 5 | `RuntimeError: element 0 of tensors does not require grad` en el backward, a los 23 s | el checkpointing reentrante corta el gradiente con LoRA (entradas congeladas). Ya cabe en memoria |
| 6 | `use_reentrant: False` | pendiente |
