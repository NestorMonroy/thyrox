#!/usr/bin/env bash
# Instala los hooks de registro de agentes en el settings que SÍ carga en una
# sesión multi-repo (raíz de proyecto = el padre de los clones, sin .claude
# versionado). El cliente resuelve projectSettings/localSettings contra el cwd
# original de la sesión, no contra los repos hijos — por eso el
# .claude/settings.json de este repo no dispara ahí (H-DOCS-198).
#
# Idempotente: fusiona la sección hooks preservando lo demás (permissions).
# Uso: bash .claude/scripts/session/instalar-hooks-sesion-multirepo.sh [raiz] [--advisor <modelo>]
#      (raiz por defecto: la que derive el localizador, no una codificada)
#
# `--advisor <id>` escribe además `advisorModel`: la herramienta del servidor
# que consulta a un modelo más capaz SIN cambiar el modelo del hilo — la vía
# que conserva la caché (analisis-gestion-de-la-cache-de-prompt-en-el-binario
# §5). Es una clave de settings, así que sufre la misma precondición que los
# hooks: sólo carga desde un settings que el cliente lea (H-DOCS-1010).
set -euo pipefail

# El padre de los clones NO se codifica: depende de quien clono y donde. Lo
# decide el localizador, con su precedencia (THYROX_REACH_ROOT, .env, ascenso
# buscando un clon conocido), y rehusa si no lo puede derivar.
_thyrox_desde="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$_thyrox_desde" != "/" && ! -f "$_thyrox_desde/src/paths/reach.py" ]]; do
    _thyrox_desde="$(dirname "$_thyrox_desde")"
done
source "$_thyrox_desde/src/lib/reach.sh"
ROOT="$(thyrox_tree_root)" || exit 2
ADVISOR=""; CONSUMIDOR="${CONSUMIDOR:-}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --advisor) ADVISOR="${2:?--advisor exige el identificador completo del modelo}"; shift 2 ;;
        --consumidor) CONSUMIDOR="${2:?--consumidor exige la ruta del clon}"; shift 2 ;;
        -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        # Una opcion desconocida NO se toma por la raiz: el catch-all anterior
        # convertia `--help` en un directorio y el error salia de `dirname`,
        # tres pasos mas abajo y hablando de otra cosa.
        -*) echo "opcion desconocida: $1" >&2; exit 2 ;;
        *) ROOT="$1"; shift ;;
    esac
done
case "$ADVISOR" in
    ""|claude-*) ;;
    *) echo "ERROR: --advisor va por identificador completo (claude-…), no alias: $ADVISOR" >&2; exit 2 ;;
esac
DEST="$ROOT/.claude/settings.local.json"
THYROX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# El cableado NO se compone aqui: lo emite `declared_wiring()` del proveedor.
# Este guion aporta lo que es PARAMETRO del consumidor (DEC-04) —contra que
# clon se resuelven las rutas y que modelo asesora— y nada mas.
#
# Antes componia sus propios seis comandos, apuntando a los stubs de
# `<consumidor>/.claude/hooks/`. Esa topologia fue correcta mientras el
# mecanismo vivio ahi; el 2026-09-07 los tres se mudaron a `thyrox:
# src/agents/` y `declared_wiring()` reapunto al productor, pero este guion
# no. Quedaron DOS cableados contradictorios y ningun control los separaba:
# los seis archivos existen, asi que la alcanzabilidad da 0 para los dos.
#
# El consumidor es un parametro: `--consumidor <ruta>` gana, si no la raiz
# que `reach` declare para el clon de docs.
if [ -z "${CONSUMIDOR:-}" ]; then
    CONSUMIDOR="$(python3 -c 'import sys; sys.path.insert(0, "'"$THYROX_DIR"'/paths"); import reach; print(reach.root("docs"))')"
fi

mkdir -p "$(dirname "$DEST")"
[ -f "$DEST" ] || printf '{}\n' > "$DEST"

DEST="$DEST" CONSUMIDOR="$CONSUMIDOR" THYROX_DIR="$THYROX_DIR" ADVISOR="$ADVISOR" python3 - <<'PY'
import json, os, sys

sys.path.insert(0, os.path.join(os.environ["THYROX_DIR"], "session"))
from user_wiring import declared_wiring  # noqa: E402

dest = os.environ["DEST"]
advisor = os.environ.get("ADVISOR", "")
with open(dest, encoding="utf-8") as fh:
    datos = json.load(fh)

# La FUENTE del cableado es el productor. Aqui solo se le pasan los dos
# parametros del consumidor y se fusiona sobre lo que ya haya: `permissions` lo
# escribe el cliente y `env`/`effortLevel` quien opera — sobreescribir el
# archivo entero destruye su trabajo en silencio.
cableado = declared_wiring(
    root=os.path.dirname(os.environ["THYROX_DIR"]),
    consumer=os.environ["CONSUMIDOR"],
    advisor=advisor or None,
)
datos["hooks"] = cableado["hooks"]

# `advisorModel` compone la CLAVE de la cache de prompt (`createCacheSafeParams`,
# 2.1.266). Escribirlo sin que nadie lo pidiera reescribe el contexto entero al
# precio de escritura del destino (H-DOCS-1012), asi que solo se toca con
# `--advisor` explicito.
if advisor:
    datos["advisorModel"] = cableado["advisorModel"]

with open(dest, "w", encoding="utf-8") as fh:
    json.dump(datos, fh, indent=2, ensure_ascii=False)
    fh.write("\n")

print(f"OK: hooks instalados en {dest} (claves: {sorted(datos)})")
PY
