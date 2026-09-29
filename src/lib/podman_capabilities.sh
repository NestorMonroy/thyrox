#!/usr/bin/env bash
# @description Sonda de capacidades de ejecucion de Podman.
#
# Compila un ayudante estatico en C, lo empaqueta en una imagen LOCAL sin red
# (`podman import` sobre un tar propio, sin registro) y mide, con ese
# ayudante corriendo dentro de un contenedor, si el runtime CORRE, si hace
# cumplir el limite de PIDs y el de memoria, y si la limpieza retira
# contenedor e imagen sin dejar proceso huerfano en el anfitrion.
#
# Publica en stdout una linea TSV por capacidad —`capacidad<TAB>veredicto
# <TAB>detalle`—, con veredicto `efectivo`, `no-efectivo` o `error`. Un
# veredicto `no-efectivo`/`error` no es un fallo del guion: es la MEDIDA. Lo
# unico que hace fallar al guion (exit 2, sin imprimir ninguna linea) es no
# poder medir: falta Podman, falta gcc, o `podman import` no deja una imagen
# usable.
#
# Cuatro capacidades, en este orden:
#   run           el contenedor corre y sale 0
#   pids_limit    con --pids-limit 16, el ayudante que intenta 64 procesos
#                 logra <= 16
#   memory_limit  con --memory 64m (sin swap extra), reservar 256 MiB termina
#                 en fallo de reserva u OOM, no en exito
#   cleanup       tras `podman rm -f`, ni el contenedor queda listado ni
#                 sobrevive su proceso en el anfitrion
#
# @exitcode 0 Se pudieron medir las cuatro capacidades (cualquiera sea su
#             veredicto).
# @exitcode 2 No se pudo medir: falta Podman (via
#             `thyrox_toolchain_require_podman`, SIN opt-in de instalacion),
#             falla `gcc -static`, o falla `podman import`. No se imprime
#             ninguna linea de veredicto.

set -uo pipefail

_PODMAN_CAP_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_PODMAN_CAP_HERE/toolchain.sh"

# Identificador unico de esta ejecucion: evita colision entre sondas
# concurrentes sobre el mismo anfitrion (nombre de imagen, de contenedores, y
# el marcador que identifica al proceso del ayudante en el anfitrion).
_PODMAN_CAP_RUN_ID="$$-${RANDOM}"
_PODMAN_CAP_IMAGE="thyrox-podman-capabilities-${_PODMAN_CAP_RUN_ID}"
_PODMAN_CAP_CONTAINER_PREFIX="thyrox-podman-cap-${_PODMAN_CAP_RUN_ID}"
_PODMAN_CAP_HELPER_MARKER="thyrox-podman-capabilities-helper-${_PODMAN_CAP_RUN_ID}"

_PODMAN_CAP_WORK=""
_PODMAN_CAP_IMAGE_IMPORTED=""
declare -a _PODMAN_CAP_CONTAINERS=()

# _podman_cap_cleanup — retira SIEMPRE lo que esta sonda creo: cada
# contenedor registrado y la imagen, tambien si una medida fallo a mitad de
# camino. Corre por `trap ... EXIT`, asi que ve cualquier salida, incluido un
# `exit 2` temprano.
_podman_cap_cleanup() {
  local cname
  for cname in "${_PODMAN_CAP_CONTAINERS[@]:-}"; do
    [[ -n "$cname" ]] && "$PODMAN" rm -f "$cname" >/dev/null 2>&1 || true
  done
  if [[ -n "$_PODMAN_CAP_IMAGE_IMPORTED" ]]; then
    "$PODMAN" rmi -f "$_PODMAN_CAP_IMAGE" >/dev/null 2>&1 || true
  fi
  if [[ -n "$_PODMAN_CAP_WORK" && -d "$_PODMAN_CAP_WORK" ]]; then
    rm -rf -- "$_PODMAN_CAP_WORK"
  fi
}
trap _podman_cap_cleanup EXIT

# Sin opt-in de instalacion: si Podman no esta, la sonda REHUSA. No se declara
# THYROX_INSTALL_PODMAN=1 aqui — instalar sigue siendo decision de quien
# invoca, no de esta sonda.
thyrox_toolchain_require_podman || exit 2
PODMAN="$THYROX_TOOLCHAIN_PODMAN_BIN"

_PODMAN_CAP_WORK="$(mktemp -d)" || exit 2
# El runtime OCI (runc/conmon, bajo cgroups v1) escribe un artefacto de
# notificacion de OOM ("oom", vacio) RELATIVO al directorio de trabajo del
# proceso que invoca `podman run`, no dentro del contenedor ni junto al log.
# Medido: sin este `cd`, ese archivo aterriza en el cwd de quien invoco la
# sonda. Se ancla al directorio de trabajo propio, que el trap ya retira.
cd "$_PODMAN_CAP_WORK" || exit 2

