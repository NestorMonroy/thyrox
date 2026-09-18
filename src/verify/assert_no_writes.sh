#!/usr/bin/env bash
# ``assert_no_writes`` — verificar POR CONDUCTA que un comando no escribe.
#
# El unico instrumento que este arbol tenia para la pregunta «¿este guion
# escribe?» era el grep estatico que ``operaciones-de-archivo-con-bash.md``
# prescribe:
#
#     grep -nE "write_text|open\(.*['\"]w|\.write\(|mkdir|unlink" "$M"
#
# Ese grep mide el **significante** —que el literal aparezca en el fuente— y de
# ahi se concluye sobre el **significado**: que el comando escriba al correr.
# Es el sub-patron C de ``metrica-decide-la-conclusion.md``, y falla en las dos
# direcciones: un modulo que compone la ruta (``getattr(p, "write_" + "text")``)
# no tiene el literal, y uno que lo tiene dentro de una rama muerta nunca
# escribe. ERR-066 es el episodio: se invoco un modulo «para verificar que
# corria» y reescribio un registro de 469 lineas.
#
# Aqui la pregunta se responde ejecutando el comando bajo ``strace`` y leyendo
# lo que el nucleo vio, no lo que el fuente dice.
#
# Uso:  bash src/verify/assert_no_writes.sh [--allow RUTA]... -- <comando...>
#
#   exit 0 = no intento escribir
#   exit 1 = intento escribir, y las nombra
#   exit 2 = NO se pudo medir — no se emite conteo
#
# Los tres desenlaces son el contrato que ``check_veredicto_de_gate.py`` exige:
# quien colapsa «rehuso» con «midio y salio 0» publica un PASS sobre una
# medicion que nunca ocurrio.
#
# Metrica: INTENCION de escritura — aperturas cuyos flags declaran escritura
#   (``O_WRONLY``, ``O_RDWR``, ``O_CREAT``, ``O_TRUNC``, ``O_APPEND``) mas las
#   llamadas que mutan una ruta (``mkdir``, ``unlink``, ``rename``, ``rmdir``,
#   ``symlink``, ``link``, ``chmod``, ``chown``, ``truncate``, ``utimensat``,
#   ``mknod`` y sus variantes ``*at``). Un intento FALLIDO cuenta: la pregunta
#   es si lo intento, no si lo consiguio.
# Ciega a:
#   - los bytes efectivos — un ``O_RDWR`` que nunca llama ``write()`` cuenta
#     como escritura, porque ``-e trace=%file`` no ve ``write()``;
#   - ``ftruncate``/``fchmod``/``fchown`` sobre un descriptor ya abierto, que no
#     llevan ruta y por tanto no estan en la familia de archivo;
#   - la escritura que el comando delega a un servicio ya corriendo (un socket
#     a un demonio que escribe por el);
#   - una linea de traza partida por ``<unfinished ...>``, que ``-ff`` hace
#     improbable —un archivo por pid, sin entrelazado— pero no imposible si una
#     senal interrumpe la llamada.
#
# Sobre PYTHONDONTWRITEBYTECODE: el sujeto corre con esa variable puesta. NO es
# una excepcion de ruta sino un cambio DECLARADO de la conducta del sujeto —
# sin ella, todo sujeto de Python escribe ``__pycache__/*.pyc.NNNN`` y el
# instrumento publicaria un escritor por cada uno. Con ella puesta, cualquier
# cosa que AUN aterrice en ``__pycache__`` si aflora, que es lo que una
# excepcion de ruta habria tapado.
set -uo pipefail

_MUTADORAS='mkdir|mkdirat|unlink|unlinkat|rename|renameat|renameat2|rmdir|symlink|symlinkat|link|linkat|chmod|fchmodat|chown|fchownat|lchown|truncate|utimensat|utimes|mknod|mknodat'
_FLAGS_DE_ESCRITURA='O_WRONLY|O_RDWR|O_CREAT|O_TRUNC|O_APPEND'

# Las rutas exentas NO son una lista de conveniencia: cada una es un canal que
# el nucleo expone como archivo y que no persiste nada. Toda la que se anada
# aqui es una linea mas en «Ciega a».
_EXENTAS='^/dev/null$|^/dev/tty|^/dev/pts/|^/proc/|^/dev/urandom$|^/dev/random$'

rehusar() {
  printf 'assert_no_writes: NO se pudo medir — %s\n' "$1" >&2
  printf 'NO se emite conteo: un 0 aqui seria un verde falso.\n' >&2
  exit 2
}

permitidas=()
while [ $# -gt 0 ]; do
  case "$1" in
    --allow) [ $# -ge 2 ] || rehusar '--allow sin su ruta'; permitidas+=("$2"); shift 2 ;;
    --)      shift; break ;;
    -h|--help) sed -n '1,60p' "$0"; exit 0 ;;
    *)       break ;;
  esac
