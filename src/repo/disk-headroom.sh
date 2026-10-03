#!/bin/bash
# ¿Es `Avail` el techo real, o hay una reserva — y la alcanza quien llama?
#
# El hermano de `pack_headroom.py`, que se declara **ciega a** «los otros
# escritores del mismo sistema de archivos» y da por bueno el disco libre que
# `statvfs` publica. Este guion cubre esa mitad: de donde sale ese numero.
#
# Por que no es una pregunta ociosa
# ----------------------------------
#
# `df` publica `Avail` = blocks free_blocks **para un no privilegiado**. La
# diferencia con los bloques libres de verdad es la **reserva** del sistema de
# archivos, y esa diferencia puede ser enorme sin que nada lo diga: medido en
# este contenedor, 214.9 GiB de 252 GiB. Quien lea `Used 37G` sobre un disco
# de 252G y concluya «queda sitio de sobra» esta leyendo el numero equivocado.
#
# Y la reserva **no siempre es inalcanzable**. La regla completa, la del ext4:
#
#   1. tiene que existir — `f_bfree` contra `f_bavail` de `statvfs`;
#   2. si el montaje declara `resv_strict`, nadie la alcanza, ni root;
#   3. sin `resv_strict`, la alcanza quien cumpla UNA de tres:
#        a. su uid efectivo es el `resuid` del montaje,
#        b. alguno de sus grupos es el `resgid` del montaje,
#        c. tiene `CAP_SYS_RESOURCE` en su `CapEff` — el bit 24.
#
# `resuid`/`resgid` se leen de las options del montaje; si no figuran no se
# cuentan como via, aunque el ext4 tenga uno por defecto en el superbloque.
# Es la lectura conservadora: el techo publicado puede quedar corto, nunca
# largo. El uid y los grupos salen de `id`, o de `DISK_HEADROOM_UID` y
# `DISK_HEADROOM_GROUPS` (separados por espacios) para el control.
#
# Las salidas son cuatro, y por que
# ----------------------------------
#
# ``0`` SIN_RESERVA            `Avail` es el techo; no hay nada que declarar.
# ``1`` RESERVA_ALCANZABLE     el techo REAL es mayor que `Avail`.
# ``3`` RESERVA_INALCANZABLE   `Avail` es techo duro; esos bytes no vuelven.
# ``2`` rehusa                 no se pudo medir; **no se emite cifra**.
#
# Con `--ceiling-bytes` la salida es UN entero: el techo real segun el
# veredicto — `f_bfree` si la reserva es alcanzable, `f_bavail` si no la hay o
# no se alcanza — con el mismo codigo de salida. Con exit 2 no imprime nada.
#
# Un guion de dos salidas —«hay reserva / no hay»— no separa la 1 de la 3, que
# es justo la decision que hacia falta tomar. Un verdict que no discrimina es
# el sub-patron D de `metrica-decide-la-conclusion.md`.
#
# *Métrica:* `statvfs` sobre la target, las options de montaje de su mount_point de
# montaje, y el `CapEff` del proceso que llama.
# *Ciega a:* la reserva como valor del **superbloque** — `tune2fs -l` rehusa
# con «Operation not permitted» en un contenedor sin acceso al device, asi
# que la cifra de aqui es aritmetica sobre `statvfs`, no una lectura de
# `Reserved block count`; a las cuotas por usuario o por proyecto, que acotan
# por otra via; y a cuanto liberaria borrar algo, que solo se sabe borrando.

set -uo pipefail

REFUSAL=2

#: El bit de `CAP_SYS_RESOURCE` en el mapa de capacidades de Linux. Se declara
#: como constante para que el control pueda **anularla**: el caso que separa
#: RESERVA_ALCANZABLE de RESERVA_INALCANZABLE es el unico que la mide.
THYROX_TEST_BIT_RESOURCE=1
CAP_SYS_RESOURCE_BIT=24

target="."
format="text"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --path)   target="$2"; shift 2 ;;
        --brief)  format="brief"; shift ;;
        --ceiling-bytes) format="ceiling"; shift ;;
        -h|--help) awk 'NR > 1 && !/^#/ {exit} NR > 1' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) printf 'ERROR — opcion desconocida: %s\n' "$1" >&2; exit "$REFUSAL" ;;
    esac
done

refuse() {
    # Sin cifra: un cero aqui se leeria como «no hay reserva», que es otra
    # afirmacion. Rehusar y medir cero tienen que ser distinguibles.
    printf 'ERROR — %s; no se emite medicion.\n' "$1" >&2
    exit "$REFUSAL"
}

[[ -e "$target" ]] || refuse "«$target» no existe"

# --- los tres insumos, cada uno con su mount_point de inyeccion para el control ---

if [[ -n "${DISK_HEADROOM_STATFS:-}" ]]; then
    read -r blocks free_blocks avail_blocks block_size <<<"$DISK_HEADROOM_STATFS"
else
    read -r blocks free_blocks avail_blocks block_size \
        < <(stat -f -c '%b %f %a %S' "$target" 2>/dev/null) \
        || refuse "«$target» no admite statvfs"
