#!/bin/bash
# =============================================================================
# test-verificar-rutas-de-hook.sh — prueba de verificar_rutas_de_hook.py
# =============================================================================
#
# El defecto que este guion detecta es el más barato de cometer y el que ningún
# otro control cubre: un renombre de archivo deja la ruta declarada apuntando al
# vacío, el hook falla al ejecutarse, y ese fallo no llega a ninguna parte — el
# cliente no lo reporta y el propio hook no puede reportarlo porque no llega a
# correr.
#
# El control positivo NO se fabrica: son las cuatro rutas del episodio real
# (H-DOCS-283) —dos scripts renombrados a snake_case cuyos nombres en guion
# medio quedaron citados en el archivo que el cliente carga—. Un incumplidor
# escrito por quien escribió el patrón hereda su encuadre y confirma el
# instrumento en vez de probarlo.
#
# Uso:  bash .claude/scripts/tests/test-verificar-rutas-de-hook.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUT="$SCRIPT_DIR/gates/verificar_rutas_de_hook.py"
CANDIDATO="$REPO_ROOT/.claude/eventos/settings-local-20260821T110649/generado/settings.local.json"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

echo "== 1. el candidato versionado: 0 rutas ausentes =="
# Es la prueba de #711. El candidato cita 21 comandos con ruta absoluta bajo la
# raíz del repositorio; en cualquier clon los 21 existen, así que la aserción es
# portable y no depende de esta máquina.
OUT=$(python3 "$SUT" "$CANDIDATO" --strict 2>&1); RC=$?
check "candidato --strict -> exit 0" "0" "$RC"
case "$OUT" in *"ausentes: 0"*) check "declara 0 ausentes" "sí" "sí" ;;
                            *) check "declara 0 ausentes" "sí" "no ($OUT)" ;; esac
# El denominador va SIEMPRE junto al conteo: sin él, un instrumento ciego y uno
# correcto publican la misma cifra.
case "$OUT" in *"rutas verificadas: "[0-9]*) check "publica su denominador" "sí" "sí" ;;
                                          *) check "publica su denominador" "sí" "no" ;; esac

echo "== 2. control positivo REAL: las 4 rutas del episodio H-DOCS-283 =="
# Los dos scripts existen hoy con nombre en snake_case; el archivo vivo los
# citaba con el nombre en guion medio, que es el que se renombró.
cat > "$TMP/roto.json" <<JSON
{
  "hooks": {
    "SubagentStart": [{"hooks": [
      {"type": "command", "command": "python3 $REPO_ROOT/.claude/hooks/medir-delta-subagente.py"},
      {"type": "command", "command": "python3 $REPO_ROOT/.claude/hooks/register-agent-session.py"}
    ]}],
    "SubagentStop": [{"hooks": [
      {"type": "command", "command": "python3 $REPO_ROOT/.claude/hooks/medir-delta-subagente.py"},
      {"type": "command", "command": "python3 $REPO_ROOT/.claude/hooks/register-agent-session.py"}
    ]}]
  }
}
JSON
OUT=$(python3 "$SUT" "$TMP/roto.json" --strict 2>&1); RC=$?
check "las 4 rutas del episodio -> exit 1" "1" "$RC"
case "$OUT" in *"ausentes: 4"*) check "cuenta las 4, ni una más ni una menos" "sí" "sí" ;;
                            *) check "cuenta las 4, ni una más ni una menos" "sí" "no ($OUT)" ;; esac
case "$OUT" in *"medir-delta-subagente.py"*) check "NOMBRA la ruta que falta" "sí" "sí" ;;
                                          *) check "NOMBRA la ruta que falta" "sí" "no" ;; esac

echo "== 3. el nombre corregido SÍ existe — el defecto era el nombre, no el guion =="
# Sin esta aserción, el caso 2 no distingue «el archivo no está» de «ningún
# archivo de hooks está». Es el control del control.
for real in medir_delta_subagente.py register_agent_session.py; do
  if [[ -f "$REPO_ROOT/.claude/hooks/$real" ]]; then
    check "$real existe en disco" "sí" "sí"
  else
    check "$real existe en disco" "sí" "no"
  fi
done

echo "== 4. sin --strict el guion REPORTA y no bloquea =="
OUT=$(python3 "$SUT" "$TMP/roto.json" 2>&1); RC=$?
check "sin --strict -> exit 0 aunque falten rutas" "0" "$RC"
case "$OUT" in *"ausentes: 4"*) check "el conteo es el mismo con y sin --strict" "sí" "sí" ;;
                            *) check "el conteo es el mismo con y sin --strict" "sí" "no" ;; esac

echo "== 5. un archivo de settings inexistente se reporta, no se traga =="
OUT=$(python3 "$SUT" "$TMP/no-existe.json" --strict 2>&1); RC=$?
check "settings ausente -> exit 1" "1" "$RC"
case "$OUT" in *"no existe"*) check "dice que el archivo no existe" "sí" "sí" ;;
                           *) check "dice que el archivo no existe" "sí" "no" ;; esac

echo "== 6. un comando sin ruta de script no inventa un ausente =="
# `Ciega a:` declarada del guion: el comando que resuelve por PATH no se mide.
# La aserción fija que ESO es lo que hace, en vez de dejarlo a la interpretación.
cat > "$TMP/sin-ruta.json" <<'JSON'
{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "jq -e .hooks"}]}]}}
JSON
OUT=$(python3 "$SUT" "$TMP/sin-ruta.json" --strict 2>&1); RC=$?
check "comando sin ruta -> exit 0" "0" "$RC"
case "$OUT" in *"rutas verificadas: 0"*) check "no lo cuenta como verificado ni como ausente" "sí" "sí" ;;
                                      *) check "no lo cuenta como verificado ni como ausente" "sí" "no ($OUT)" ;; esac

echo
echo "resultado: $PASS aserciones en verde, $FAIL en rojo"
(( FAIL == 0 )) || exit 1
