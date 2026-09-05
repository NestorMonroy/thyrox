#!/usr/bin/env bash
# Pruebas del par deprecado: el guard `deprecated.sh` y el gate
# `check_script_deprecated.py`.
#
# El fenómeno es NUEVO en este árbol: al escribir estas pruebas había cero
# marcadores de deprecación en `.claude/scripts`, `.claude/hooks` y `scripts`
# de los cinco repos, así que no existe un infractor histórico que recuperar
# del historial —lo que `hallazgo-abierto-genera-sucesor.md` pide cuando lo
# hay—. El control positivo es el **estado intermedio real** por el que pasa
# `snapshot-tasks.sh`: cabecera puesta y guard sin cablear. Es el estado que
# H-DOCS-405 describe —una reserva que corre en silencio— no uno inventado.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUARD="$RAIZ/.claude/scripts/deprecated.sh"
GATE="$RAIZ/.claude/scripts/gates/check_script_deprecated.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

mkdir -p "$TMP/arbol/.claude/scripts"
cp "$GUARD" "$TMP/arbol/.claude/scripts/deprecated.sh"

# Un script deprecado bien formado — cabecera completa + guard cableado.
cat > "$TMP/arbol/.claude/scripts/viejo.sh" <<'GUION'
#!/usr/bin/env bash
# DEPRECATED: 2026-08-24 — produce una salida degradada
# SUCESOR: nuevo.py render
# HALLAZGO: H-DOCS-405
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/deprecated.sh"
deprecated_guard viejo.sh
echo "SALIDA-REAL"
GUION

# ---------------------------------------------------------------- caso 1
# El guard rehúsa cuando nadie declaró que lo sabe. Sin esto el mecanismo
# entero es un comentario.
salida="$(bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>/dev/null)"; codigo=$?
afirmar "rehúsa sin declaración (exit 3)" "3" "$codigo"
afirmar "y NO ejecuta el cuerpo" "" "$salida"

# ---------------------------------------------------------------- caso 2
# Declarado: corre. Es el camino de la reserva legítima del hook.
salida="$(ACCEPT_DEPRECATED=viejo.sh bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>/dev/null)"; codigo=$?
afirmar "corre con la declaración (exit 0)" "0" "$codigo"
afirmar "y ejecuta el cuerpo" "SALIDA-REAL" "$salida"

# ---------------------------------------------------------------- caso 3
# La declaración nombra UN script, no es un permiso global.
bash -c 'ACCEPT_DEPRECATED=otro.sh bash "$1" >/dev/null 2>&1' _ \
    "$TMP/arbol/.claude/scripts/viejo.sh"
afirmar "la declaración de OTRO script no vale" "3" "$?"

# ---------------------------------------------------------------- caso 4
# El aviso va a stderr. Si fuera a stdout contaminaría el artefacto que el
# script genera — este caso es lo que haría fallar al guard si alguien
# cambiara el destino del mensaje.
afirmar "el aviso no contamina stdout" "SALIDA-REAL" \
    "$(ACCEPT_DEPRECATED=viejo.sh bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>/dev/null)"
# `grep -c DEPRECATED` contaría también la línea `ACCEPT_DEPRECATED=`: se ancla
# al encabezado del aviso, que es la línea única que lo identifica.
afirmar "el aviso sale por stderr" "1" \
    "$(ACCEPT_DEPRECATED=viejo.sh bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>&1 >/dev/null \
        | grep -c '^DEPRECATED — ')"

# ---------------------------------------------------------------- caso 5
# Nunca silencioso: también avisa en el camino aceptado. Un guard que calla
# cuando se le declara deja de distinguir «reserva» de «camino normal».
afirmar "el aviso nombra al sucesor" "1" \
    "$(ACCEPT_DEPRECATED=viejo.sh bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>&1 >/dev/null \
        | grep -c 'nuevo\.py render')"
afirmar "el aviso cita el hallazgo" "1" \
    "$(ACCEPT_DEPRECATED=viejo.sh bash "$TMP/arbol/.claude/scripts/viejo.sh" 2>&1 >/dev/null \
        | grep -c 'H-DOCS-405')"