fi
[[ -n "${block_size:-}" ]] || refuse "statvfs no devolvio los cuatro campos"

mounts_file="${DISK_HEADROOM_MOUNTS:-/proc/self/mounts}"
[[ -r "$mounts_file" ]] || refuse "no se puede leer «$mounts_file»"

status_file="${DISK_HEADROOM_STATUS:-/proc/self/status}"
[[ -r "$status_file" ]] || refuse "no se puede leer «$status_file»"

effective_uid="${DISK_HEADROOM_UID:-$(id -u)}"
[[ "$effective_uid" =~ ^[0-9]+$ ]] || refuse "el uid efectivo «$effective_uid» no es un entero"
group_ids="${DISK_HEADROOM_GROUPS:-$(id -G)}"
[[ "$group_ids" =~ ^[0-9]+( [0-9]+)*$ ]] || refuse "los grupos «$group_ids» no son enteros"

# --- mount_point de montaje, y sus options ---

mount_point="$(stat -c '%m' "$target" 2>/dev/null)"
[[ -n "$mount_point" ]] || mount_point="/"

# El montaje mas largo que sea prefijo de la target: `/` pierde ante `/home` si
# los dos coinciden. Se compara por campo, no por subcadena, para que `/home`
# no case con `/homework`.
options="$(awk -v p="$mount_point" '$2 == p {print $4; seen=1} END{if(!seen) print ""}' \
    "$mounts_file" | tail -1)"
if [[ -z "$options" ]]; then
    options="$(awk '$2 == "/" {print $4}' "$mounts_file" | tail -1)"
fi
device="$(awk -v p="$mount_point" '$2 == p {print $1}' "$mounts_file" | tail -1)"
[[ -n "$device" ]] || device="(desconocido)"

# --- la reserva, en bytes ---

reserved=$(( (free_blocks - avail_blocks) * block_size ))
capacity=$(( blocks * block_size ))
available=$(( avail_blocks * block_size ))

# --- ¿la alcanza quien llama? ---

strict=0
grep -qE '(^|,)resv_strict(,|$)' <<<"$options" && strict=1

# El valor numerico de una option `clave=N` del montaje; vacio si no figura.
mount_option_value() {
    grep -oE "(^|,)$1=[0-9]+" <<<"$options" | tail -1 | sed 's/.*=//'
}
reserve_uid="$(mount_option_value resuid)"
reserve_gid="$(mount_option_value resgid)"

# Via a: el uid efectivo es el dueno declarado de la reserva.
uid_owns_reserve() {
    [[ -n "$reserve_uid" && "$effective_uid" == "$reserve_uid" ]]
}

# Via b: alguno de los grupos es el grupo declarado de la reserva.
group_owns_reserve() {
    [[ -n "$reserve_gid" ]] && grep -qw -- "$reserve_gid" <<<"${group_ids// /$'\n'}"
}

has_bit=1
if [[ "$THYROX_TEST_BIT_RESOURCE" == "1" ]]; then
    has_bit="$(awk -v bit="$CAP_SYS_RESOURCE_BIT" '
        /^CapEff:/ {
            h = tolower($2)
            while (length(h) < 16) h = "0" h
            # El digit hexadecimal que contiene el bit, contado desde la
            # izquierda sobre 16 digitos = 64 bits.
            digit = 16 - int(bit / 4)
            value = index("0123456789abcdef", substr(h, digit, 1)) - 1
            print (int(value / (2 ^ (bit % 4))) % 2)
            found = 1
        }
        END { if (!found) print "?" }
    ' "$status_file")"
    [[ "$has_bit" == "0" || "$has_bit" == "1" ]] \
        || refuse "«$status_file» no declara CapEff"
fi

# --- borrados pero abiertos: la OTRA via por la que `Avail` miente ---
#
# TASK-THYROX-0219. Esta columna sumaba 220 archivos VIVOS y publicaba 385 MiB
# donde lo real eran 5. Tres defectos distintos, y cada uno exige su correccion:
#
#   1. `lsof` OREA sus selectores salvo con `-a`. `+L1 -- /` se lee como
#      «(nlink<1) O (abierto en /)», asi que devolvia TODO lo abierto bajo el
#      montaje. Medido: 221 filas, de las que 1 estaba borrada.
#   2. El espacio de un inodo borrado se libera UNA vez, no una por descriptor.
#      Sumar por fila cuenta tres veces un archivo con tres `fd` abiertos.
#   3. Un inodo borrado en OTRO dispositivo —un `memfd`, por ejemplo— no ocupa
#      este montaje, y restarlo de su `Avail` es afirmar un espacio que no existe.
#
# La cifra alimenta la decision «¿cierro descriptores para recuperar espacio?».
# Inflada manda a buscar descriptores que no existen — que es exactamente lo que
# costo el episodio que la destapo.

