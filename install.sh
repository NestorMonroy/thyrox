#!/usr/bin/env bash
# thyrox/install.sh — declara, en un repo consumidor, dónde vive thyrox.
#
# Qué instala, y qué NO
# ---------------------
# No descarga, no compila, no copia un árbol. thyrox ya está en disco cuando
# este guion corre: lo único que le falta al consumidor es **saber dónde**, y
# eso es una línea en su archivo de entorno. La forma medida de la cita hoy es
# una ruta absoluta escrita a mano en el documento que la usa; tras instalar,
# esa ruta la aporta el entorno.
#
# Procedencia del porte — tres referencias, leídas en sólo lectura
# ----------------------------------------------------------------
#   claude-code-nestor-monroy-tools/install.sh
#     De ahí: `set -euo pipefail`; el override de entorno ANTES del default
#     derivado; el aviso —no fatal— cuando algo opcional falta.
#     NO se porta: descarga, detección de plataforma, verificación sha256 de
#     un binario, retención de versiones. Ninguno tiene sujeto aquí.
#
#   nestormonroy/claw-code/install.sh
#     De ahí: el directorio del propio guion como única derivación estructural
#     válida de la raíz; la verificación posterior que EJERCITA lo instalado en
#     vez de comprobar que el archivo existe; y el bloque de remedios por
#     causa, que es lo que convierte una negativa en algo accionable.
#     Es además la referencia más cercana por una razón estructural: tampoco
#     instala nada en el hogar del usuario — deja su artefacto dentro del repo.
#
#   nestormonroy/openswarm/{swarm.py,run_utils.py}
#     De ahí: la precedencia en dos pasos —override explícito, después
#     derivación— de `_openswarm_state_root`; y la razón por la que el lector
#     del archivo de entorno no depende de una librería de terceros, que su
#     propio comentario declara verbatim: *«Bootstrap may install python-dotenv,
#     so preserve this one override with stdlib»*. Aquí eso ya está resuelto en
#     `src/paths/reach.py`, que analiza el archivo con la biblioteca estándar.
#
# Por qué no hay hogar de usuario
# --------------------------------
# Es una decisión, no un olvido. Un producto puede ser configurable sin
# instalarse bajo `~`: `claw-code` deja su artefacto en el repo, y `litellm`
# declara toda su configuración por entorno sin derivar hogar en ninguno de
# sus puntos de entrada. La decisión de este árbol ya estaba tomada al
# declarar la raíz como variable con respaldo por ascenso.
#
# Uso
# ---
#   ./install.sh                      instala en las raíces que el alcance resuelva
#   ./install.sh <ruta>...            instala sólo en las rutas dadas
#   ./install.sh --check [<ruta>...]  no escribe; exit 1 si falta declarar
#   ./install.sh --dry-run [<ruta>...] imprime lo que escribiría
#   ./install.sh --help
#
# Variables
#   THYROX_ROOT   la raíz de thyrox. Si no se declara, se deriva del
#                 directorio de este guion — que vive en la raíz, y por eso
#                 es la derivación válida y no una conveniencia.

set -uo pipefail

# --------------------------------------------------------------------------
# Impresión. El bloque de color usa sólo builtins cuando `tput` no está
# alcanzable: este guion tiene que poder rehusar con un PATH roto, que es
# exactamente el primer caso que su control ejercita.
# --------------------------------------------------------------------------

if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
    C_RESET="$(tput sgr0)"; C_BOLD="$(tput bold)"; C_DIM="$(tput dim)"
    C_RED="$(tput setaf 1)"; C_GREEN="$(tput setaf 2)"; C_YELLOW="$(tput setaf 3)"
else
    C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""
fi

info() { printf '  %s\n' "$1"; }
ok()   { printf '%s  ok%s %s\n' "$C_GREEN" "$C_RESET" "$1"; }
warn() { printf '%s  aviso%s %s\n' "$C_YELLOW" "$C_RESET" "$1" >&2; }