# --- el ayudante ---
#
# Un solo binario, tres modos por argv[1]:
#   run          sale 0 de inmediato — mide si el contenedor corre.
#   fork <n>     intenta crear <n> procesos hijos y espera a todos; imprime
#                cuantos logro CREAR (fork() con exito), no cuantos
#                sobrevivieron — es la cuenta que un --pids-limit acota.
#   mem <n>      reserva <n> MiB con malloc() y TOCA cada pagina (paginas
#                nunca escritas no cuentan contra un limite de memoria real).
#   sleep <n>    duerme <n> segundos — deja un proceso vivo en el anfitrion
#                para medir la capacidad `cleanup`.
cat > "$_PODMAN_CAP_WORK/helper.c" <<'HELPER_C_EOF'
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "uso: helper <run|fork|mem|sleep> [n]\n");
        return 1;
    }

    if (strcmp(argv[1], "run") == 0) {
        return 0;
    }

    if (strcmp(argv[1], "fork") == 0) {
        int requested = argc > 2 ? atoi(argv[2]) : 0;
        int created = 0;
        int i;
        /* No se cosecha entre forks: un hijo cosechado de inmediato deja de
         * contar contra el cgroup de pids, y eso ocultaria el limite. */
        for (i = 0; i < requested; i++) {
            pid_t pid = fork();
            if (pid == 0) {
                _exit(0);
            }
            if (pid < 0) {
                break;
            }
            created++;
        }
        for (i = 0; i < created; i++) {
            int status;
            wait(&status);
        }
        printf("%d\n", created);
        fflush(stdout);
        return 0;
    }

    if (strcmp(argv[1], "mem") == 0) {
        long mib = argc > 2 ? atol(argv[2]) : 0;
        size_t bytes = (size_t) mib * 1024 * 1024;
        size_t page = 4096;
        size_t offset;
        char *buf = malloc(bytes);
        if (buf == NULL) {
            fprintf(stderr, "malloc fallo para %ld MiB\n", mib);
            return 1;
        }
        for (offset = 0; offset < bytes; offset += page) {
            buf[offset] = 1;
        }
        printf("toco %ld MiB\n", mib);
        fflush(stdout);
        return 0;
    }

    if (strcmp(argv[1], "sleep") == 0) {
        unsigned int seconds = argc > 2 ? (unsigned int) atoi(argv[2]) : 0;
        sleep(seconds);
        return 0;
    }

    fprintf(stderr, "modo desconocido: %s\n", argv[1]);
    return 1;
}
HELPER_C_EOF

if ! gcc -static -O2 -o "$_PODMAN_CAP_WORK/helper" "$_PODMAN_CAP_WORK/helper.c" \
     2>"$_PODMAN_CAP_WORK/gcc.err"; then
  echo "podman_capabilities: gcc -static fallo compilando el ayudante:" >&2
  cat "$_PODMAN_CAP_WORK/gcc.err" >&2
  exit 2
fi

# --- la imagen: un tar propio, importado sin red ---
mkdir -p "$_PODMAN_CAP_WORK/rootfs/bin"
cp "$_PODMAN_CAP_WORK/helper" "$_PODMAN_CAP_WORK/rootfs/bin/helper"
if ! tar -C "$_PODMAN_CAP_WORK/rootfs" -cf "$_PODMAN_CAP_WORK/rootfs.tar" .; then
  echo "podman_capabilities: no se pudo empaquetar el rootfs" >&2
  exit 2
fi

if ! "$PODMAN" import "$_PODMAN_CAP_WORK/rootfs.tar" "$_PODMAN_CAP_IMAGE" \
     >"$_PODMAN_CAP_WORK/import.log" 2>&1; then
  echo "podman_capabilities: 'podman import' fallo:" >&2
  cat "$_PODMAN_CAP_WORK/import.log" >&2
  exit 2
fi
_PODMAN_CAP_IMAGE_IMPORTED=1

# --- clasificacion del codigo de salida de 'podman run' ---
#
# Convencion de podman/docker: 125 es un fallo del PROPIO podman (no pudo
# arrancar el contenedor), 126 comando no ejecutable, 127 comando no
# encontrado. Cualquier otro codigo es el que el CONTENEDOR informo, y esa
# distincion es la que separa «no pude medir» (error) de «medi, y esto dio»
# (efectivo/no-efectivo).
_podman_cap_is_podman_level_error() {
  local rc="$1"
  [[ "$rc" -eq 125 || "$rc" -eq 126 || "$rc" -eq 127 ]]
}

# --- capacidad: run ---
_podman_cap_measure_run() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-run" out rc
  _PODMAN_CAP_CONTAINERS+=("$cname")
  out="$("$PODMAN" run --rm --network none --name "$cname" \
        "$_PODMAN_CAP_IMAGE" /bin/helper run 2>&1)"
  rc=$?
  if _podman_cap_is_podman_level_error "$rc"; then
    printf 'run\terror\tpodman rc=%s: %s\n' "$rc" "${out:0:200}"
  elif [[ "$rc" -eq 0 ]]; then
    printf 'run\tefectivo\tel contenedor corrio y salio 0\n'
  else
    printf 'run\tno-efectivo\tel contenedor corrio y salio %s\n' "$rc"
  fi
}

