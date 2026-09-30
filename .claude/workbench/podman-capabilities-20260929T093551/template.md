Implementas en thyrox (bash), en TDD, una sonda de capacidades de ejecución de Podman. El `Item:`
de abajo nombra los archivos que te pertenecen; no toques ningún otro. Edita con `sed`, `gawk` o
`bash bin/replace_literal`.

Estado medido en este contenedor (2026-09-29): Podman 4.9.3 instalado por
`thyrox_toolchain_require_podman`; `podman info` da runtime `runc`, cgroups v1, manager `cgroupfs`,
almacenamiento `overlay`. No hay `busybox`; hay `gcc`. Somos uid 0.

Lo que se pide:
1. `src/lib/podman_capabilities.sh`, ejecutable, con cabecera `# @description` en español:
   - obtiene Podman con `thyrox_toolchain_require_podman` (de `src/lib/toolchain.sh`), sin opt-in de
     instalación; si rehúsa, la sonda rehúsa con exit 2 y NO imprime veredictos;
   - construye una imagen LOCAL sin red: compila con `gcc -static` un ayudante en C que según su
     argumento (a) sale 0, (b) intenta crear N procesos e informa cuántos logró, (c) reserva y toca
     N MiB; lo mete en un tar y lo importa con `podman import` bajo un nombre propio de la sonda;
   - mide y escribe en stdout una línea TSV por capacidad: `capacidad<TAB>veredicto<TAB>detalle`,
     con veredicto `efectivo`, `no-efectivo` o `error`:
       `run` (el contenedor corre y sale 0),
       `pids_limit` (con `--pids-limit 16`, el ayudante que pide 64 procesos logra ≤ 16),
       `memory_limit` (con `--memory 64m` y sin swap extra, reservar 256 MiB termina con el
        contenedor muerto por OOM o con fallo de reserva, no con éxito),
       `cleanup` (tras `podman rm -f`, `podman ps -a` no lista el contenedor y no queda ningún
        proceso del ayudante en el anfitrión);
   - retira siempre lo que creó (contenedores e imagen), también si una medida falla (`trap`);
   - exit 0 si pudo medir las cuatro capacidades (cualquiera sea el veredicto); exit 2 si no pudo
     medir (sin Podman, sin gcc, fallo al importar), sin imprimir veredictos.
2. `tests/lib/test-podman-capabilities.sh`:
   - con un PATH donde `podman` no existe → exit 2 y ninguna línea de veredicto;
   - con el Podman real → exit 0 y exactamente cuatro líneas, una por capacidad, con veredicto
     válido; `run` y `cleanup` deben salir `efectivo`. `pids_limit` y `memory_limit` se INFORMAN tal
     cual (esa es la medida sobre cgroups v1); el test no los fuerza a `efectivo`;
   - tras la sonda no queda la imagen ni ningún contenedor de la sonda.
3. Control de anulación: haz que `cleanup` no ejecute `podman rm -f` y confirma que caen exactamente
   las aserciones de limpieza; publica los conteos. Restaura.
4. Comentarios en español sin coloquialismos; identificadores en inglés.

Cierre del ítem (obligatorio):
- Todo en primer plano; no termines esperando una notificación.
- Tu mensaje final incluye la roja inicial, el verde final, las cuatro líneas TSV que midió la
  sonda real y el control de anulación con sus conteos.

Criterio de cierre: `bash tests/lib/test-podman-capabilities.sh` en verde.