# Una negativa nombra la pieza que falta Y su remedio. Es el paso del flujo
# abstracto de carga que sólo una de las cuatro referencias ejercita, y es lo
# que separa «falló» de «esto es lo que hay que hacer».
fatal() {
    printf '%s  error%s %s\n' "$C_RED" "$C_RESET" "$1" >&2
    if [ "$#" -gt 1 ]; then
        printf '%s  remedio:%s %s\n' "$C_BOLD" "$C_RESET" "$2" >&2
    fi
    exit 1
}

# --------------------------------------------------------------------------
# Paso 1 — las fuentes de la raíz, COMO LISTA ORDENADA
#
# El orden es el contrato, y por eso se declara como una lista y no como una
# cadena de `if`: en una cadena la precedencia hay que reconstruirla leyendo
# el flujo de control, que es justo el defecto medido en `litellm`, donde el
# orden de asignación contradice el orden efectivo.
# --------------------------------------------------------------------------

ROOT_SOURCES=(
    "variable THYROX_ROOT del proceso"
    "declaracion THYROX_ROOT del archivo de entorno"
    "ascenso por marcador desde el directorio de este guion"
)

ENV_FILE_NAME=".env"
ROOT_KEY="THYROX_ROOT"

# El marcador se declara UNA vez: es a la vez lo que el ascenso busca y lo que
# el paso 4 exige. Escribirlo dos veces daria dos definiciones de "esto es
# thyrox" que nadie sincroniza — el mismo defecto que este guion ya evita con
# el analizador del archivo de entorno.
MARKER_REL="src/paths/reach.py"

# El destino de la declaración tiene su PROPIA lista ordenada, y es la segunda
# entrada de entorno. La forma la fija la referencia: un producto configurable
# expone dos entradas, una que lleva el VALOR y otra que lleva la RUTA DEL
# ARCHIVO que lo declara —
#
#   litellm: worker_config   = get_secret("WORKER_CONFIG")        <- el valor
#            env_config_yaml = get_secret_str("CONFIG_FILE_PATH") <- la ruta
#
# Aquí son `THYROX_ROOT` (el valor) y `THYROX_ENV_FILE` (la ruta). La segunda
# NO es decoración: el mecanismo de alcance la honra al leer, así que un
# instalador que la ignorara escribiría en un archivo que el lector no mira —
# y las dos mitades quedarían verdes por separado sin que nada funcionara.
ENV_FILE_VAR="THYROX_ENV_FILE"

ENV_FILE_SOURCES=(
    "variable THYROX_ENV_FILE del proceso"
    "el .env de cada destino"
)

# --------------------------------------------------------------------------
# Argumentos
# --------------------------------------------------------------------------

MODE="install"
TARGETS=()

print_usage() {
    printf '%s' "$C_DIM"
    cat <<'USAGE'
Uso: ./install.sh [opciones] [<ruta-del-consumidor>...]

  Sin rutas, se instala en las raíces que el alcance resuelva.

Opciones:
  --check      No escribe. Exit 1 si alguna raíz no declara la ruta correcta.
  --dry-run    Imprime lo que escribiría, sin escribir.
  -h, --help   Esta ayuda.

Variables:
  THYROX_ROOT  La raíz de thyrox. Sin ella se deriva del directorio del guion.
USAGE
    printf '%s' "$C_RESET"
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --check)   MODE="check" ;;
        --dry-run) MODE="dry-run" ;;
        -h|--help) print_usage; exit 0 ;;
        -*)        fatal "argumento desconocido: $1" "corre ./install.sh --help" ;;
        *)         TARGETS+=("$1") ;;
    esac
    shift
done

# --------------------------------------------------------------------------
# Paso 2 — verificar el intérprete ANTES que nada
#
# Va primero porque es la precondición de todo lo demás: el mecanismo de
# alcance es Python, y sin intérprete no hay forma de resolver una raíz ni de
# leer un archivo de entorno. Se comprueba sólo con builtins, para que la
# negativa siga siendo legible con un PATH roto.
# --------------------------------------------------------------------------

if ! command -v python3 >/dev/null 2>&1; then
    fatal "no encuentro python3 en PATH — es la precondición del canal consumidor" \
          "instálalo (Debian/Ubuntu: sudo apt-get install -y python3) o corrige PATH"
