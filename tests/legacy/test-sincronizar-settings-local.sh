#!/bin/bash
# =============================================================================
# test-sincronizar-settings-local.sh — prueba de sincronizar_settings_local.py
# =============================================================================
#
# Todo corre sobre COPIAS DESECHABLES de las tres rutas. Ni el repositorio real
# ni la copia viva del cliente se tocan: el guion recibe `--repo`, `--viva` y
# `--base` apuntando a un directorio temporal.
#
# El caso 2 es el que importa, y su control positivo NO se fabrica: es la
# regresión real de H-DOCS-288 —una absorción que dejó el bloque `permissions`
# versionado con 1 clave de 4 y 25 patrones curados perdidos—. El caso 3
# demuestra que ese control PUEDE FALLAR: con el dueño del bloque cambiado a
# `sesion` sobre una copia del guion, la política curada se destruye otra vez.
# Un verde que no distingue «el mecanismo protege» de «el test no pregunta» no
# es evidencia (sub-patrón D de `metrica-decide-la-conclusion.md`).
#
# Uso:  bash .claude/scripts/tests/test-sincronizar-settings-local.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUT="$SCRIPT_DIR/session/sincronizar_settings_local.py"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
REPO="$TMP/settings.json"; VIVA="$TMP/settings.local.json"; BASE="$TMP/base.json"
sync() { python3 "$SUT" --repo "$REPO" --viva "$VIVA" --base "$BASE" "$@"; }
# Lee una expresión de Python sobre un JSON del temporal. `j` es el documento.
leer() { python3 -c "
import json,sys
j=json.load(open(sys.argv[1]))
print($2)" "$1" 2>&1; }

echo "== 1. repositorio -> viva: el hook nuevo llega ABSOLUTIZADO =="
# Es la mitad de #712 que la directiva pide: un cambio en la copia versionada
# aparece en la que el cliente carga, con la ruta ya resuelta.
cat > "$REPO" <<'JSON'
{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash .claude/hooks/ejemplo.sh"}]}]}}
JSON
echo '{"hooks": {}}' > "$VIVA"
OUT=$(sync --direccion repositorio --aplicar 2>&1); RC=$?
check "propagación -> exit 0" "0" "$RC"
case "$OUT" in *"aplicado  hooks"*) check "declara el bloque aplicado" "sí" "sí" ;;
                                 *) check "declara el bloque aplicado" "sí" "no ($OUT)" ;; esac
check "el comando llega con ruta absoluta" \
  "bash /home/user/kaupamex-docs/.claude/hooks/ejemplo.sh" \
  "$(leer "$VIVA" 'j["hooks"]["Stop"][0]["hooks"][0]["command"]')"
# Los disparadores de la propia sincronización sobreviven a su propio disparo:
# es el defecto H-DOCS-287, que borraba el mecanismo en su primera ejecución.
check "los 5 disparadores siguen en la copia viva" "5" \
  "$(leer "$VIVA" 'sum(1 for e in j["hooks"].values() for m in e for h in m["hooks"] if "sincronizar_settings_local" in h["command"])')"

echo "== 2. el segundo disparo no encuentra nada que hacer (idempotencia) =="
# Sin esto, cada disparo reescribiría la copia viva y el diff nunca convergería.
OUT=$(sync --direccion repositorio --aplicar 2>&1); RC=$?
check "segundo disparo -> exit 0" "0" "$RC"
check "no hay diferencias" "sin diferencias entre las dos copias" "$OUT"

echo "== 3. control positivo REAL: la regresión de H-DOCS-288 =="
# El repositorio lleva política CURADA; la copia viva, la bitácora de
# aprobaciones que el cliente apenda. Comparten nombre y no son lo mismo.
cat > "$REPO" <<'JSON'
{"permissions": {"defaultMode": "acceptEdits",
                 "allow": ["Bash(git commit *)", "Bash(make html)"],
                 "ask": ["Bash(git push *)"],
                 "deny": ["Read(./.env)"]}}
JSON
cat > "$VIVA" <<'JSON'
{"permissions": {"allow": ["Bash(cp /root/.claude/uploads/x.md .)", "Bash(ls -la)"]}}
JSON
rm -f "$BASE"
ANTES=$(cat "$REPO")
OUT=$(sync --direccion viva --aplicar 2>&1); RC=$?
check "permissions no viaja -> exit 0" "0" "$RC"
check "no lo reporta por el canal de error" "sin diferencias entre las dos copias" "$OUT"
if [[ "$ANTES" == "$(cat "$REPO")" ]]; then
  check "la política curada queda byte a byte idéntica" "sí" "sí"
else
  check "la política curada queda byte a byte idéntica" "sí" "no"
fi

echo "== 4. el control del control: con el dueño cambiado, SÍ se destruye =="
# Un verde que no puede volverse rojo no informa. Se anula la protección sobre
# una COPIA del guion y se comprueba que reaparece exactamente el daño medido.
sed 's/"permissions": "no-replicado"/"permissions": "sesion"/' "$SUT" > "$TMP/sut_sin_proteccion.py"
cat > "$REPO" <<'JSON'
{"permissions": {"defaultMode": "acceptEdits",
                 "allow": ["Bash(git commit *)", "Bash(make html)"],
                 "ask": ["Bash(git push *)"],
                 "deny": ["Read(./.env)"]}}
JSON
rm -f "$BASE"
python3 "$TMP/sut_sin_proteccion.py" --repo "$REPO" --viva "$VIVA" --base "$BASE" \
  --direccion viva --aplicar >/dev/null 2>&1
