#!/usr/bin/env bash
#
# --- USAGE-START ---  (centinela de usage(); no retirar)
# instalar-config-usuario.sh -- Copia la configuracion de este repo al scope
# de usuario del cliente (`~/.claude/`), con la forma de
# `agency-agents/scripts/install.sh`: copiar por omision, enlazar bajo
# demanda, y un destino con precedencia declarada.
#
# Uso:
#   bash .claude/scripts/session/instalar-config-usuario.sh [opciones]
#
# Clases (se componen; vacio = todas):
#   --class <a,b>     Solo estas clases
#   --list            Publica la lista explicita y sale sin escribir
#
# Modo:
#   --link            Enlace simbolico en vez de copia
#   --dry-run         Imprime el plan y sale sin escribir
#   --force           Sobreescribe una colision de contenido distinto
#   --decline         Registra que NO se instala, y no se vuelve a preguntar
#   --print-dest      Imprime el destino resuelto y sale
#
# Destino (precedencia): --path > $CLAUDE_CONFIG_DIR > ~/.claude
#   --path <dir>      Destino explicito
# --- USAGE-END ---
#
# Por que existe: un clon nuevo no recibe nada. Su `.claude/` versionado lo
# lee el cliente como *projectSettings* contra el cwd de la sesion, que en
# sesion multi-repo es el PADRE de los clones (H-DOCS-198). El scope de
# usuario es el otro camino, y estaba vacio de lo nuestro: medido en
# :ref:`h-docs-469`, los cuatro guiones de `~/.claude/` son del cliente, y el
# unico que parecia nuestro lo parecia por el nombre.
#
# El enlace NO es una opcion por omision, y no por gusto: el cliente rechaza
# un DIRECTORIO enlazado (:ref:`h-docs-294`). `--link` enlaza archivo a
# archivo, que es lo que si acepta.
set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2
ORIGEN="$RAIZ/.claude"

# --- la lista explicita ------------------------------------------------------
# H-DOCS-469 (a): el copiador declara QUE copia, por lista, no por barrido de
# lo que haya. La tercera columna es el dato que evita la premisa falsa: no
# toda clase tiene un lector que la descubra en `~/.claude/`.
#
# Medido sobre `_references/claude-code-bin/2.1.246/claude_strings.txt` (lineas que
# contienen el literal, no ocurrencias): `.claude/rules` 9 · `.claude/agents`
# 20 · `.claude/commands` 8 · `.claude/hooks` **0**. Los hooks no se descubren
# por directorio: los declara `settings.json` con la ruta del comando, y por
# eso su fila dice «via settings».
#   Ciega a: una ruta que el cliente COMPONGA en vez de literalizar. El 0 de
#   `.claude/hooks` acota lo que se puede afirmar del volcado, no del cliente.
CLASES=(
    "rules:reglas siempre-cargadas:descubierta por el cliente"
    "agents:subagentes despachables:descubierta por el cliente"
    "commands:comandos de barra:descubierta por el cliente"
    "skills:skills bajo demanda:descubierta por el cliente"
    "hooks:guiones de evento:via settings — no hay lector de directorio"
    "scripts:gates y utilidades:los invoca un hook por ruta"
)

USE_LINK=false; DRY_RUN=false; FORCE=false; SOLO_LISTA=false
DECLINE=false; SOLO_DEST=false
OVERRIDE_PATH=""; PEDIDAS=""

# El marcador de decision. Vive en el DESTINO y no en el repositorio porque
# la decision es de quien clona, no del proyecto: dos clones en la misma
# maquina comparten `~/.claude` y por tanto comparten la respuesta.
MARCADOR=".kaupamex-arranque"

usage() { sed -n '/^# --- USAGE-START ---/,/^# --- USAGE-END ---/p' "$0" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --link)     USE_LINK=true; shift ;;
        --dry-run)  DRY_RUN=true; shift ;;
        --force)    FORCE=true; shift ;;
        --list)     SOLO_LISTA=true; shift ;;
        --decline)  DECLINE=true; shift ;;
        --print-dest) SOLO_DEST=true; shift ;;
        --class)    PEDIDAS="${2:-}"; shift 2 ;;
        --path)     OVERRIDE_PATH="${2:-}"; shift 2 ;;
        -h|--help)  usage; exit 0 ;;
        *) echo "opcion desconocida: $1" >&2; usage >&2; exit 2 ;;
    esac
done

# resolve_dest — --path > $CLAUDE_CONFIG_DIR > ~/.claude
resolve_dest() {
    if [[ -n "$OVERRIDE_PATH" ]]; then printf '%s' "$OVERRIDE_PATH"
    elif [[ -n "${CLAUDE_CONFIG_DIR:-}" ]]; then printf '%s' "$CLAUDE_CONFIG_DIR"
    else printf '%s' "$HOME/.claude"; fi
}
DEST="$(resolve_dest)"