fi

# --------------------------------------------------------------------------
# Paso 3 — resolver la raíz por la lista ordenada del paso 1
# --------------------------------------------------------------------------

ROOT_ORIGIN=""

# El directorio del guion se deriva SIEMPRE, y primero: es lo que da acceso a
# un lector de archivos de entorno antes de saber cual es la raiz definitiva.
case "$0" in
    */*) SCRIPT_DIR="$(cd "${0%/*}" 2>/dev/null && pwd)" ;;
    *)   SCRIPT_DIR="$(pwd)" ;;
esac

# La CARGA del archivo de entorno se delega al mecanismo de alcance, que ya lo
# analiza con la biblioteca estandar y honra `THYROX_ENV_FILE`. Escribir aqui
# un segundo analizador en bash daria dos lectores del mismo archivo que nadie
# sincroniza: discreparian en silencio, que es el modo de fallo caro.
# `SCRIPT_DIR` NO es la raiz: es donde vive el guion, que coincide con la raiz
# solo mientras nadie lo mueva. Es aritmetica de ruta con offset cero — la
# misma clase que `parents[N]` (H-DOCS-1103), y falla igual de silenciosa.
#
# El ascenso por marcador es el bootstrap, y es lo UNICO que no se puede
# delegar: hay que hallar el lector antes de poder llamarlo. Todo lo demas
# —el orden de precedencia, el archivo de entorno— sigue delegado.
ascend_to_marker() {
    local dir="$1"
    while :; do
        if [ -f "$dir/$MARKER_REL" ]; then
            printf '%s' "$dir"
            return 0
        fi
        case "$dir" in
            /|"") return 1 ;;
        esac
        dir="$(cd "$dir/.." 2>/dev/null && pwd)" || return 1
    done
}

load_root_from_env_file() {
    local reader="$1/src/paths/reach.py"
    [ -f "$reader" ] || return 0
    # `--env` NO sirve aqui: emite las variables por raiz, nunca THYROX_ROOT.
    # Se llama a `env_value`, que es la funcion que el propio lector usa para
    # resolver una clave — proceso primero, archivo despues, honrando
    # THYROX_ENV_FILE. Delegar en ella es lo que impide un segundo analizador.
    python3 -c 'import importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("reach", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
valor = mod.env_value(sys.argv[2], pathlib.Path.cwd())
print(valor or "", end="")' "$reader" "$ROOT_KEY" 2>/dev/null
}

if [ -n "${THYROX_ROOT:-}" ]; then
    ROOT="$THYROX_ROOT"
    ROOT_ORIGIN="${ROOT_SOURCES[0]}"
else
    # El ascenso primero: sin el, un guion movido no encuentra ni el lector,
    # asi que la fuente 2 (el archivo de entorno) tampoco seria alcanzable.
    ASCENDED="$(ascend_to_marker "$SCRIPT_DIR" || true)"
    FROM_FILE="$(load_root_from_env_file "${ASCENDED:-$SCRIPT_DIR}")"
    if [ -n "$FROM_FILE" ]; then
        ROOT="$FROM_FILE"
        ROOT_ORIGIN="${ROOT_SOURCES[1]}"
    else
        # Sin marcador arriba, ROOT queda en SCRIPT_DIR a proposito: el paso 4
        # falla nombrando la pieza que falta, que es mas informativo que un
        # "no pude resolver" sin sujeto.
        ROOT="${ASCENDED:-$SCRIPT_DIR}"
        ROOT_ORIGIN="${ROOT_SOURCES[2]}"
    fi
fi

[ -n "$ROOT" ] || fatal "no pude resolver la raíz de thyrox" \
    "declara THYROX_ROOT=/ruta/a/thyrox e inténtalo de nuevo"

# Normalizar a absoluta: lo que se escribe en el consumidor tiene que resolver
# desde cualquier directorio de trabajo, no sólo desde donde se instaló.
ROOT="$(cd "$ROOT" 2>/dev/null && pwd)" \
    || fatal "la raíz declarada no es un directorio alcanzable: ${THYROX_ROOT:-$ROOT}" \
             "corrige THYROX_ROOT o corre el guion desde la raíz de thyrox"

# --------------------------------------------------------------------------
# Paso 4 — verificar que esa raíz ES thyrox
#
# El discriminador es el mecanismo de alcance, no que el directorio exista: un
# `test -d` sobre una ruta que acaban de darnos no puede fallar de forma
# informativa. Éste sí — falla exactamente cuando la raíz apunta a otra cosa.
# --------------------------------------------------------------------------

REACH="$ROOT/$MARKER_REL"
[ -f "$REACH" ] || fatal \
    "la raíz $ROOT no contiene $MARKER_REL — no parece ser thyrox ($ROOT_ORIGIN)" \
    "declara THYROX_ROOT apuntando a la raíz del árbol de thyrox"

# --------------------------------------------------------------------------
# Paso 5 — los destinos: los dados, o los que el alcance resuelva
#
# La resolución se DELEGA. Reimplementar aquí la cadena entorno -> archivo ->
# ascenso daría una segunda fuente de verdad que nadie sincroniza, que es el
# defecto que este árbol ya pagó dos veces.
# --------------------------------------------------------------------------

if [ "${#TARGETS[@]}" -eq 0 ]; then
    RESOLVED="$(python3 "$REACH" --paths 2>&1)" || fatal \
        "el mecanismo de alcance no pudo resolver ninguna raíz:
$RESOLVED" \
        "pasa las rutas de forma explícita: ./install.sh /ruta/al/consumidor"
    while IFS= read -r line; do
        [ -n "$line" ] && TARGETS+=("$line")
    done <<< "$RESOLVED"
fi

[ "${#TARGETS[@]}" -gt 0 ] || fatal "no hay ningún destino que instalar" \
    "pasa una ruta: ./install.sh /ruta/al/consumidor"

# --------------------------------------------------------------------------
# Composición — la declaración en el archivo de entorno del consumidor
# --------------------------------------------------------------------------

# El archivo que gobierna para un destino, por la lista ordenada de arriba.
# Cuando `THYROX_ENV_FILE` está declarada gana para TODOS los destinos, porque
# es un archivo y no un patrón — que es exactamente lo que el lector hace.
env_file_for() {
    if [ -n "${THYROX_ENV_FILE:-}" ]; then
        printf '%s' "$THYROX_ENV_FILE"
    else
        printf '%s' "$1/$ENV_FILE_NAME"
    fi
}

# El valor declarado hoy, o vacío. Se lee con el mismo criterio con que el
# mecanismo de alcance lo leerá después: la clave al principio de línea.
current_value() {
    local env_file="$1" line
    [ -f "$env_file" ] || return 0
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            "$ROOT_KEY="*) printf '%s' "${line#"$ROOT_KEY="}"; return 0 ;;
        esac
    done < "$env_file"
}

# Escribe la declaración preservando todo lo demás. Sustituye la clave si ya
# estaba —para no dejar dos declaraciones de la misma cosa, que es una
# ambigüedad que el lector resolvería en silencio— y la añade si no.
write_declaration() {
    local env_file="$1" line found=0 out=""
    if [ -f "$env_file" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            case "$line" in
                "$ROOT_KEY="*) found=1; out="$out$ROOT_KEY=$ROOT"$'\n' ;;
                *)             out="$out$line"$'\n' ;;
            esac
        done < "$env_file"
    fi
    [ "$found" -eq 0 ] && out="$out$ROOT_KEY=$ROOT"$'\n'
    # Escritura y renombre: un archivo de entorno a medio escribir deja al
    # consumidor sin poder resolver nada.
    printf '%s' "$out" > "$env_file.thyrox-tmp.$$" \
        && mv -f "$env_file.thyrox-tmp.$$" "$env_file"
}

printf '\n%sthyrox%s  raíz: %s  %s(%s)%s\n' \
    "$C_BOLD" "$C_RESET" "$ROOT" "$C_DIM" "$ROOT_ORIGIN" "$C_RESET"
printf '%s        modo: %s · destinos: %d%s\n' \
    "$C_DIM" "$MODE" "${#TARGETS[@]}" "$C_RESET"
if [ -n "${THYROX_ENV_FILE:-}" ]; then
    printf '%s        archivo: %s  (%s)%s\n' \
        "$C_DIM" "$THYROX_ENV_FILE" "${ENV_FILE_SOURCES[0]}" "$C_RESET"
fi
printf '\n'

PENDING=0

for target in "${TARGETS[@]}"; do
    # Un destino se verifica por lo que tiene que SER —un repo— no por que la
    # ruta exista. Los dos fallos se distinguen porque tienen remedios
    # distintos: uno es una ruta equivocada, el otro un clon sin inicializar.
    [ -d "$target" ] || fatal \
        "el destino no existe: $target" \
        "verifica la ruta, o clona el repo antes de instalar"

    [ -d "$target/.git" ] || git -C "$target" rev-parse --git-dir >/dev/null 2>&1 || fatal \
        "el destino no es un repositorio git: $target" \
        "un consumidor de thyrox es un repo; inicialízalo o corrige la ruta"

    env_file="$(env_file_for "$target")"
    declared="$(current_value "$env_file")"

    if [ "$declared" = "$ROOT" ]; then
        ok "$target — ya declarado"
        continue
    fi

    PENDING=$((PENDING + 1))

    case "$MODE" in
        check)
            if [ -z "$declared" ]; then
                warn "$target — sin declarar"
            else
                warn "$target — declara otra raíz: $declared"
            fi
            ;;
        dry-run)
            info "$target — escribiría $ROOT_KEY=$ROOT en $ENV_FILE_NAME"
            ;;
        install)
            write_declaration "$env_file" || fatal \
                "no pude escribir en $env_file" \
                "revisa los permisos del destino"
            # Verificación posterior que EJERCITA lo escrito, en vez de
            # comprobar que el archivo existe: se relee con el mismo lector.
            if [ "$(current_value "$env_file")" = "$ROOT" ]; then
                ok "$target — declarado"
                PENDING=$((PENDING - 1))
            else
                fatal "escribí en $env_file y la relectura no devuelve la raíz" \
                      "inspecciona el archivo a mano: hay otra declaración ganando"
            fi
            ;;
    esac
done

# --------------------------------------------------------------------------
# Lo opcional avisa, no rehúsa. Medido sobre los documentos del consumidor que
# citan este árbol: la forma de invocación es siempre el intérprete de Python;
# la toolchain de TypeScript es de desarrollo del propio thyrox, y su ausencia
# no impide que un consumidor lo use.
# --------------------------------------------------------------------------

if [ "$MODE" = "install" ] && ! command -v bun >/dev/null 2>&1; then
    warn "bun no está en PATH — el canal consumidor no lo necesita, pero sin él no corren los tests de TypeScript de thyrox"
fi

printf '\n'

if [ "$MODE" = "check" ]; then
    if [ "$PENDING" -eq 0 ]; then
        ok "las $(( ${#TARGETS[@]} )) raíces declaran $ROOT_KEY=$ROOT"
        exit 0
    fi
    printf '%s  %d de %d sin declarar%s\n' "$C_YELLOW" "$PENDING" "${#TARGETS[@]}" "$C_RESET" >&2
    printf '  corre ./install.sh sin --check para declararlas\n' >&2
    exit 1
fi

if [ "$MODE" = "dry-run" ]; then
    info "nada escrito (--dry-run)"
    exit 0
fi

cat <<EOF
${C_GREEN}thyrox declarado en ${#TARGETS[@]} raíz(es).${C_RESET}

Desde ahora un consumidor invoca sin codificar la ruta:

  ${C_DIM}# leyendo la declaración de su propio $ENV_FILE_NAME${C_DIM}
  ${C_RESET}python3 "\$$ROOT_KEY/src/task/task_ids.py"${C_RESET}

Para comprobarlo en cualquier momento:

  ${C_RESET}./install.sh --check${C_RESET}
EOF