# ---------------------------------------------------------------- caso 6
# Gate: el bien formado no se marca. Control negativo — sin él, un gate que
# marcara todo publicaría la misma cifra que uno correcto.
afirmar "gate: no marca el bien formado" "0" "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 7
# CONTROL POSITIVO — cabecera puesta, guard sin cablear. Es el estado real
# intermedio de `snapshot-tasks.sh`: la declaración existe y nada la aplica.
sed '/^source .*deprecado\.sh"$/d; /^deprecated_guard /d' \
    "$TMP/arbol/.claude/scripts/viejo.sh" > "$TMP/arbol/.claude/scripts/sin_guard.sh"
afirmar "gate: ve la cabecera sin guard" "1" "$(python3 "$GATE" --quiet "$TMP/arbol")"
afirmar "gate: nombra el archivo" "1" \
    "$(python3 "$GATE" "$TMP/arbol" | grep -c 'sin_guard\.sh')"
rm "$TMP/arbol/.claude/scripts/sin_guard.sh"

# ---------------------------------------------------------------- caso 8
# El inverso: guard sin cabecera — un rechazo que nadie puede explicar.
sed '/^# DEPRECATED: /d; /^# SUCESOR: /d; /^# HALLAZGO: /d' \
    "$TMP/arbol/.claude/scripts/viejo.sh" > "$TMP/arbol/.claude/scripts/sin_cabecera.sh"
afirmar "gate: ve el guard sin cabecera" "1" "$(python3 "$GATE" --quiet "$TMP/arbol")"
rm "$TMP/arbol/.claude/scripts/sin_cabecera.sh"

# ---------------------------------------------------------------- caso 9
# Cabecera incompleta: sin sucesor, el aviso no dice qué usar en su lugar.
sed '/^# SUCESOR: /d' "$TMP/arbol/.claude/scripts/viejo.sh" \
    > "$TMP/arbol/.claude/scripts/sin_sucesor.sh"
afirmar "gate: ve la cabecera sin SUCESOR" "1" "$(python3 "$GATE" --quiet "$TMP/arbol")"
rm "$TMP/arbol/.claude/scripts/sin_sucesor.sh"

# ---------------------------------------------------------------- caso 10
# Un script normal no lleva nada y NO es infractor: el gate mide coherencia
# de la declaración, no decide quién debe deprecarse.
printf '#!/usr/bin/env bash\necho hola\n' > "$TMP/arbol/.claude/scripts/normal.sh"
afirmar "gate: un script sin marcadores no es infractor" "0" \
    "$(python3 "$GATE" --quiet "$TMP/arbol")"

# ---------------------------------------------------------------- caso 11
# --strict en los dos sentidos.
python3 "$GATE" --strict --quiet "$TMP/arbol" >/dev/null 2>&1
afirmar "--strict sale 0 sin infractores" "0" "$?"
cp "$TMP/arbol/.claude/scripts/viejo.sh" "$TMP/arbol/.claude/scripts/roto.sh"
sed -i '/^deprecated_guard /d' "$TMP/arbol/.claude/scripts/roto.sh"
python3 "$GATE" --strict --quiet "$TMP/arbol" >/dev/null 2>&1
afirmar "--strict sale 1 con un infractor" "1" "$?"
rm "$TMP/arbol/.claude/scripts/roto.sh"

# ---------------------------------------------------------------- caso 12
# Un conteo sin denominador no es un resultado.
afirmar "el reporte declara el alcance medido" "1" \
    "$(python3 "$GATE" "$TMP/arbol" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 13
# El árbol real está en cero — la condición que el grifo sostiene.
afirmar "el repo real no tiene infractores" "0" "$(python3 "$GATE" --quiet "$RAIZ")"

# ---------------------------------------------------------------- caso 20
# El gemelo de Python (#864). El guard es `deprecated_guard` —identificador en
# ingles— y la cabecera es la MISMA en los dos lenguajes; por eso un solo gate
# mide ambos. Sin estos casos, extender el gate a `.py` no tendria control:
# su cero seria indistinguible de «no mira los .py».
GUARD_PY="$RAIZ/.claude/scripts/deprecated.py"
cat > "$TMP/arbol/.claude/scripts/viejo.py" <<'PYFIN'
#!/usr/bin/env python3
# DEPRECATED: 2026-01-01 - motivo medido
# SUCESOR: python3 nuevo.py
# HALLAZGO: H-TEST-1
import importlib.util, pathlib
_g = importlib.util.spec_from_file_location("deprecado", pathlib.Path(__file__).resolve().parent / "deprecated.py")
_m = importlib.util.module_from_spec(_g); _g.loader.exec_module(_m)
_m.deprecated_guard("viejo.py")
print("cuerpo")
PYFIN
cp "$GUARD_PY" "$TMP/arbol/.claude/scripts/deprecated.py"