# El dispositivo tal y como lo imprime `lsof`: «major,minor» en decimal.
# La descomposicion es la de Linux, no `d>>8`/`d&0xff`: esa acierta con los
# numeros pequenos y falla en silencio con un major grande.
mount_dev="${DISK_HEADROOM_DEV:-}"
if [[ -z "$mount_dev" ]]; then
    _dev_num="$(stat -c '%d' "$mount_point" 2>/dev/null || true)"
    if [[ "$_dev_num" =~ ^[0-9]+$ ]]; then
        mount_dev="$(( ((_dev_num >> 8) & 0xfff) | ((_dev_num >> 32) & ~0xfff) )),$(( (_dev_num & 0xff) | ((_dev_num >> 12) & ~0xff) ))"
    fi
fi

# Suma el tamano de cada INODO borrado, una sola vez, en ESTE dispositivo.
# `(deleted)` hace que NAME ocupe dos campos, pero $1..$9 no se mueven: la clave
# de deduplicacion `$6":"$9` (dispositivo + inodo) y el centinela `$NF` son
# estables en las dos formas.
_sum_deleted_open() {
    awk -v dev="${1:-}" '
        NR > 1 && $NF == "(deleted)" && $7 ~ /^[0-9]+$/ {
            if (dev != "" && $6 != dev) next     # correccion 3: otro dispositivo
            if (seen[$6 ":" $9]++) next          # correccion 2: una vez por inodo
            s += $7
        }
        END { printf "%.2f MiB", s / 1048576 }
    '
}

held_by_open_fd="(no medido)"
if [[ "$format" != "text" ]]; then
    # Las salidas breves no publican esta columna: no se paga el `lsof`.
    :
elif [[ -n "${DISK_HEADROOM_LSOF:-}" ]]; then
    # Punto de inyeccion: sin el, esta rama solo se alcanza midiendo el disco
    # real, y por eso sus tres defectos vivieron sin una sola asercion encima.
    held_by_open_fd="$(_sum_deleted_open "$mount_dev" < "${DISK_HEADROOM_LSOF}")"
elif command -v lsof >/dev/null 2>&1 && [[ -z "${DISK_HEADROOM_STATFS:-}" ]]; then
    # `-a` convierte el OR en AND: correccion 1.
    held_by_open_fd="$(timeout 30 lsof -a +L1 -- "$mount_point" 2>/dev/null \
        | _sum_deleted_open "$mount_dev")"
    [[ -n "$held_by_open_fd" ]] || held_by_open_fd="0.00 MiB"
fi

# --- verdict ---

if (( reserved <= 0 )); then
    verdict="SIN_RESERVA"; code=0
    reason="no hay blocks reservados: «Avail» es el techo."
elif (( strict == 1 )); then
    verdict="RESERVA_INALCANZABLE"; code=3
    reason="el montaje declara resv_strict, que cierra la reserva incluso a root."
elif uid_owns_reserve; then
    verdict="RESERVA_ALCANZABLE"; code=1
    reason="el uid efectivo $effective_uid es resuid y no hay resv_strict: el techo real supera «Avail»."
elif group_owns_reserve; then
    verdict="RESERVA_ALCANZABLE"; code=1
    reason="el grupo $reserve_gid es resgid del montaje y del proceso, y no hay resv_strict: el techo real supera «Avail»."
elif [[ "$has_bit" == "0" ]]; then
    verdict="RESERVA_INALCANZABLE"; code=3
    reason="a CapEff le falta CAP_SYS_RESOURCE (bit $CAP_SYS_RESOURCE_BIT)."
else
    verdict="RESERVA_ALCANZABLE"; code=1
    reason="hay CAP_SYS_RESOURCE y no hay resv_strict: el techo real supera «Avail»."
fi

as_mib() { awk -v b="$1" 'BEGIN{printf "%.2f MiB", b/1048576}'; }
as_gib() { awk -v b="$1" 'BEGIN{printf "%.2f GiB", b/1073741824}'; }

if [[ "$format" == "brief" ]]; then
    printf '%s\n' "$verdict"
    exit "$code"
fi

if [[ "$format" == "ceiling" ]]; then
    ceiling="$available"
    (( code == 1 )) && ceiling=$(( free_blocks * block_size ))
    printf '%s\n' "$ceiling"
    exit "$code"
fi

printf 'target              %s   (montaje %s, %s)\n' "$target" "$mount_point" "$device"
printf 'capacidad         %s\n' "$(as_gib "$capacity")"
printf 'disponible        %s   ← lo que «df» llama Avail\n' "$(as_mib "$available")"
printf 'reserved           %s   (%.1f%% de la capacidad)\n' "$(as_gib "$reserved")" \
    "$(awk -v r="$reserved" -v t="$capacity" 'BEGIN{printf "%.4f", (t>0)?100*r/t:0}')"
printf 'options          %s\n' "${options:-(ninguna)}"
printf 'CAP_SYS_RESOURCE  %s\n' \
    "$([[ "$has_bit" == "1" ]] && echo presente || echo AUSENTE)"
printf 'borrado y abierto %s   (espacio que no vuelve hasta cerrar el descriptor)\n' \
    "$held_by_open_fd"
printf 'VEREDICTO         %s\n' "$verdict"
printf '  %s\n' "$reason"
exit "$code"
