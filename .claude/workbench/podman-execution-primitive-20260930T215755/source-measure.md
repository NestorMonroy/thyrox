# Fuente de verdad — H-THYROX-294: medir el contenedor, no el cliente

Gobierna: `kaupamex-docs: source/thyrox/adr/adr-007-podman-frontera-de-workers-y-redis-detras-de-puertos.rst`
v1.5.1 (commit `617cd730f`) y el hallazgo H-THYROX-294. Parte de TASK-THYROX-0667.

## El defecto, medido

`probes/container_process_tree.sh` de este banco: el proceso de un contenedor
cuelga de `conmon` → `init`, no del `podman run` que lanza el wrapper; GNU Time
sobre `podman run` dio `maxrss=41152KB` con el contenedor reteniendo ~200 MB
(`outputs/container-process-tree.txt`). Los tres módulos llegan a los procesos
por `tree(pid)` (descendientes por `/proc`):

- `src/session/gpu_monitor.py`: `watch(pid, …)` suma la VRAM de `tree(pid)`;
- `src/session/resource_admission.py`: `ram_headroom` usa `tree` y
  `proc_rss_kb` para lo pendiente de cada reserva;
- `src/session/pool_history.py`: `record` guarda la medida de GNU Time, y
  `vram_calibration` acepta la fila si todos los ítems midieron VRAM.

En modo contenedor los tres medirían el cliente: RAM de ~41 MB y VRAM 0
registrada como medida válida, que calibraría y pediría `admit(0)`
(H-THYROX-192 reabierto por otra vía).

## El contrato

1. **Una fuente de miembros explícita.** Módulo nuevo
   `src/session/container_measure.py`: dado el nombre de un contenedor, su
   conjunto de PIDs (del cgroup del contenedor: `cgroup.procs`/`tasks` de la
   ruta que da `podman inspect`, o `podman top`) y su pico de memoria (cgroup
   v1 `memory.max_usage_in_bytes`; en v2 `memory.peak`; mídelo, no lo supongas:
   aquí es cgroups v1, podman 4.9.3 rootful). Tres estados que no se colapsan:
   medida, ausente (el contenedor no existe o no hay cgroup legible), y
   `error <causa>`.
2. **`gpu_monitor`**: `watch` recibe la fuente de miembros en vez de asumir
   `tree(pid)`; la CLI gana `--container <nombre>`. Con la fuente de contenedor
   que no puede dar PIDs, el `.gpu` es `error <causa>`, nunca `0`. El camino
   local (`tree(pid)`) no cambia de conducta.
3. **`resource_admission`**: lo pendiente de una reserva de un contenedor se
   calcula con el uso de memoria de su cgroup, no con el RSS de un árbol; y la
   reserva de un ítem en contenedor puede venir acotada por el `--memory`
   declarado.
4. **`pool_history`**: cada fila declara su fuente de medida
   (`measurement_source`: `host-tree` o `container-cgroup`); `derive`/
   `vram_calibration` sólo calibran con filas cuya fuente corresponde al modo
   de ejecución que se va a lanzar; una fila sin fuente (las viejas) cuenta
   como `host-tree`; una fila de un pool en contenedor medida con `host-tree`
   nunca calibra, y la línea `historial:` lo dice.
5. Identificadores en inglés; comentarios en español técnico sin
   coloquialismos; clean-code (una responsabilidad por función, sin argumentos
   selectores: la fuente de miembros es un objeto o una función inyectada, no
   una bandera `is_container`).

## Pruebas (forma del árbol: `python3 tests/...py`)

- fuente de contenedor sobre un contenedor real (imagen disponible:
  `docker.io/ollama/ollama:0.35.0`, entrypoint `sh`/`sleep`): los PIDs
  devueltos son los del contenedor y **no** incluyen al cliente `podman run`;
  el pico de memoria del cgroup refleja una reserva de ~200 MB hecha dentro;
- contenedor inexistente → ausente; cgroup ilegible (doble) → `error`;
- `gpu_monitor.watch` con un `nvidia-smi` falso que reporta VRAM para un PID
  del contenedor: la medida es la del contenedor; con la fuente de contenedor
  sin PIDs → `.gpu` = `error`, no `0`;
- `ram_headroom` descuenta el uso del cgroup, no el RSS del cliente;
- `vram_calibration`: fila `host-tree` con VRAM 0 no calibra un lanzamiento en
  contenedor; fila `container-cgroup` sí; fila sin fuente = `host-tree`;
- las suites existentes siguen verdes: `test_gpu_monitor.py`,
  `test_gpu_scenarios.py`, `test_resource_admission.py`,
  `test_pool_history.py`, `test-gpu-admission-cli.sh`.

Controles de anulación, con números: usar `tree(pid)` en la fuente de
contenedor hace caer la prueba «no incluye al cliente»; colapsar el error en 0
hace caer la de `.gpu` = `error`; ignorar `measurement_source` en la
calibración hace caer la de la fila `host-tree`.