# --- capacidad: pids_limit ---
_podman_cap_measure_pids_limit() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-pids" out rc created
  _PODMAN_CAP_CONTAINERS+=("$cname")
  out="$("$PODMAN" run --rm --network none --pids-limit 16 --name "$cname" \
        "$_PODMAN_CAP_IMAGE" /bin/helper fork 64 2>"$_PODMAN_CAP_WORK/pids.err")"
  rc=$?
  if _podman_cap_is_podman_level_error "$rc"; then
    printf 'pids_limit\terror\tpodman rc=%s: %s\n' "$rc" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/pids.err")"
    return
  fi
  created="$(printf '%s' "$out" | tr -dc '0-9')"
  if [[ -z "$created" ]]; then
    printf 'pids_limit\terror\tsalida sin conteo legible (rc=%s): %s\n' "$rc" "${out:0:200}"
    return
  fi
  if [[ "$created" -le 16 ]]; then
    printf 'pids_limit\tefectivo\tlogro %s/64 procesos con --pids-limit 16\n' "$created"
  else
    printf 'pids_limit\tno-efectivo\tlogro %s/64 procesos con --pids-limit 16\n' "$created"
  fi
}

# --- capacidad: memory_limit ---
_podman_cap_measure_memory_limit() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-mem" rc
  _PODMAN_CAP_CONTAINERS+=("$cname")
  "$PODMAN" run --rm --network none --memory 64m --name "$cname" \
    "$_PODMAN_CAP_IMAGE" /bin/helper mem 256 \
    >"$_PODMAN_CAP_WORK/mem.out" 2>"$_PODMAN_CAP_WORK/mem.err"
  rc=$?
  if [[ "$rc" -eq 125 ]]; then
    printf 'memory_limit\terror\tpodman rc=%s: %s\n' "$rc" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/mem.err")"
  elif [[ "$rc" -eq 0 ]]; then
    printf 'memory_limit\tno-efectivo\treservo y toco 256 MiB sin fallo bajo --memory 64m\n'
  else
    printf 'memory_limit\tefectivo\treservar 256 MiB fallo o el contenedor murio bajo --memory 64m (rc=%s)\n' "$rc"
  fi
}

# --- capacidad: cleanup ---
#
# Lanza el ayudante en modo `sleep` para tener un proceso vivo que limpiar,
# retira con `podman rm -f`, y comprueba DOS cosas: que el contenedor ya no
# aparece listado (ni con -a) y que ningun proceso del ayudante sobrevive en
# el anfitrion. El patron de `pgrep` va con la clase de corchetes en su
# primer caracter —nunca desnudo— para no casar consigo mismo (la propia
# linea de comando de `pgrep -f` contendria el patron literal).
_podman_cap_measure_cleanup() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-cleanup"
  local listed proc_line rm_rc start_err
  local marker_pattern="[${_PODMAN_CAP_HELPER_MARKER:0:1}]${_PODMAN_CAP_HELPER_MARKER:1}"
  _PODMAN_CAP_CONTAINERS+=("$cname")

  if ! "$PODMAN" run -d --network none --name "$cname" "$_PODMAN_CAP_IMAGE" \
       /bin/helper sleep 30 "$_PODMAN_CAP_HELPER_MARKER" \
       >/dev/null 2>"$_PODMAN_CAP_WORK/cleanup-start.err"; then
    start_err="$(head -c 200 "$_PODMAN_CAP_WORK/cleanup-start.err")"
    printf 'cleanup\terror\tno se pudo lanzar el contenedor a limpiar: %s\n' "$start_err"
    return
  fi

  "$PODMAN" rm -f "$cname" >/dev/null 2>"$_PODMAN_CAP_WORK/cleanup-rm.err"
  rm_rc=$?

  listed="$("$PODMAN" ps -a --filter "name=^${cname}\$" --format '{{.Names}}' 2>/dev/null)"
  proc_line="$(pgrep -f "$marker_pattern" 2>/dev/null || true)"

  if [[ "$rm_rc" -ne 0 ]]; then
    printf 'cleanup\terror\t%s rm -f fallo: %s\n' "$PODMAN" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/cleanup-rm.err")"
  elif [[ -n "$listed" || -n "$proc_line" ]]; then
    printf 'cleanup\tno-efectivo\tlistado=%s proceso=%s\n' \
      "${listed:-ninguno}" "${proc_line:-ninguno}"
  else
    printf 'cleanup\tefectivo\tsin contenedor listado y sin proceso del ayudante en el anfitrion\n'
  fi
}

_podman_cap_measure_run
_podman_cap_measure_pids_limit
_podman_cap_measure_memory_limit
_podman_cap_measure_cleanup

exit 0