afirmar "guard .py: rehusa por omision" "3" \
        "$(python3 "$TMP/arbol/.claude/scripts/viejo.py" >/dev/null 2>&1; echo $?)"
afirmar "guard .py: corre con la declaracion" "cuerpo" \
        "$(ACCEPT_DEPRECATED=viejo.py python3 "$TMP/arbol/.claude/scripts/viejo.py" 2>/dev/null)"
afirmar "gate: la declaracion .py completa no es infractora" "0" \
        "$(python3 "$GATE" --quiet "$TMP/arbol")"

sed '/^# HALLAZGO: /d' "$TMP/arbol/.claude/scripts/viejo.py" \
    > "$TMP/arbol/.claude/scripts/sin_hallazgo.py"
afirmar "gate: ve la cabecera .py sin HALLAZGO" "1" \
        "$(python3 "$GATE" --quiet "$TMP/arbol")"
rm "$TMP/arbol/.claude/scripts/sin_hallazgo.py" "$TMP/arbol/.claude/scripts/viejo.py"

# --- El ALCANCE del gate (#96, opcion b): todas las raices, no un clon.
#
# Hasta 2026-09-05 media UN repositorio y publicaba su cero como si fuera el
# del arbol: 237 scripts de 514, el 46 % (H-DOCS-1045). Un cero sobre el 46 %
# no distingue «no hay deuda» de «cuatro raices sin medir».
#
# Las tres afirmaciones cubren las tres conductas que la opcion (b) fija, y las
# tres pueden fallar — que es lo que las hace controles y no adorno.

# 1. Sin argumentos recorre el conjunto resuelto. Se compara contra la cuenta
#    que reach_roots declara, no contra un 5 escrito a mano: si el conjunto
#    cambia, el control sigue midiendo lo correcto.
RAICES_DECLARADAS=$(python3 "$RAIZ/.claude/scripts/reach_roots.py" --paths | wc -l)
SALIDA_TODAS=$(python3 "$GATE" 2>&1)
RAICES_MEDIDAS=$(printf '%s' "$SALIDA_TODAS" | sed -n 's/.*en \([0-9]*\) raiz.*/\1/p;s/.*en \([0-9]*\) raíz.*/\1/p')
afirmar "gate: sin argumentos mide TODAS las raices del alcance" \
    "$RAICES_DECLARADAS" "$RAICES_MEDIDAS"

# 2. El desglose por raiz va SIEMPRE, aunque el total sea cero. Sin el, un
#    total limpio no distingue «ninguna deuda» de «una raiz vacia que nadie
#    noto» — que es el defecto que (b) cierra, reaparecido en la salida.
HAY_DESGLOSE=$(printf '%s' "$SALIDA_TODAS" | grep -cE '[a-z]+:[0-9]+/[0-9]+')
afirmar "gate: publica el desglose por raiz aunque el total sea cero" \
    "1" "$([[ "$HAY_DESGLOSE" -ge 1 ]] && echo 1 || echo 0)"

# 3. La PRECONDICION: una raiz ausente rehusa con codigo propio y SIN cifra.
#    Un conjunto corto medido en silencio publicaria un conteo que parece sano
#    (H-API-335). El control positivo es real: KAUPAMEX_ROOT a un padre que no
#    existe hace faltar las cinco.
KAUPAMEX_ROOT=/nonexistent python3 "$GATE" >"$TMP/precond.txt" 2>&1
afirmar "gate: una raiz ausente rehusa con 2" "2" "$?"
afirmar "gate: al rehusar NO emite cifra de infractores" "0" \
    "$(grep -c 'declaración(es) de deprecación' "$TMP/precond.txt")"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
