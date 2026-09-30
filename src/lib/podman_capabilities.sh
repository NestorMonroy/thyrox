#!/usr/bin/env bash
# @description Sonda de capacidades de ejecucion de Podman.
#
# Compila un ayudante estatico en C, lo empaqueta en una imagen LOCAL sin red
# (`podman import` sobre un tar propio, sin registro) y mide, con ese
# ayudante corriendo dentro de un contenedor, si el runtime CORRE, si hace
# cumplir los limites de PIDs, memoria, red, sistema de archivos y CPU, y si
# la limpieza retira contenedor e imagen sin dejar proceso huerfano en el
# anfitrion.
#
# Publica en stdout una linea TSV por capacidad —`capacidad<TAB>veredicto
# <TAB>detalle`—, con veredicto `efectivo`, `no-efectivo` o `error`. Un
# veredicto `no-efectivo`/`error` no es un fallo del guion: es la MEDIDA. Lo
# unico que hace fallar al guion (exit 2, sin imprimir ninguna linea) es no
# poder medir: falta Podman, falta gcc, o `podman import` no deja una imagen
# usable.
#
# Doce capacidades, en este orden:
#   run                 el contenedor corre y sale 0
#   pids_limit          con --pids-limit 16, el ayudante que intenta 64
#                       procesos logra <= 16
#   memory_limit        con --memory 64m (sin swap extra), reservar 256 MiB
#                       termina en fallo de reserva u OOM, no en exito
#   cleanup             tras `podman rm -f`, ni el contenedor queda listado
#                       ni sobrevive su proceso en el anfitrion
#   network_none        con --network none, una conexion TCP a una IP fija Y
#                       una consulta DNS por UDP fallan las dos
#   read_only_rootfs    con --read-only --read-only-tmpfs=false, escribir en
#                       / Y en /tmp fallan las dos (--read-only solo deja
#                       /tmp, /run, /var/tmp y /dev/shm escribibles, porque
#                       Podman los monta como tmpfs)
#   cpu_limit           con --cpus 0.5, el ayudante que gira 2 hilos obtiene
#                       menos nucleos que un umbral con nombre entre el
#                       limite pedido y el techo sin limite de 2 hilos
#   readonly_mount      con un directorio propio (no el repo) montado :ro,
#                       leer un archivo sembrado funciona Y escribir falla
#   overlay_mount       un directorio del anfitrion montado `:O` en /w: leer
#                       el archivo sembrado funciona, escribir dentro del
#                       contenedor funciona, y esa escritura NO aparece en el
#                       directorio del anfitrion
#   exit_code_propagation
#                       el ayudante sale con un codigo no trivial declarado
#                       como constante; efectivo si `podman run` devuelve
#                       exactamente ese codigo
#   signal_propagation  el ayudante espera una senal; `podman kill --signal
#                       TERM` sobre el contenedor; efectivo si el proceso
#                       registra la senal recibida Y su codigo de salida lo
#                       refleja
#   credential_injection
#                       mide dos mecanismos —`--env NAME` heredado del
#                       entorno y `--secret ...,type=env,target=NAME`— y es
#                       efectivo solo si alguno entrega el valor al proceso
#                       SIN que aparezca en `podman inspect`
#
# @exitcode 0 Se pudieron medir las doce capacidades (cualquiera sea su
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

# Umbral con nombre para `cpu_limit`, entre el limite pedido (0.5 nucleos) y
# el techo sin limite de 2 hilos (~2.0 nucleos, medido en
# `.claude/workbench/podman-isolation-2b-gaps-20260929T140754/`). La medida
# es sensible a la carga del anfitrion —el mismo banco midio 1,77 en vez de
# 1,94 bajo contencion de otras sondas—, asi que el umbral deja margen en vez
# de pegarse al valor esperado.
readonly _PODMAN_CAP_CPU_LIMIT_THRESHOLD='1.0'
readonly _PODMAN_CAP_CPU_LIMIT_THREADS=2

# Codigo de salida no trivial que el ayudante devuelve en modo 'exitcode':
# mide exit_code_propagation por igualdad exacta contra lo que 'podman run'
# reporta.
readonly _PODMAN_CAP_EXIT_CODE=42

# Mismo codigo que SIGTERM_RECEIVED_EXIT_CODE en el ayudante — se declara
# aqui tambien para no depender de parsear el .c al verificar el resultado.
readonly _PODMAN_CAP_SIGTERM_EXIT_CODE=77

