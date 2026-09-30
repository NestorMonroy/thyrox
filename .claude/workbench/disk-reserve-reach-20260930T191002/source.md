# TASK-THYROX-0671 — Admit infrastructure pulls against the real disk ceiling

Tarjeta 32 de la sesión 333534ce. Análisis: `README.md` de este banco (léelo
completo, incluida la revisión del ejecutor que corrigió la premisa).

## Qué pasa hoy

`bin/infrastructure_ensure` crea cada contenedor con `podman create`, que baja
la imagen si falta. Para `thyrox-ollama` son 5.5 GB de imagen (medido:
`.claude/workbench/ollama-podman-measure-20260930T185844`) más el modelo. El
techo operativo es el disco que el sistema de archivos reporta accesible
(`f_bavail`, 16.9 GiB al medir). Si el pull no cabe, hoy falla a mitad con
`no space left on device` después de haber escrito gigabytes; y dos pulls
concurrentes que consultan el disco libre a la vez ven los dos el mismo
espacio.

## Qué se pide (TDD), en este orden

1. **`disk-headroom` considera `resuid`/`resgid`.** Hoy el veredicto mira sólo
   `resv_strict` y `CAP_SYS_RESOURCE` (`src/repo/disk-headroom.sh`, bloque
   `# --- verdict ---`). En ext4 un proceso cuyo uid efectivo es `resuid`, o
   que pertenece a `resgid`, también alcanza la reserva. Añade esa rama
   (sin `resv_strict`: alcanzable si uid ∈ {resuid} o algún grupo ∈ {resgid}
   o hay la capacidad), con el uid y los grupos inyectables para la prueba,
   igual que ya se inyectan los otros insumos. `resv_strict` sigue cerrando
   la reserva a todos. Documenta la regla completa en la cabecera.
2. **`disk-headroom --ceiling-bytes`**: imprime un solo entero, el techo REAL
   según el veredicto (`f_bavail` con reserva inalcanzable o sin reserva;
   `f_bfree` con reserva alcanzable). Con exit 2 no imprime cifra. Reutiliza
   el cálculo existente, sin un segundo `statvfs` fuera del guion (DRY).
3. **Registro de disco con medir-y-reservar atómico.** En
   `src/session/resource_admission.py` ya existen el registro y el bucle bajo
   lock (`admit_with`, `release_from`, `pending`, `admissible`) que usan la
   RAM y la VRAM (`gpu_monitor.py`), y cada recurso aporta sólo su medida.
   Añade el recurso disco del mismo modo: su medida es
   `techo (--ceiling-bytes) − piso de seguridad`, el piso declarado
   (`THYROX_DISK_ADMISSION_FLOOR_MB`, default con nombre y justificado en un
   comentario: worktrees, caches, logs y capas temporales de Podman comparten
   el sistema de archivos); el registro en `THYROX_DISK_ADMISSION_LEDGER`
   (default bajo la caché del repo, como el de RAM). Subcomandos de CLI
   `disk-admit --need-bytes N --owner PID [--timeout S]` y
   `disk-release --owner PID`, con salidas 0 admitido / 3 plazo vencido sin
   sitio / 2 no se pudo medir (disk-headroom rehusó) — el mismo contrato que
   `gpu_monitor admit`. Las reservas de dueños muertos dejan de contar solas.
   Declara las variables en `.env.example` y pruébalas.
4. **Admisión antes del pull en `infrastructure_ensure.sh`.** Cada contenedor
   declara la necesidad de disco de su imagen en `src/lib/infrastructure.sh`
   (`thyrox_infrastructure_disk_need_bytes <nombre>`, constantes con nombre).
   Sólo si la imagen falta localmente (`podman image exists`), se reserva con
   `disk-admit` (owner = el pid del ensure) antes de `podman create`, y se
   libera después de que el create termine (con éxito o no). Si no se admite,
   rehúsa con exit 2 nombrando contenedor, necesidad, techo y el banco
   `disk-reserve-reach-20260930T191002`, sin llamar a `podman create`.

## Controles

- Casos del registro: cabe → admite; no cabe → plazo vencido (3); dos dueños
  vivos cuya suma no cabe → entra uno; dueño muerto → su reserva no cuenta;
  disk-headroom rehúsa → 2.
- Casos del ensure: cabe → crea; no cabe → exit 2 sin `podman create`; imagen
  presente con techo pequeño → crea sin pasar por la admisión.
- Casos de disk-headroom: resuid = uid del proceso sin resv_strict →
  alcanzable; resgid en sus grupos → alcanzable; con resv_strict → siempre
  inalcanzable.
- Anulación, con números: retirar el lock (reservar sin él) hace caer el caso
  de dos dueños; retirar la rama resuid hace caer exactamente su caso;
  retirar el atajo de imagen presente hace caer exactamente su caso.
- Podman, `statvfs`, uid/grupos y disk-headroom se inyectan; nada toca el
  Podman real ni el disco real en las pruebas.
