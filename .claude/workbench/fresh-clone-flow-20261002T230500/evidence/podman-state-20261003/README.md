# Estado de podman tras el reinicio de la VM (2026-10-03)

VM arrancada 2026-10-03 09:33:53 (`uptime -s`). Medido sólo con autoridades
existentes, en modo lectura:

| Autoridad | Resultado |
|---|---|
| `thyrox_toolchain_require_podman` | rc=0: `podman info` responde (4.9.3, backend sqlite) |
| `bin/podman_capabilities` | 11 de 12 capacidades efectivas; `credential_injection` no-efectiva (ya declarado). Ojo: `--help` no imprime ayuda, corre la sonda entera |
| `bin/podman_lock_recovery` (sin `--confirm`) | **locks asignados 0, referenciados 4**; plan: retirar `/run/libpod/alive` |
| `podman-execution-execute observe containers` | `thyrox-redis` y `thyrox-ollama` figuran `running` con pid 2185 y 3329 |
| `ps` | **ningún** proceso con esos pids, ni `conmon`, `redis` u `ollama` |
| TCP `127.0.0.1:56379` / `:51434` | cerrados |
| volúmenes | `thyrox-ollama-models` y el anónimo de redis siguen presentes |
| imágenes | `ollama:0.35.0` (5.5 GB) y `redis:7.4` siguen presentes |

Conclusión: la base de podman sobrevivió al reinicio y los procesos no. Es el
caso para el que existe `bin/infrastructure_ensure` (detecta el desfase de
locks, intenta `podman system renumber` y recrea desde la declaración,
conservando volúmenes e imágenes). No se ejecutó: esta medición sólo valida.

*Métrica:* lo que publica cada autoridad, `ps` y una conexión TCP.
*Ciega a:* el contenido del volumen de modelos (vacío: no se instaló ninguno).