# Credencial de prueba para credential_injection: un nombre y un valor que
# no colisionan con nada del entorno real, y el nombre del secreto de Podman
# que la sonda crea y retira.
readonly _PODMAN_CAP_CREDENTIAL_TARGET='THYROX_PROBE_CREDENTIAL'
readonly _PODMAN_CAP_CREDENTIAL_VALUE="thyrox-probe-credential-${_PODMAN_CAP_RUN_ID}"
_PODMAN_CAP_SECRET_NAME="thyrox-podman-cap-secret-${_PODMAN_CAP_RUN_ID}"
_PODMAN_CAP_SECRET_CREATED=""

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
  if [[ -n "$_PODMAN_CAP_SECRET_CREATED" ]]; then
    "$PODMAN" secret rm "$_PODMAN_CAP_SECRET_NAME" >/dev/null 2>&1 || true
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
# Un solo binario, por argv[1]:
#   run          sale 0 de inmediato — mide si el contenedor corre.
#   fork <n>     intenta crear <n> procesos hijos y espera a todos; imprime
#                cuantos logro CREAR (fork() con exito), no cuantos
#                sobrevivieron — es la cuenta que un --pids-limit acota.
#   mem <n>      reserva <n> MiB con malloc() y TOCA cada pagina (paginas
#                nunca escritas no cuentan contra un limite de memoria real).
#   sleep <n>    duerme <n> segundos — deja un proceso vivo en el anfitrion
#                para medir la capacidad `cleanup`.
#   net          conecta por TCP a una IP publica fija, sin DNS, para medir
#                la red y no el resolvedor.
#   dns          una consulta DNS minima por UDP: ¿sale y vuelve la
#                respuesta?
#   cpu <n>      <n> hilos giran unos segundos; publica el cociente
#                CPU/pared, que es cuantos nucleos obtuvo el contenedor.
#   write <ruta>  intenta crear/abrir <ruta> en escritura.
#   read <ruta>   intenta abrir <ruta> en lectura.
#   exitcode <n>  sale con el codigo <n> — mide exit_code_propagation.
#   sigterm       instala un manejador de SIGTERM, espera hasta 3 segundos a
#                 recibirla, imprime si la recibio y sale con un codigo
#                 distinto segun el caso — mide signal_propagation.
#   env <nombre>  imprime el valor de la variable de entorno <nombre>, o
#                 "(unset)" si no esta — mide credential_injection.
cat > "$_PODMAN_CAP_WORK/helper.c" <<'HELPER_C_EOF'
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/times.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

/* Codigo de salida que 'sigterm' devuelve SOLO si de verdad recibio la
 * senal — asi el codigo de salida distingue "la recibi" de "me rendi tras
 * esperar" (que devuelve 1). Y el techo de espera, para no colgar la sonda
 * si --signal TERM no llega nunca. */
#define SIGTERM_RECEIVED_EXIT_CODE 77
#define SIGTERM_MAX_WAIT_CYCLES 30

static void *spin(void *arg) {
    volatile unsigned long x = 0;
    time_t end = time(NULL) + *(int *)arg;
    while (time(NULL) < end) x++;
    return NULL;
}

