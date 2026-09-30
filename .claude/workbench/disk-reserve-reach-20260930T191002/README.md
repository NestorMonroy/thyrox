# disk-reserve-reach

## El encargo

> «con podman o vitrio podemos hacer eso de esos 252G ? yo considero que si,
> analiza e implemetalo en TDD» — ejecutor, 2026-09-30, sobre el costo de
> reciclar el entorno (imagen de Ollama de 5.5 GB más el modelo).

## La premisa, si se corrigio al primer comando

La premisa era que los 252 GiB del disco están disponibles para quien sepa
pedirlos. `disk-headroom` la corrige: **214.92 GiB (85.3 %) son reserva del
ext4 y la reserva es inalcanzable** (`RESERVA_INALCANZABLE`, exit 3). El techo
real es el `Avail`: 17.5 GiB al medir.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/measure_reserve.sh` | corre `bin/disk-headroom` y mide cada vía candidata: dispositivos virtio, almacén de Podman, capacidades, zram |
| `outputs/measure_reserve.out` | salida verbatim |

## Los resultados — vía por vía

| Vía | Qué se midió | ¿Alcanza la reserva? |
|---|---|---|
| el ext4 raíz | montaje con `resv_strict,resuid=65534`: la reserva se cierra incluso a root | no |
| capacidad `CAP_SYS_RESOURCE` | bit 24 de `CapEff` = 0: la plataforma la retira | no |
| Podman | `graphroot` = `/var/lib/containers/storage`, overlay sobre **el mismo** `/dev/vda` ext4 | no: escribe bajo la misma reserva |
| loop / archivo disperso | vive en el mismo ext4; cada bloque escrito cuenta igual | no |
| virtio | `vdb`–`vdf` son de sólo lectura y de MiB; añadir un disco es decisión del hipervisor, no del invitado | no |
| zram | `zram0` de 0 B; es RAM comprimida (16 GiB totales), no disco | no: no es la reserva, y restaría memoria a la inferencia |

**Conclusión: los 252 GiB no se pueden usar desde dentro.** La reserva está
cerrada en dos capas independientes (`resv_strict` y la capacidad retirada), y
ambas las fija la plataforma. Reabrirla —`tune2fs -r`, remontar sin
`resv_strict`, escribir el dispositivo en crudo— sería eludir el límite de
recursos del entorno, no usarlo: no se implementa.

**Lo que sí se implementa en TDD:** que el pull de infraestructura (imagen y
modelo) se admita contra el techo real que `disk-headroom` mide, y rehúse
antes de empezar con la necesidad y el techo nombrados, en vez de fallar a
mitad de 5.5 GB con `no space left on device`.

*Metrica:* `statvfs`, opciones de montaje, `CapEff`, `lsblk` y `podman info`,
una vez, en este contenedor.
*Ciega a:* una máquina con otro montaje o con `CAP_SYS_RESOURCE` (ahí
`disk-headroom` daría `RESERVA_ALCANZABLE`, exit 1, y el techo sería mayor), y
al disco que el hipervisor podría añadir desde fuera.
