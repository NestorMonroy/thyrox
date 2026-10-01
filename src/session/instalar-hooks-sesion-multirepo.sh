#!/usr/bin/env bash
# Instala los hooks de registro de agentes en el settings que SÍ carga en una
# sesión multi-repo (raíz de proyecto = el padre de los clones, sin .claude
# versionado). El cliente resuelve projectSettings/localSettings contra el cwd
# original de la sesión, no contra los repos hijos — por eso el
# .claude/settings.json de este repo no dispara ahí (H-DOCS-198).
#
# Idempotente: fusiona la sección hooks preservando lo demás (permissions).
# Uso: bash bin/instalar-hooks-sesion-multirepo [raiz] [--advisor <modelo>] [--consumer <ruta>]
#      (raiz por defecto: la que derive el localizador, no una codificada;
#       consumidor: --consumer, si no THYROX_CONSUMER, si no el contexto que
#       `user_wiring.resolve_consumer` fija — y REHUSA si es ambiguo)
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
_thyrox_from="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$_thyrox_from" != "/" && ! -f "$_thyrox_from/src/paths/reach.py" ]]; do
    _thyrox_from="$(dirname "$_thyrox_from")"
done
source "$_thyrox_from/src/lib/reach.sh"
ROOT="$(thyrox_tree_root)" || exit 2
ADVISOR=""; CONSUMER="${CONSUMER:-}"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --advisor) ADVISOR="${2:?--advisor exige el identificador completo del modelo}"; shift 2 ;;
        # `--consumidor` es la grafia anterior de la misma opcion; se conserva
        # porque tiene invocadores (tests/session/test_installed_hooks_resolve.py).
        --consumer|--consumidor) CONSUMER="${2:?--consumer exige la ruta del clon}"; shift 2 ;;
        -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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

# El modulo se importa como lo importan los envoltorios de `bin/`: con la
# raiz del proveedor declarada y `src/` en PYTHONPATH. Sin eso, `user_wiring`
# muere al importar `paths.reach` (H-THYROX-268).
THYROX_ROOT="${THYROX_ROOT:-$_thyrox_from}"
export THYROX_ROOT
export PYTHONPATH="$THYROX_ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

# El cableado NO se compone aqui: lo emite `declared_wiring()` del proveedor.
# Este guion aporta lo que es PARAMETRO del consumidor (DEC-04) —contra que
# clon se resuelven las rutas y que modelo asesora— y nada mas.
#
# Componer aqui otros comandos crearia un segundo cableado que contradiga al
# del proveedor, y ningun control los separaria: si los archivos de los dos
# existen, la alcanzabilidad da 0 para ambos.
#
# El consumidor es un parametro: `--consumer <ruta>` gana; sin el, lo
# resuelve `declared_wiring` —THYROX_CONSUMER, y si no el contexto— y REHUSA
# si es ambiguo. Aqui no se nombra ningun clon (TASK-THYROX-0261): el
# `reach.root("docs")` que hacia de default era un consumidor escrito a mano
# en el proveedor.
DEST="$DEST" CONSUMER="$CONSUMER" ADVISOR="$ADVISOR" python3 - <<'PY'
import json
import os
import sys

from session.user_wiring import WiringRefused, declared_wiring

dest = os.environ["DEST"]
advisor = os.environ.get("ADVISOR", "")

# La FUENTE del cableado es el productor. Aqui solo se le pasan los dos
# parametros del consumidor y se fusiona sobre lo que ya haya: `permissions` lo
# escribe el cliente y `env`/`effortLevel` quien opera — sobreescribir el
# archivo entero destruye su trabajo en silencio. Y se resuelve ANTES de tocar
# el destino: un rehuso no deja ni un `{}` vacio detras.
try:
    wiring = declared_wiring(
        root=os.environ["THYROX_ROOT"],
        consumer=os.environ.get("CONSUMER") or None,
        advisor=advisor or None,
    )
except WiringRefused as error:
    print(f"REHUSA — {error}", file=sys.stderr)
    sys.exit(2)

settings = {}
if os.path.exists(dest):
    with open(dest, encoding="utf-8") as handle:
        settings = json.load(handle)
settings["hooks"] = wiring["hooks"]

# `advisorModel` compone la CLAVE de la cache de prompt (`createCacheSafeParams`,
# 2.1.266). Escribirlo sin que nadie lo pidiera reescribe el contexto entero al
# precio de escritura del destino (H-DOCS-1012), asi que solo se toca con
# `--advisor` explicito.
if advisor:
    settings["advisorModel"] = wiring["advisorModel"]

os.makedirs(os.path.dirname(dest), exist_ok=True)
with open(dest, "w", encoding="utf-8") as handle:
    json.dump(settings, handle, indent=2, ensure_ascii=False)
    handle.write("\n")

print(f"OK: hooks instalados en {dest} (claves: {sorted(settings)})")
PY
