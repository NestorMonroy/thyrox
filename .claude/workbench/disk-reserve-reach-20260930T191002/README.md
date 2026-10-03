# disk-reserve-reach

## El encargo

> «con podman o vitrio podemos hacer eso de esos 252G ? yo considero que si,
> analiza e implemetalo en TDD» — ejecutor, 2026-09-30, sobre el costo de
> reciclar el entorno (imagen de Ollama de 5.5 GB más el modelo).

## La premisa, si se corrigio al primer comando

La premisa era que el tamaño de `/dev/vda` es capacidad disponible para quien
sepa pedirla. **El tamaño nominal del dispositivo no representa capacidad
asignable al workload**: el techo operativo es el espacio que el sistema de
archivos reporta accesible para el proceso, 17.5 GiB al medir.

El reparto, medido con `statvfs` (no `total − Avail`):

| Componente | GiB | De dónde sale |
|---|---|---|
| capacidad (`f_blocks`) | 251.97 | |
| en uso (`f_blocks − f_bfree`) | 20.15 | archivos, metadata, sistema |
| libre pero no disponible (`f_bfree − f_bavail`) | 214.92 | lo que `disk-headroom` llama reserva |
| disponible para el proceso (`f_bavail`) | 16.90 | el techo operativo |

`disk-headroom` usa exactamente `f_bfree − f_bavail`
(`src/repo/disk-headroom.sh:109`), así que el uso real no entra en la cifra de
reserva. Lo que la cifra NO distingue es el sobrecoste interno del ext4 que el
superbloque no expone como libre: queda fuera de las tres filas, no dentro de
la reserva.

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

**Conclusión: no hay capacidad adicional disponible para el workload más allá
del `Avail` que reporta el sistema de archivos.** La evidencia es la
combinación —sistema de archivos, opciones de montaje, `statvfs`, capacidades
y el almacén real de Podman—, no una sola de ellas: el montaje declara
`resv_strict`; la reserva pertenece a `resuid=65534`/`resgid=65534` y el
proceso corre como uid 0 con grupos {0}; y a `CapEff` le falta
`CAP_SYS_RESOURCE`. Las tres las fija la plataforma.

**Un hueco del instrumento, declarado:** el veredicto de `disk-headroom` no
consulta `resuid`/`resgid`. Aquí no cambia el resultado (el proceso no es
65534), pero un proceso que corriera como ese uid o grupo tendría otra
respuesta. Se corrige en TASK-THYROX-0671. Reabrirla —`tune2fs -r`, remontar sin
`resv_strict`, escribir el dispositivo en crudo— sería eludir el límite de
recursos del entorno, no usarlo: no se implementa.

**Lo que sí se implementa en TDD:** la admisión de disco, paralela a la de
VRAM. Lo admisible es `disponible − piso de seguridad − reservas vivas de
otros dueños`, y medir y reservar ocurren bajo el mismo lock —el registro de
`resource_admission`—, para que dos pulls concurrentes no vean los dos el
mismo espacio libre. Un pull que no cabe rehúsa antes de empezar, en vez de
fallar a mitad de 5.5 GB con `no space left on device`.

*Metrica:* `statvfs`, opciones de montaje, `CapEff`, `lsblk` y `podman info`,
una vez, en este contenedor.
*Ciega a:* una máquina con otro montaje o con `CAP_SYS_RESOURCE` (ahí
`disk-headroom` daría `RESERVA_ALCANZABLE`, exit 1, y el techo sería mayor), y
al disco que el hipervisor podría añadir desde fuera.