static volatile sig_atomic_t g_got_sigterm = 0;
static void mark_sigterm(int sig) {
    (void) sig;
    g_got_sigterm = 1;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr,
                "uso: helper <run|fork|mem|sleep|net|dns|cpu|write|read|exitcode|sigterm|env> [n|ruta|nombre]\n");
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

    if (strcmp(argv[1], "net") == 0) {
        /* Conectar por TCP a una IP publica: sin DNS, para medir la red y no
         * el resolvedor. */
        int s = socket(AF_INET, SOCK_STREAM, 0);
        struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(443) };
        struct timeval tv = { 3, 0 };
        int rc;
        inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
        setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof tv);
        rc = s < 0 ? -1 : connect(s, (struct sockaddr *)&a, sizeof a);
        printf("net_connect=%s errno=%s\n",
               rc == 0 ? "ok" : "fail", rc == 0 ? "-" : strerror(errno));
        return 0;
    }

    if (strcmp(argv[1], "dns") == 0) {
        /* Una consulta DNS minima (A de example.com) por UDP a 1.1.1.1:53:
         * ¿sale y vuelve la respuesta? */
        unsigned char q[] = {0x12, 0x34, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
                              7, 'e', 'x', 'a', 'm', 'p', 'l', 'e',
                              3, 'c', 'o', 'm', 0, 0, 1, 0, 1};
        int s = socket(AF_INET, SOCK_DGRAM, 0);
        struct sockaddr_in a = { .sin_family = AF_INET, .sin_port = htons(53) };
        struct timeval tv = { 3, 0 };
        ssize_t sent, got;
        int send_errno;
        unsigned char r[512];
        inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
        setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof tv);
        sent = s < 0 ? -1 : sendto(s, q, sizeof q, 0, (struct sockaddr *)&a, sizeof a);
        send_errno = errno;
        got = sent < 0 ? -1 : recv(s, r, sizeof r, 0);
        printf("dns_send=%s dns_answer=%s errno=%s\n",
               sent >= 0 ? "ok" : "fail", got > 0 ? "ok" : "fail",
               sent < 0 ? strerror(send_errno) : (got > 0 ? "-" : strerror(errno)));
        return 0;
    }

    if (strcmp(argv[1], "cpu") == 0) {
        /* N hilos girando unos segundos: el cociente CPU/pared dice cuantos
         * nucleos obtuvo el contenedor. */
        int secs = 3;
        int n = argc > 2 ? atoi(argv[2]) : 2;
        pthread_t th[8];
        struct tms t0, t9;
        long hz = sysconf(_SC_CLK_TCK);
        clock_t w0, w9;
        double cpu, wall;
        int i;
        if (n < 1 || n > 8) n = 2;
        w0 = times(&t0);
        for (i = 0; i < n; i++) pthread_create(&th[i], NULL, spin, &secs);
        for (i = 0; i < n; i++) pthread_join(th[i], NULL);
        w9 = times(&t9);
        cpu = (double)(t9.tms_utime - t0.tms_utime + t9.tms_stime - t0.tms_stime) / hz;
        wall = (double)(w9 - w0) / hz;
        printf("threads=%d cpu_ratio=%.2f cpu_s=%.2f wall_s=%.2f\n", n, cpu / wall, cpu, wall);
        return 0;
    }

    if (strcmp(argv[1], "write") == 0) {
        const char *path = argc > 2 ? argv[2] : "/probe-write";
        int fd = open(path, O_CREAT | O_WRONLY, 0644);
        printf("write=%s errno=%s\n", fd >= 0 ? "ok" : "fail", fd >= 0 ? "-" : strerror(errno));
        return 0;
    }

    if (strcmp(argv[1], "read") == 0) {
        const char *path = argc > 2 ? argv[2] : "";
        int fd = path[0] == '\0' ? -1 : open(path, O_RDONLY);
        printf("read=%s errno=%s\n", fd >= 0 ? "ok" : "fail", fd >= 0 ? "-" : strerror(errno));
        return 0;
    }

    if (strcmp(argv[1], "exitcode") == 0) {
        int code = argc > 2 ? atoi(argv[2]) : 0;
        return code;
    }

    if (strcmp(argv[1], "sigterm") == 0) {
        int waited_cycles = 0;
        signal(SIGTERM, mark_sigterm);
        while (!g_got_sigterm && waited_cycles < SIGTERM_MAX_WAIT_CYCLES) {
            usleep(100000);
            waited_cycles++;
        }
        printf("got_sigterm=%d\n", g_got_sigterm);
        fflush(stdout);
        return g_got_sigterm ? SIGTERM_RECEIVED_EXIT_CODE : 1;
    }

    if (strcmp(argv[1], "env") == 0) {
        const char *name = argc > 2 ? argv[2] : "";
        const char *value = name[0] == '\0' ? NULL : getenv(name);
        printf("env=%s\n", value != NULL ? value : "(unset)");
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
mkdir -p "$_PODMAN_CAP_WORK/rootfs/bin" "$_PODMAN_CAP_WORK/rootfs/tmp"
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

# --- capacidad: network_none ---
#
# `efectivo` sólo si las dos formas de salir a la red fallan bajo
# --network none: TCP/IPv4 a una IP fija (sin pasar por el resolvedor) y una
# consulta DNS por UDP (que SI pasa por el resolvedor). Dos contenedores,
# porque el ayudante mide un modo por invocacion.
_podman_cap_measure_network_none() {
  local cname_tcp="${_PODMAN_CAP_CONTAINER_PREFIX}-net-tcp"
  local cname_dns="${_PODMAN_CAP_CONTAINER_PREFIX}-net-dns"
  local out_tcp out_dns rc_tcp rc_dns tcp_failed=0 dns_failed=0
  _PODMAN_CAP_CONTAINERS+=("$cname_tcp")
  _PODMAN_CAP_CONTAINERS+=("$cname_dns")

  out_tcp="$("$PODMAN" run --rm --network none --name "$cname_tcp" \
        "$_PODMAN_CAP_IMAGE" /bin/helper net 2>&1)"
  rc_tcp=$?
  if _podman_cap_is_podman_level_error "$rc_tcp"; then
    printf 'network_none\terror\tpodman rc=%s (tcp): %s\n' "$rc_tcp" "${out_tcp:0:200}"
    return
  fi

  out_dns="$("$PODMAN" run --rm --network none --name "$cname_dns" \
        "$_PODMAN_CAP_IMAGE" /bin/helper dns 2>&1)"
  rc_dns=$?
  if _podman_cap_is_podman_level_error "$rc_dns"; then
    printf 'network_none\terror\tpodman rc=%s (dns): %s\n' "$rc_dns" "${out_dns:0:200}"
    return
  fi

  [[ "$out_tcp" == *"net_connect=fail"* ]] && tcp_failed=1
  [[ "$out_dns" == *"dns_send=fail"* || "$out_dns" == *"dns_answer=fail"* ]] && dns_failed=1

  if [[ "$tcp_failed" -eq 1 && "$dns_failed" -eq 1 ]]; then
    printf 'network_none\tefectivo\tTCP y DNS fallan con --network none: %s | %s\n' \
      "$out_tcp" "$out_dns"
  else
    printf 'network_none\tno-efectivo\tTCP=%s DNS=%s con --network none\n' "$out_tcp" "$out_dns"
  fi
}

# --- capacidad: read_only_rootfs ---
#
# `--read-only` solo NO cierra /tmp, /run, /var/tmp ni /dev/shm: Podman los
# monta como tmpfs, y eso sigue siendo escribible. Por eso esta sonda exige
# ademas `--read-only-tmpfs=false`, que cierra tambien esos montajes; medido
# en `.claude/workbench/podman-isolation-2b-gaps-20260929T140754/`.
# `efectivo` solo si escribir en / Y en /tmp fallan las dos.
_podman_cap_measure_read_only_rootfs() {
  local cname_root="${_PODMAN_CAP_CONTAINER_PREFIX}-ro-root"
  local cname_tmp="${_PODMAN_CAP_CONTAINER_PREFIX}-ro-tmp"
  local out_root out_tmp rc_root rc_tmp root_failed=0 tmp_failed=0
  _PODMAN_CAP_CONTAINERS+=("$cname_root")
  _PODMAN_CAP_CONTAINERS+=("$cname_tmp")

  out_root="$("$PODMAN" run --rm --network none --read-only --read-only-tmpfs=false \
        --name "$cname_root" "$_PODMAN_CAP_IMAGE" /bin/helper write /probe-write 2>&1)"
  rc_root=$?
  if _podman_cap_is_podman_level_error "$rc_root"; then
    printf 'read_only_rootfs\terror\tpodman rc=%s (/): %s\n' "$rc_root" "${out_root:0:200}"
    return
  fi

  out_tmp="$("$PODMAN" run --rm --network none --read-only --read-only-tmpfs=false \
        --name "$cname_tmp" "$_PODMAN_CAP_IMAGE" /bin/helper write /tmp/probe-write 2>&1)"
  rc_tmp=$?
  if _podman_cap_is_podman_level_error "$rc_tmp"; then
    printf 'read_only_rootfs\terror\tpodman rc=%s (/tmp): %s\n' "$rc_tmp" "${out_tmp:0:200}"
    return
  fi

  [[ "$out_root" == *"write=fail"* ]] && root_failed=1
  [[ "$out_tmp" == *"write=fail"* ]] && tmp_failed=1

  if [[ "$root_failed" -eq 1 && "$tmp_failed" -eq 1 ]]; then
    printf 'read_only_rootfs\tefectivo\tescribir en / y /tmp falla con --read-only --read-only-tmpfs=false: %s | %s\n' \
      "$out_root" "$out_tmp"
  else
    printf 'read_only_rootfs\tno-efectivo\t/=%s /tmp=%s con --read-only --read-only-tmpfs=false\n' \
      "$out_root" "$out_tmp"
  fi
}

# --- capacidad: cpu_limit ---
#
# La medida es sensible a la carga del anfitrion: correr esta sonda junto a
# otras que tambien usan CPU puede subir el cociente medido. El umbral
# (`_PODMAN_CAP_CPU_LIMIT_THRESHOLD`) deja margen entre el limite pedido
# (0.5) y el techo sin limite de 2 hilos (~2.0) para no confundir esa
# contencion con que el limite no aplique.
_podman_cap_measure_cpu_limit() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-cpu" out rc ratio
  _PODMAN_CAP_CONTAINERS+=("$cname")
  out="$("$PODMAN" run --rm --network none --cpus 0.5 --name "$cname" \
        "$_PODMAN_CAP_IMAGE" /bin/helper cpu "$_PODMAN_CAP_CPU_LIMIT_THREADS" 2>&1)"
  rc=$?
  if _podman_cap_is_podman_level_error "$rc"; then
    printf 'cpu_limit\terror\tpodman rc=%s: %s\n' "$rc" "${out:0:200}"
    return
  fi
  ratio="$(printf '%s' "$out" | grep -o 'cpu_ratio=[0-9.]*' | cut -d= -f2)"
  if [[ -z "$ratio" ]]; then
    printf 'cpu_limit\terror\tsalida sin cpu_ratio legible (rc=%s): %s\n' "$rc" "${out:0:200}"
    return
  fi
  if awk -v r="$ratio" -v t="$_PODMAN_CAP_CPU_LIMIT_THRESHOLD" 'BEGIN { exit !(r < t) }'; then
    printf 'cpu_limit\tefectivo\t%s nucleos obtenidos con --cpus 0.5 y %s hilos (< %s)\n' \
      "$ratio" "$_PODMAN_CAP_CPU_LIMIT_THREADS" "$_PODMAN_CAP_CPU_LIMIT_THRESHOLD"
  else
    printf 'cpu_limit\tno-efectivo\t%s nucleos obtenidos con --cpus 0.5 y %s hilos (>= %s)\n' \
      "$ratio" "$_PODMAN_CAP_CPU_LIMIT_THREADS" "$_PODMAN_CAP_CPU_LIMIT_THRESHOLD"
  fi
}