done
[ $# -gt 0 ] || rehusar 'no se paso ningun comando que medir'

command -v strace >/dev/null 2>&1 || rehusar 'strace no esta instalado'

traza_dir="$(mktemp -d "${TMPDIR:-/tmp}/assert-no-writes-XXXXXX")" \
  || rehusar 'no se pudo componer el directorio de traza'
trap 'rm -rf "$traza_dir"' EXIT
prefijo="$traza_dir/traza"

# `-ff` da un archivo por pid: sin el, `-f` entrelaza los hijos y parte las
# lineas en `<unfinished ...>`/`resumed`, que es justo lo que el analizador no
# sabe leer. El error de strace va a un archivo aparte para poder distinguir
# «el sujeto fallo» de «strace no pudo trazar».
err_strace="$traza_dir/strace.err"
PYTHONDONTWRITEBYTECODE=1 strace -ff -e trace=%file -o "$prefijo" -- "$@" \
  >"$traza_dir/subject.out" 2>"$err_strace"
subject_exit=$?

if grep -qiE 'ptrace|operation not permitted|PTRACE_' "$err_strace" 2>/dev/null \
   && ! ls "$prefijo".* >/dev/null 2>&1; then
  rehusar "strace no pudo trazar: $(head -1 "$err_strace")"
fi
ls "$prefijo".* >/dev/null 2>&1 || rehusar 'strace no produjo ninguna traza'

# El `execve` de arranque es el discriminador que separa «medi y no vi nada» de
# «strace emitio un archivo vacio». Sin el, un cero no es un resultado.
cat "$prefijo".* > "$traza_dir/todo.txt"
grep -q '^execve(' "$traza_dir/todo.txt" \
  || rehusar 'la traza no tiene su execve de arranque: no hubo ejecucion que medir'

lineas=$(wc -l < "$traza_dir/todo.txt")
procesos=$(ls "$prefijo".* | wc -l)

permitidas_re=''
if [ ${#permitidas[@]} -gt 0 ]; then
  permitidas_re="$(printf '%s\n' "${permitidas[@]}" \
                     | sed 's|[].[^$*\\/]|\\&|g' | paste -sd'|')"
fi

escrituras="$(awk -v mut="^($_MUTADORAS)\\\\(" \
                  -v esc="($_FLAGS_DE_ESCRITURA)" \
                  -v exentas="$_EXENTAS" \
                  -v permitidas="$permitidas_re" '
  # La ruta es la primera cadena entrecomillada de la linea. Para `renameat` y
  # `linkat` hay dos y se reporta la primera: nombrar el origen basta para que
  # el lector encuentre la llamada, y reportar las dos duplicaria el conteo.
  function ruta(l,   a) {
    if (match(l, /"[^"]*"/)) { a = substr(l, RSTART+1, RLENGTH-2); return a }
    return ""
  }
  function exenta(p) {
    if (p == "") return 1
    if (p ~ exentas) return 1
    if (permitidas != "" && p ~ permitidas) return 1
    return 0
  }
  /^(openat|open|creat)\(/ {
    p = ruta($0)
    if (exenta(p)) next
    # `creat` es escritura por definicion; las otras dos, solo si sus flags lo
    # declaran. Mirar el literal `O_WRONLY` en toda la linea seria mas simple y
    # daria un falso positivo cuando la RUTA contiene esa cadena.
    resto = $0; sub(/^[a-z]+\([^"]*"[^"]*"[,)]?/, "", resto)
    if ($0 ~ /^creat\(/ || resto ~ esc) {
      # Solo la corrida de flags: el resto de la linea trae el modo y el
      # resultado, que no dicen nada sobre la INTENCION y ensucian la columna.
      f = ""
      if (match(resto, /O_[A-Z_|O]+/)) f = substr(resto, RSTART, RLENGTH)
      split($0, c, "("); printf "%s\t%s\t%s\n", c[1], p, f
    }
    next
  }
  $0 ~ mut {
    p = ruta($0)
    if (exenta(p)) next
    split($0, c, "("); printf "%s\t%s\t%s\n", c[1], p, ""
  }
' "$traza_dir/todo.txt" | sort -u)"

n=0
[ -n "$escrituras" ] && n=$(printf '%s\n' "$escrituras" | wc -l)

if [ "$n" -gt 0 ]; then
  printf 'assert_no_writes: %d escritura(s) intentada(s) (alcance medido: %d linea(s) de traza, %d proceso(s); subject_exit=%d)\n' \
    "$n" "$lineas" "$procesos" "$subject_exit"
  printf '%s\n' "$escrituras" | while IFS=$'\t' read -r llamada ruta flags; do
    printf '  %-12s %s %s\n' "$llamada" "$ruta" "$flags"
  done
  exit 1
fi

printf 'assert_no_writes: OK — 0 escrituras (alcance medido: %d linea(s) de traza, %d proceso(s); subject_exit=%d)\n' \
  "$lineas" "$procesos" "$subject_exit"
exit 0