check "sin la protección, las 4 claves caen a 1" "['allow']" \
  "$(leer "$REPO" 'sorted(j["permissions"])')"
check "sin la protección, la política curada desaparece" "False" \
  "$(leer "$REPO" '"Bash(git commit *)" in j["permissions"]["allow"]')"

echo "== 5. un conflicto se REPORTA, no se resuelve =="
# Las dos copias cambiaron desde la base: el guion no elige por su cuenta.
printf '{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash repo.sh"}]}]}}\n' > "$REPO"
printf '{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash viva.sh"}]}]}}\n' > "$VIVA"
printf '{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash base.sh"}]}]}}\n' > "$BASE"
R_ANTES=$(cat "$REPO"); V_ANTES=$(cat "$VIVA")
OUT=$(sync --aplicar 2>&1); RC=$?
check "conflicto -> exit 1" "1" "$RC"
case "$OUT" in *"REPORTE"*"conflicto"*) check "lo nombra conflicto" "sí" "sí" ;;
                                     *) check "lo nombra conflicto" "sí" "no ($OUT)" ;; esac
if [[ "$R_ANTES" == "$(cat "$REPO")" && "$V_ANTES" == "$(cat "$VIVA")" ]]; then
  check "no escribe ninguna de las dos copias" "sí" "sí"
else
  check "no escribe ninguna de las dos copias" "sí" "no"
fi

echo "== 6. una edición por el lado que NO es dueño se reporta =="
# La base se siembra con un disparo real; luego se edita la copia viva, que no
# es dueña de `hooks`. El guion no la pisa ni la absorbe: la reporta.
rm -f "$BASE"
printf '{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash .claude/hooks/ejemplo.sh"}]}]}}\n' > "$REPO"
echo '{"hooks": {}}' > "$VIVA"
sync --aplicar >/dev/null 2>&1                      # siembra la base
python3 - "$VIVA" <<'PY'
import json, sys
p = sys.argv[1]; d = json.load(open(p))
d["hooks"]["Stop"][0]["hooks"][0]["command"] = "bash /tmp/lo-que-alguien-edito.sh"
json.dump(d, open(p, "w"), indent=2)
PY
V_ANTES=$(cat "$VIVA")
OUT=$(sync --aplicar 2>&1); RC=$?
check "edición por el lado equivocado -> exit 1" "1" "$RC"
case "$OUT" in *"cuyo dueno es el repositorio"*) check "nombra al dueño real" "sí" "sí" ;;
                                              *) check "nombra al dueño real" "sí" "no ($OUT)" ;; esac
if [[ "$V_ANTES" == "$(cat "$VIVA")" ]]; then
  check "la edición ajena no se pisa" "sí" "sí"
else
  check "la edición ajena no se pisa" "sí" "no"
fi

echo "== 7. sin --aplicar el guion REPORTA y no escribe =="
rm -f "$BASE"
printf '{"hooks": {"Stop": [{"hooks": [{"type": "command", "command": "bash .claude/hooks/otro.sh"}]}]}}\n' > "$REPO"
echo '{"hooks": {}}' > "$VIVA"
V_ANTES=$(cat "$VIVA")
OUT=$(sync --direccion repositorio 2>&1); RC=$?
check "sin --aplicar -> exit 0" "0" "$RC"
case "$OUT" in *"pendiente hooks"*) check "declara lo que haría" "sí" "sí" ;;
                                 *) check "declara lo que haría" "sí" "no ($OUT)" ;; esac
if [[ "$V_ANTES" == "$(cat "$VIVA")" ]]; then
  check "la copia viva queda intacta" "sí" "sí"
else
  check "la copia viva queda intacta" "sí" "no"
fi

echo "== 8. --registrar-vigilancia emite ruta ABSOLUTA y no toca archivo =="
# El esquema de `watchPaths` del cliente exige rutas absolutas; una relativa
# registraría una vigilancia que nunca dispara.
V_ANTES=$(cat "$VIVA")
OUT=$(python3 "$SUT" --registrar-vigilancia --repo "$REPO" 2>&1); RC=$?
check "registrar-vigilancia -> exit 0" "0" "$RC"
RUTA=$(printf '%s' "$OUT" | python3 -c "import json,sys; print(json.load(sys.stdin)['hookSpecificOutput']['watchPaths'][0])" 2>&1)
case "$RUTA" in /*) check "la ruta vigilada es absoluta" "sí" "sí" ;;
                 *) check "la ruta vigilada es absoluta" "sí" "no ($RUTA)" ;; esac
if [[ "$V_ANTES" == "$(cat "$VIVA")" ]]; then
  check "no escribe nada en este modo" "sí" "sí"
else
  check "no escribe nada en este modo" "sí" "no"
fi

echo "== 9. un bloque sin dueño declarado se reporta, no se adivina =="
printf '{"bloqueDesconocido": {"a": 1}}\n' > "$REPO"
echo '{}' > "$VIVA"; rm -f "$BASE"
OUT=$(sync --aplicar 2>&1); RC=$?
check "bloque sin dueño -> exit 1" "1" "$RC"
case "$OUT" in *"sin dueno declarado"*) check "dice por qué no lo toca" "sí" "sí" ;;
                                      *) check "dice por qué no lo toca" "sí" "no ($OUT)" ;; esac

echo
echo "resultado: $PASS aserciones en verde, $FAIL en rojo"
(( FAIL == 0 )) || exit 1