# --- capacidad: readonly_mount ---
#
# Monta un directorio DESECHABLE PROPIO —subdirectorio de
# `_PODMAN_CAP_WORK`, que el trap ya retira— nunca el repo. `efectivo` solo
# si leer el archivo sembrado funciona Y escribir uno nuevo falla las dos.
_podman_cap_measure_readonly_mount() {
  local cname_read="${_PODMAN_CAP_CONTAINER_PREFIX}-ro-mount-read"
  local cname_write="${_PODMAN_CAP_CONTAINER_PREFIX}-ro-mount-write"
  local mountdir="$_PODMAN_CAP_WORK/readonly-mount"
  local out_read out_write rc_read rc_write read_ok=0 write_failed=0
  _PODMAN_CAP_CONTAINERS+=("$cname_read")
  _PODMAN_CAP_CONTAINERS+=("$cname_write")

  mkdir -p "$mountdir"
  printf 'seed\n' > "$mountdir/seed.txt"

  out_read="$("$PODMAN" run --rm --network none -v "$mountdir:/mnt/ro:ro" \
        --name "$cname_read" "$_PODMAN_CAP_IMAGE" /bin/helper read /mnt/ro/seed.txt 2>&1)"
  rc_read=$?
  if _podman_cap_is_podman_level_error "$rc_read"; then
    printf 'readonly_mount\terror\tpodman rc=%s (read): %s\n' "$rc_read" "${out_read:0:200}"
    return
  fi

  out_write="$("$PODMAN" run --rm --network none -v "$mountdir:/mnt/ro:ro" \
        --name "$cname_write" "$_PODMAN_CAP_IMAGE" /bin/helper write /mnt/ro/probe-write 2>&1)"
  rc_write=$?
  if _podman_cap_is_podman_level_error "$rc_write"; then
    printf 'readonly_mount\terror\tpodman rc=%s (write): %s\n' "$rc_write" "${out_write:0:200}"
    return
  fi

  [[ "$out_read" == *"read=ok"* ]] && read_ok=1
  [[ "$out_write" == *"write=fail"* ]] && write_failed=1

  if [[ "$read_ok" -eq 1 && "$write_failed" -eq 1 ]]; then
    printf 'readonly_mount\tefectivo\tmontaje :ro permite leer y rehusa escribir: %s | %s\n' \
      "$out_read" "$out_write"
  else
    printf 'readonly_mount\tno-efectivo\tread=%s write=%s con montaje :ro\n' "$out_read" "$out_write"
  fi
}

