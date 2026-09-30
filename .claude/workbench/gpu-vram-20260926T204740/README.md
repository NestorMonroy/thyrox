# VRAM por ítem del pool (2026-09-26)

La RAM de cada ítem ya se medía con GNU Time; la VRAM no, y GNU Parallel no
tiene `--memfree` para la GPU. Este banco es la evidencia del porte.

| Archivo | Qué es |
|---|---|
| `probe-tree-lifecycle.sh` / `.out` | sonda de shell: qué ve un muestreador sobre el árbol de un ítem; explicó el rojo de la media (una muestra tomada con el padre ya zombi) |
| `probe-pgrep-anchor.sh` / `.out` | sonda: sin ancla `^bash`, el `nvidia-smi` falso contaba también a `timeout` y GNU Time (4 procesos contra 1) |
| `parallel-memfree-extract.txt` | las dos mitades de `--memfree` en `/usr/bin/parallel` 20231122: admisión (4113-4118) y matar al más joven (6847, 6980-7005) |
| `parallel-version.txt` | la versión leída |
| `*.pre-annulment.*` | el original de cada control de anulación |
| `*-old.txt` / `*-new.txt` | los textos de cada reemplazo, escritos con heredoc para `replace_literal --old-file/--new-file` |

Límite declarado: aquí no hay GPU. Las suites usan un `nvidia-smi` falso;
prueban el mecanismo, no la exactitud de `nvidia-smi` sobre una GPU real.