# `--print-dest` existe para que el aviso de primer encuentro no reimplemente la
# precedencia: hay UN resolutor, y quien lo necesite lo pregunta.
$SOLO_DEST && { printf '%s\n' "$DEST"; exit 0; }

# marcar <decision> — deja constancia de que la pregunta ya se respondio.
marcar() {
    mkdir -p "$DEST" 2>/dev/null || return 0
    printf '%s %s %s\n' "$1" "$(date -u +%Y-%m-%dT%H:%M:%S)" "$ORIGEN" \
        > "$DEST/$MARCADOR" 2>/dev/null || true
}

if $DECLINE; then
    marcar declinado
    echo "instalar-config-usuario: declinado — no se escribe nada en $DEST"
    exit 0
fi

# install_file <origen> <destino> — copia, o enlaza con --link.
install_file() {
    if $USE_LINK; then ln -sfn "$1" "$2"; else cp -p "$1" "$2"; fi
}

seleccionadas() {
    local fila nombre
    for fila in "${CLASES[@]}"; do
        nombre="${fila%%:*}"
        [[ -z "$PEDIDAS" ]] && { printf '%s\n' "$nombre"; continue; }
        [[ ",$PEDIDAS," == *",$nombre,"* ]] && printf '%s\n' "$nombre"
    done
}

if $SOLO_LISTA; then
    echo "Origen:  $ORIGEN"
    echo "Destino: $DEST   (precedencia: --path > \$CLAUDE_CONFIG_DIR > ~/.claude)"
    echo ""
    echo "Clases declaradas:"
    for fila in "${CLASES[@]}"; do
        n="${fila%%:*}"; resto="${fila#*:}"
        printf '  %-9s %-28s %s\n' "$n" "${resto%%:*}" "${resto#*:}"
    done
    exit 0
fi

# --- el pase ----------------------------------------------------------------
# Precondicion, y es la que faltaba: si NINGUNA clase pedida existe en el
# origen, el pase no midio nada — y publicar «0 archivo(s)» con exit 0 se lee
# como «ya estaba al dia». Es el sub-patron D: un veredicto que no distingue
# «no habia que copiar» de «no pude mirar». Ocurrio: con la raiz mal anclada el
# origen era `/home/user/.claude`, las seis clases faltaban, y el instalador
# devolvia exito habiendo copiado nada.
presentes=0
for clase in $(seleccionadas); do [[ -d "$ORIGEN/$clase" ]] && presentes=$((presentes+1)); done
if [[ "$presentes" -eq 0 ]]; then
    echo "instalar-config-usuario: NINGUNA clase pedida existe bajo $ORIGEN." >&2
    echo "  NO se emite un conteo: un 0 aqui seria un verde falso." >&2
    exit 2
fi

copiados=0; saltados=0; colisiones=0; vistos=0
for clase in $(seleccionadas); do
    src="$ORIGEN/$clase"
    [[ -d "$src" ]] || { echo "aviso: $clase no existe en el origen — se omite" >&2; continue; }
    while IFS= read -r rel; do
        vistos=$((vistos+1))
        o="$src/$rel"; d="$DEST/$clase/$rel"
        # H-DOCS-469 (b): una colision de NOMBRE con contenido distinto no se
        # sobreescribe. El nombre compartido no prueba procedencia compartida
        # — es justo el error que el episodio registro.
        if [[ -e "$d" && ! -L "$d" ]] && ! cmp -s "$o" "$d"; then
            if $FORCE; then :; else
                echo "COLISION: $clase/$rel ya existe con contenido distinto" >&2
                colisiones=$((colisiones+1)); continue
            fi
        fi
        if [[ -e "$d" ]] && cmp -s "$o" "$d"; then saltados=$((saltados+1)); continue; fi
        $DRY_RUN && { copiados=$((copiados+1)); continue; }
        mkdir -p "$(dirname "$d")"
        install_file "$o" "$d" && copiados=$((copiados+1))
    done < <(cd "$src" && find . -type f -printf '%P\n' | sort)
done

modo="copia"; $USE_LINK && modo="enlace"
$DRY_RUN && modo="$modo (dry-run, sin escribir)"
echo "instalar-config-usuario: $copiados archivo(s) por $modo · $saltados sin cambio" \
     "· $colisiones colision(es) (alcance medido: $vistos archivo(s) en las clases pedidas)"

# El pase EN FIRME es la respuesta a la pregunta, la copie o no: un destino ya
# al dia responde «si» igual que uno recien poblado. El `--dry-run` no marca —
# mirar el plan no es decidir.
$DRY_RUN || marcar instalado

if [[ "$colisiones" -gt 0 ]]; then
    echo "" >&2
    echo "Se rehusa sobreescribir lo que solo comparte el nombre. Compara el" >&2
    echo "par y decide; \`--force\` sobreescribe cuando la decision ya esta tomada." >&2
    exit 1
fi
exit 0