# --- capacidad: overlay_mount ---
#
# Monta un directorio DESECHABLE PROPIO —nunca el repo— con `:O` en /w.
# `efectivo` solo si leer el archivo sembrado funciona, escribir uno nuevo
# DENTRO del contenedor funciona, Y esa escritura no aparece en el
# directorio del anfitrion (la mitad que distingue overlay de un bind `:rw`
# normal).
_podman_cap_measure_overlay_mount() {
  local cname_read="${_PODMAN_CAP_CONTAINER_PREFIX}-overlay-read"
  local cname_write="${_PODMAN_CAP_CONTAINER_PREFIX}-overlay-write"
  local hostdir="$_PODMAN_CAP_WORK/overlay-mount"
  local out_read out_write rc_read rc_write read_ok=0 write_ok=0 leaked=0
  _PODMAN_CAP_CONTAINERS+=("$cname_read")
  _PODMAN_CAP_CONTAINERS+=("$cname_write")

  mkdir -p "$hostdir"
  printf 'seed\n' > "$hostdir/seed.txt"

  out_read="$("$PODMAN" run --rm --network none -v "$hostdir:/w:O" \
        --name "$cname_read" "$_PODMAN_CAP_IMAGE" /bin/helper read /w/seed.txt 2>&1)"
  rc_read=$?
  if _podman_cap_is_podman_level_error "$rc_read"; then
    printf 'overlay_mount\terror\tpodman rc=%s (read): %s\n' "$rc_read" "${out_read:0:200}"
    return
  fi

  out_write="$("$PODMAN" run --rm --network none -v "$hostdir:/w:O" \
        --name "$cname_write" "$_PODMAN_CAP_IMAGE" /bin/helper write /w/leak.txt 2>&1)"
  rc_write=$?
  if _podman_cap_is_podman_level_error "$rc_write"; then
    printf 'overlay_mount\terror\tpodman rc=%s (write): %s\n' "$rc_write" "${out_write:0:200}"
    return
  fi

  [[ "$out_read" == *"read=ok"* ]] && read_ok=1
  [[ "$out_write" == *"write=ok"* ]] && write_ok=1
  [[ -e "$hostdir/leak.txt" ]] && leaked=1

  if [[ "$read_ok" -eq 1 && "$write_ok" -eq 1 && "$leaked" -eq 0 ]]; then
    printf 'overlay_mount\tefectivo\tlee del anfitrion, escribe dentro del contenedor, no filtra al anfitrion: %s | %s\n' \
      "$out_read" "$out_write"
  else
    printf 'overlay_mount\tno-efectivo\tread=%s write=%s filtrado=%s con montaje :O\n' \
      "$out_read" "$out_write" "$leaked"
  fi
}

