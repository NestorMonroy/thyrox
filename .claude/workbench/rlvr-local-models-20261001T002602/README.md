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
| 6 | completó 2 pasos | ver «Primera medición» |

## Primera medición (intento 6) — experimental, admisión manual

No es evidencia de scheduling de producción: el disco y la RAM se comprobaron
a mano (TASK-THYROX-0709 pendiente) y había otro pool vivo.

| Medida | Valor |
|---|---|
| segundos por paso de GRPO (4 hilos, grupo 2, ≤ 64 tokens, LoRA r=8) | 238,9 |
| recompensa voraz antes / después | 1,0 / 1,0 |
| recompensa media en entrenamiento | 0,5, `reward_std` 0 |
| `loss` / `kl` | 0,0 / 0,0 |
| `ru_maxrss` del proceso Python en el contenedor | 3242 MiB |

**Lo que dice:** el aprendizaje fue nulo, y no por la máquina. La recompensa
`tool-calling@1` está saturada para este modelo (la evaluación voraz acierta
todo) y, con las dos muestras del grupo empatadas, la ventaja de GRPO es cero:
no hay gradiente. Sin una recompensa donde el modelo falle —la suite de tarea
de TASK-THYROX-0710— el RLVR no tiene señal.

**Lo que no dice:** el pico de memoria del contenedor. `ru_maxrss` es el del
proceso Python; los 41 MB de GNU Time del trabajo son el envoltorio. Ninguno es
el pico del cgroup, que es la autoridad: la siguiente ejecución lo mide con
`bin/container_measure`. Por eso no se afirma que «cabe en memoria».

*Métrica:* `trainer.state.log_history` de TRL 0.14 y `ru_maxrss` dentro del
contenedor.
*Ciega a:* el pico agregado del cgroup y la carga del pool vecino.
