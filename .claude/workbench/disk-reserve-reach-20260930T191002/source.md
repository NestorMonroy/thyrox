# TASK-THYROX-0671 — Admit infrastructure pulls against the real disk ceiling

Tarjeta 32 de la sesión 333534ce. Análisis: `README.md` de este banco.

## Qué pasa hoy

`bin/infrastructure_ensure` crea cada contenedor con `podman create`, que baja
la imagen si falta. Para `thyrox-ollama` son 5.5 GB de imagen (medido:
`.claude/workbench/ollama-podman-measure-20260930T185844`) más el modelo. El
techo real de escritura es el `Avail` del ext4 (17.5 GiB al medir): la reserva
de 214.92 GiB está cerrada por `resv_strict` y por la ausencia de
`CAP_SYS_RESOURCE`, y **no se reabre**. Si el pull no cabe, hoy falla a mitad
con `no space left on device`, después de haber escrito gigabytes.

## Qué se pide (TDD)

1. **`bin/disk-headroom` publica el techo en bytes para una máquina.** Nueva
   opción `--ceiling-bytes` que imprime un solo entero: el techo REAL según el
   veredicto (`Avail` con reserva inalcanzable o sin reserva; bytes libres de
   verdad con reserva alcanzable). Con exit 2 no se imprime cifra. Reutiliza
   el cálculo existente: nada de un segundo `statvfs` fuera del guion (DRY).
2. **Admisión antes del pull.** En `src/lib/infrastructure.sh`, cada
   contenedor declara la necesidad de disco de su imagen
   (`thyrox_infrastructure_disk_need_bytes <nombre>`; para Postgres y Redis
   su tamaño medido o un valor declarado como constante con nombre).
   `infrastructure_ensure.sh`, **sólo si la imagen falta localmente**
   (`podman image exists`), mide el techo con `disk-headroom --path <graphroot
   de podman> --ceiling-bytes` y, si la necesidad más un margen declarado
   (`THYROX_INFRASTRUCTURE_DISK_MARGIN_MB`, default con nombre) no cabe,
   rehúsa con exit 2 nombrando contenedor, necesidad, techo y el banco
   `disk-reserve-reach-20260930T191002`. Si disk-headroom rehúsa (exit 2), la
   admisión también rehúsa: no se asume que cabe.
3. Una imagen ya presente no pasa por la admisión (no hay pull).

## Controles

- Casos: cabe → crea; no cabe → exit 2 sin llamar a `podman create`;
  disk-headroom rehúsa → exit 2; imagen presente con techo pequeño → crea.
- Anulación: retirar la comprobación hace caer exactamente los casos «no
  cabe» y «disk-headroom rehúsa»; retirar el atajo de imagen presente hace
  caer exactamente su caso. Dilo con números.
- Podman y disk-headroom se inyectan por variable (el árbol ya inyecta
  `PODMAN`); nada toca el Podman real ni el disco real en las pruebas.
- Si `--ceiling-bytes` agrega una variable `THYROX_*`, se declara en
  `.env.example` y se prueba.