# --- capacidad: exit_code_propagation ---
#
# El ayudante sale con `_PODMAN_CAP_EXIT_CODE`, un codigo no trivial y ajeno
# a las convenciones 125/126/127 de Podman. `efectivo` solo si `podman run`
# devuelve EXACTAMENTE ese codigo.
_podman_cap_measure_exit_code_propagation() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-exitcode" rc
  _PODMAN_CAP_CONTAINERS+=("$cname")
  "$PODMAN" run --rm --network none --name "$cname" \
    "$_PODMAN_CAP_IMAGE" /bin/helper exitcode "$_PODMAN_CAP_EXIT_CODE" \
    >"$_PODMAN_CAP_WORK/exitcode.out" 2>"$_PODMAN_CAP_WORK/exitcode.err"
  rc=$?
  if _podman_cap_is_podman_level_error "$rc"; then
    printf 'exit_code_propagation\terror\tpodman rc=%s: %s\n' "$rc" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/exitcode.err")"
  elif [[ "$rc" -eq "$_PODMAN_CAP_EXIT_CODE" ]]; then
    printf 'exit_code_propagation\tefectivo\tpodman run devolvio %s, igual al declarado por el ayudante\n' "$rc"
  else
    printf 'exit_code_propagation\tno-efectivo\tpodman run devolvio %s, esperaba %s\n' \
      "$rc" "$_PODMAN_CAP_EXIT_CODE"
  fi
}

