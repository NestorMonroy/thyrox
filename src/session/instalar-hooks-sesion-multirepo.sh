#!/usr/bin/env bash
# Instala los hooks de registro de agentes en el settings que SÍ carga en una
# sesión multi-repo (raíz de proyecto = el padre de los clones, sin .claude
# versionado). El cliente resuelve projectSettings/localSettings contra el cwd
# original de la sesión, no contra los repos hijos — por eso el
# .claude/settings.json de este repo no dispara ahí (H-DOCS-198).
#
# Idempotente: fusiona la sección hooks preservando lo demás (permissions).
# Uso: bash .claude/scripts/session/instalar-hooks-sesion-multirepo.sh [raiz] [--advisor <modelo>]
#      (raiz por defecto: /home/user)
#
# `--advisor <id>` escribe además `advisorModel`: la herramienta del servidor
# que consulta a un modelo más capaz SIN cambiar el modelo del hilo — la vía
# que conserva la caché (analisis-gestion-de-la-cache-de-prompt-en-el-binario
# §5). Es una clave de settings, así que sufre la misma precondición que los
# hooks: sólo carga desde un settings que el cliente lea (H-DOCS-1010).
set -euo pipefail

RAIZ="/home/user"; ADVISOR=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --advisor) ADVISOR="${2:?--advisor exige el identificador completo del modelo}"; shift 2 ;;
        *) RAIZ="$1"; shift ;;
    esac
done
case "$ADVISOR" in
    ""|claude-*) ;;
    *) echo "ERROR: --advisor va por identificador completo (claude-…), no alias: $ADVISOR" >&2; exit 2 ;;
esac
DEST="$RAIZ/.claude/settings.local.json"
HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../hooks" && pwd)"

mkdir -p "$(dirname "$DEST")"
[ -f "$DEST" ] || printf '{}\n' > "$DEST"

DEST="$DEST" HOOKS_DIR="$HOOKS_DIR" ADVISOR="$ADVISOR" python3 - <<'PY'
import json, os

dest = os.environ["DEST"]
h = os.environ["HOOKS_DIR"]
advisor = os.environ.get("ADVISOR", "")
with open(dest, encoding="utf-8") as fh:
    datos = json.load(fh)

datos["hooks"] = {
    "SubagentStart": [{"hooks": [
        {"type": "command", "command": f"python3 {h}/medir_delta_subagente.py --start"},
        {"type": "command", "command": f"python3 {h}/register_agent_session.py --start"},
    ]}],
    # El diálogo de cambio de modelo con la cifra del catálogo y la vía que
    # conserva la caché (bin/preModelSwitch.ts del paquete @kaupamex/agent).
    "PreModelSwitch": [{"hooks": [
        {"type": "command", "command": f"bun run {os.path.dirname(h)}/packages/agent/bin/preModelSwitch.ts", "timeout": 10},
    ]}],
    "SubagentStop": [{"hooks": [
        {"type": "command", "command": f"node {h}/save-agent-result.mjs"},
        {"type": "command", "command": f"python3 {h}/medir_delta_subagente.py --stop"},
        {"type": "command", "command": f"python3 {h}/register_agent_session.py --stop"},
    ]}],
}

if advisor:
    datos["advisorModel"] = advisor

with open(dest, "w", encoding="utf-8") as fh:
    json.dump(datos, fh, indent=2, ensure_ascii=False)
    fh.write("\n")

print(f"OK: hooks instalados en {dest} (claves: {sorted(datos)})")
PY
