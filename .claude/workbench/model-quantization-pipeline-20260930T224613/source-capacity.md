# Capacidad de disco para cuantizar: dónde viven los bytes grandes

Registrado 2026-10-01T02:01:16. Tareas: TASK-THYROX-0718 a TASK-THYROX-0722,
ampliación de TASK-THYROX-0694. Corrige el análisis previo de la sesión,
que proponía una ruta FUSE + tmpfs como solución para el 7B.

## Medido (2026-10-01)

| Recurso | Medida | Consecuencia |
|---|---|---|
| GraphRoot de Podman | `/var/lib/containers/storage` (overlay) sobre `/dev/vda`, el mismo disco que `/` | un contenedor compite por el mismo cupo (11 GB libres tras liberar cachés e imágenes de laboratorio) |
| `/dev/kvm`, qemu, virtiofsd | ausentes; la sesión ya corre bajo hipervisor (`hypervisor` en cpuinfo, `/dev/vda` virtio) | no hay VM anidada; un disco virtio adicional sólo lo puede adjuntar el hipervisor |
| RAM | 15 GB en total, 14 disponibles; `/dev/shm` tmpfs de 16G | un tmpfs gasta RAM, no disco |
| `/dev/fuse` | presente; `fuse-overlayfs` instalado; rclone ausente | **no** hay sistema de archivos remoto: `fuse-overlayfs` superpone directorios locales |
| Fuente HF (API, sin descargar) | 1.5B 3,09 GB (1 shard), 7B 15,23 GB (4), 14B 29,54 GB (6); los tres apache-2.0 | — |

## Corrección del análisis previo

Afirmé que `/dev/fuse` más `fuse-overlayfs` permitían montar Hugging Face
sin descargar. Es falso. La pieza que falta —HTTP con lectura por rango
expuesta como archivo— la tendría que aportar rclone, un adaptador fsspec,
un FUSE propio o un convertidor que lea los shards por HTTP Range. Es
investigación, no una capacidad disponible.

## Decisiones

1. **Podman controla el trabajo; el almacenamiento lo aporta el hipervisor.**
   Podman da límites de RAM y CPU, tmpfs, bind mounts, aislamiento, medición
   del cgroup completo y limpieza determinista. No da disco.
2. **El 7B se cuantiza directo (BF16 → F16 → Q4_K_M) sólo sobre un volumen
   virtio adicional de al menos 40 GiB** (`/dev/vdb` o virtiofs expuesto por el
   hipervisor), bind-montado en Podman como `source`, `scratch` y `output`.
   El pico es mayor de 30 GB (fuente 15,23 + F16 ~15,2). TASK-THYROX-0722,
   bloqueada en el almacenamiento del entorno y en TASK-THYROX-0709.
3. **El 7B disponible hoy es un Q4_K_M publicado**, con origen, revisión y
   digest exactos en el catálogo. Entra por cualificación como cualquier
   candidato. TASK-THYROX-0720.
4. **El 1.5B valida la cadena completa**, con cuantización directa y en
   exclusión (ningún otro laboratorio pesado a la vez). El pico estimado,
   ~9,1 GB contra 11 GB libres, no sustituye a la admisión: se mide el pico
   real de disco y del cgroup con `container_measure`, no con GNU Time.
   Se registra y se cualifica, aunque su contexto de 32K no cubra los ~73K de
   un ítem. TASK-THYROX-0718.
5. **Imagen mínima de cuantización** (`convert_hf_to_gguf.py`, gguf-py,
   `llama-quantize`, `llama-perplexity`) en lugar de `llama.cpp:full`
   (2,96 GB). Se mide su tamaño con el pico de pull y desempaquetado.
   TASK-THYROX-0719.
6. **BF16 → Q8_0 → Q4_K_M es otro método, no una optimización.** Sólo como
   A/B sobre el 1.5B, con `quantization_method = requantized_q8_to_q4` en la
   procedencia. Se comparan pico de disco, pico del cgroup, tiempo, bytes
   descargados, tamaño Q4, perplejidad y evaluación funcional.
   TASK-THYROX-0721.
7. **Si alguna vez se usa una fuente remota por FUSE, se monta en el host y
   entra al contenedor como bind de sólo lectura.** El laboratorio no recibe
   `--cap-add SYS_ADMIN` ni `--device /dev/fuse`.
8. **El tmpfs cuenta en el presupuesto de RAM del cgroup**, junto con el RSS
   del convertidor, la caché, el kernel y Ollama. No se resta de la memoria
   disponible como si fuera el único consumidor.

## Orden

0718 (1.5B directo y medido) → 0720 (7B publicado) → 0709 (admisión) →
almacenamiento del entorno → 0722 (7B directo). 0719 y 0721 corren cuando
haga falta, sin bloquear la cadena.

*Métrica:* `podman info`, `df`, `free`, `/proc/cpuinfo`, `ls /dev`, API de
modelos de Hugging Face con `blobs=true`.
*Ciega a:* el RSS real del convertidor, el rendimiento del proxy por HTTP y
el pico de desempaquetado de una imagen; los tres se miden en 0718 y 0719.