# --- capacidad: signal_propagation ---
#
# El ayudante en modo 'sigterm' instala un manejador y espera hasta 3
# segundos. Se lanza detached, se le manda `podman kill --signal TERM`, y se
# mide DOS cosas: que el log del ayudante registre la senal recibida Y que
# el codigo de salida sea `_PODMAN_CAP_SIGTERM_EXIT_CODE` (no el 1 que el
# ayudante devuelve si se rindio esperando).
_podman_cap_measure_signal_propagation() {
  local cname="${_PODMAN_CAP_CONTAINER_PREFIX}-signal"
  local start_err logs rc
  _PODMAN_CAP_CONTAINERS+=("$cname")

  if ! "$PODMAN" run -d --network none --name "$cname" "$_PODMAN_CAP_IMAGE" \
       /bin/helper sigterm >/dev/null 2>"$_PODMAN_CAP_WORK/signal-start.err"; then
    start_err="$(head -c 200 "$_PODMAN_CAP_WORK/signal-start.err")"
    printf 'signal_propagation\terror\tno se pudo lanzar el contenedor: %s\n' "$start_err"
    return
  fi

  sleep 0.3
  if ! "$PODMAN" kill --signal TERM "$cname" >/dev/null 2>"$_PODMAN_CAP_WORK/signal-kill.err"; then
    printf 'signal_propagation\terror\t%s kill fallo: %s\n' "$PODMAN" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/signal-kill.err")"
    return
  fi

  rc="$("$PODMAN" wait "$cname" 2>"$_PODMAN_CAP_WORK/signal-wait.err")"
  if [[ -z "$rc" ]]; then
    printf 'signal_propagation\terror\t%s wait no devolvio codigo: %s\n' "$PODMAN" \
      "$(head -c 200 "$_PODMAN_CAP_WORK/signal-wait.err")"
    return
  fi
  logs="$("$PODMAN" logs "$cname" 2>/dev/null)"

  if [[ "$logs" == *"got_sigterm=1"* && "$rc" -eq "$_PODMAN_CAP_SIGTERM_EXIT_CODE" ]]; then
    printf 'signal_propagation\tefectivo\tel proceso registro SIGTERM y salio %s: %s\n' "$rc" "$logs"
  else
    printf 'signal_propagation\tno-efectivo\tlogs=%s exit=%s tras kill --signal TERM\n' "$logs" "$rc"
  fi
}

# --- capacidad: credential_injection ---
#
# Mide DOS candidatos de entrega: `--env NAME` (heredado del entorno del
# proceso que invoca `podman run`) y `--secret NAME,type=env,target=TARGET`
# (sobre `podman secret create`). Para cada uno: ¿el proceso vio el valor? ¿el
# valor aparece en `podman inspect`? `efectivo` solo si el candidato
# `--secret` entrega SIN exponer — el perfil de TypeScript usara ese
# mecanismo; si no cumpliera, el veredicto lo dice y el perfil de la seccion
# (b) rehusa declarar credencial en vez de exponerla en silencio.
_podman_cap_credential_probe() {
  local cname="$1"; shift
  local rc logs inspect_out
  "$PODMAN" run -d --network none --name "$cname" "$@" \
    "$_PODMAN_CAP_IMAGE" /bin/helper env "$_PODMAN_CAP_CREDENTIAL_TARGET" \
    >/dev/null 2>"$_PODMAN_CAP_WORK/cred-${cname}.err"
  rc=$?
  if [[ "$rc" -ne 0 ]]; then
    _PODMAN_CAP_CRED_ERROR="$(head -c 200 "$_PODMAN_CAP_WORK/cred-${cname}.err")"
    return 1
  fi
  "$PODMAN" wait "$cname" >/dev/null 2>&1
  logs="$("$PODMAN" logs "$cname" 2>/dev/null)"
  inspect_out="$("$PODMAN" inspect "$cname" 2>/dev/null)"
  _PODMAN_CAP_CRED_DELIVERED=0
  _PODMAN_CAP_CRED_LEAKED=0
  [[ "$logs" == *"env=${_PODMAN_CAP_CREDENTIAL_VALUE}"* ]] && _PODMAN_CAP_CRED_DELIVERED=1
  [[ "$inspect_out" == *"$_PODMAN_CAP_CREDENTIAL_VALUE"* ]] && _PODMAN_CAP_CRED_LEAKED=1
  return 0
}

_podman_cap_measure_credential_injection() {
  local cname_env="${_PODMAN_CAP_CONTAINER_PREFIX}-cred-env"
  local cname_secret="${_PODMAN_CAP_CONTAINER_PREFIX}-cred-secret"
  local env_delivered env_leaked secret_delivered secret_leaked
  local env_summary secret_summary create_err
  _PODMAN_CAP_CONTAINERS+=("$cname_env")
  _PODMAN_CAP_CONTAINERS+=("$cname_secret")

  # --- candidato 1: --env NAME, heredado del entorno de este proceso ---
  export "${_PODMAN_CAP_CREDENTIAL_TARGET}=${_PODMAN_CAP_CREDENTIAL_VALUE}"
  if ! _podman_cap_credential_probe "$cname_env" --env "$_PODMAN_CAP_CREDENTIAL_TARGET"; then
    unset "${_PODMAN_CAP_CREDENTIAL_TARGET}"
    printf 'credential_injection\terror\tno se pudo lanzar el candidato --env: %s\n' "$_PODMAN_CAP_CRED_ERROR"
    return
  fi
  unset "${_PODMAN_CAP_CREDENTIAL_TARGET}"
  env_delivered="$_PODMAN_CAP_CRED_DELIVERED"
  env_leaked="$_PODMAN_CAP_CRED_LEAKED"
  env_summary="--env: entregado=${env_delivered} en-inspect=${env_leaked}"

  # --- candidato 2: podman secret, type=env ---
  printf '%s' "$_PODMAN_CAP_CREDENTIAL_VALUE" \
    | "$PODMAN" secret create "$_PODMAN_CAP_SECRET_NAME" - \
      >/dev/null 2>"$_PODMAN_CAP_WORK/cred-secret-create.err"
  if [[ $? -ne 0 ]]; then
    create_err="$(head -c 200 "$_PODMAN_CAP_WORK/cred-secret-create.err")"
    printf 'credential_injection\terror\t%s secret create fallo: %s\n' "$PODMAN" "$create_err"
    return
  fi
  _PODMAN_CAP_SECRET_CREATED=1

  if ! _podman_cap_credential_probe "$cname_secret" \
       --secret "${_PODMAN_CAP_SECRET_NAME},type=env,target=${_PODMAN_CAP_CREDENTIAL_TARGET}"; then
    printf 'credential_injection\terror\tno se pudo lanzar el candidato --secret: %s\n' "$_PODMAN_CAP_CRED_ERROR"
    return
  fi
  secret_delivered="$_PODMAN_CAP_CRED_DELIVERED"
  secret_leaked="$_PODMAN_CAP_CRED_LEAKED"
  secret_summary="--secret: entregado=${secret_delivered} en-inspect=${secret_leaked}"

  if [[ "$secret_delivered" -eq 1 && "$secret_leaked" -eq 0 ]]; then
    printf 'credential_injection\tefectivo\t--secret entrega sin exponer en inspect (%s | %s)\n' \
      "$env_summary" "$secret_summary"
  else
    printf 'credential_injection\tno-efectivo\tningun candidato entrega sin exponer en inspect (%s | %s)\n' \
      "$env_summary" "$secret_summary"
  fi
}

_podman_cap_measure_run
_podman_cap_measure_pids_limit
_podman_cap_measure_memory_limit
_podman_cap_measure_cleanup
_podman_cap_measure_network_none
_podman_cap_measure_read_only_rootfs
_podman_cap_measure_cpu_limit
_podman_cap_measure_readonly_mount
_podman_cap_measure_overlay_mount
_podman_cap_measure_exit_code_propagation
_podman_cap_measure_signal_propagation
_podman_cap_measure_credential_injection

exit 0
