#!/usr/bin/env bash
# Pruebas de `censo_contraparte.py`.
#
# El control positivo NO se fabrica: es el estado REAL de la declaración antes
# de H-DOCS-229, recuperado del git log. `hallazgo-abierto-genera-sucesor.md`
# lo exige — un incumplidor escrito por quien escribió el patrón hereda su
# encuadre y confirma el instrumento en vez de probarlo.
set -uo pipefail

DOCS="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CENSO="$DOCS/.claude/scripts/corpus/censo_contraparte.py"
DECL="$DOCS/.claude/scripts/corpus/addon-alias.txt"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok=0; fail=0
check() {  # check <descripción> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then ok=$((ok+1)); printf '  ok    %s\n' "$1"
    else fail=$((fail+1)); printf '  FALLA %s\n        esperado=[%s]\n        obtenido=[%s]\n' "$1" "$2" "$3"; fi
}

echo "== caso 1: el árbol vivo no deja ningún addon SIN-DECLARAR =="
salida="$(python3 "$CENSO" --quiet --strict 2>&1)"; rc=$?
check "exit 0 con la declaración vigente" 0 "$rc"
check "0 líneas SIN-DECLARAR" "" "$(echo "$salida" | grep 'SIN-DECLARAR' || true)"

echo "== caso 2: control positivo — la declaración SIN dos filas vivas =="
# Las dos formas son reales, no fabricadas: la contraparte de `auto_backup`
# sólo existía a nivel de MODELO y en comentario (H-DOCS-229), y la fila
# `auth_timeout → authz_timeout` faltaba de su familia hasta el pase de hoy.
#
# Se retiran DOS a propósito. El censo imprime todos los huérfanos en UNA
# línea separados por espacio, así que con un solo huérfano la igualdad de
# línea completa y la búsqueda DENTRO de la línea dan el mismo verde: ningún
# caso distinguiría la aserción correcta de la rota. Es el sub-patrón D de
# `metrica-decide-la-conclusion.md` — un control tiene que poder fallar.
grep -vE '^(funcional:_18-app:app_auto_backup|auth_timeout)[[:space:]]' \
     "$DECL" > "$TMP/dos-huerfanos.txt"
salida="$(python3 "$CENSO" --quiet --strict --declaracion "$TMP/dos-huerfanos.txt" 2>&1)"; rc=$?
check "exit 1 cuando faltan las filas" 1 "$rc"
linea="$(echo "$salida" | grep 'SIN-DECLARAR:' || true)"
check "nombra a auto_backup dentro de la línea" "auto_backup" \
      "$(echo "$linea" | grep -ow 'auto_backup' || true)"
check "nombra a authz_timeout dentro de la línea" "authz_timeout" \
      "$(echo "$linea" | grep -ow 'authz_timeout' || true)"

echo "== caso 3: una raíz que no resuelve se AVISA, no se calla =="
sed 's#^raiz:odoo19e .*#raiz:odoo19e    19.x/ruta-que-no-existe#' "$DECL" > "$TMP/raiz-rota.txt"
salida="$(python3 "$CENSO" --quiet --declaracion "$TMP/raiz-rota.txt" 2>&1)"
check "avisa de la raíz vacía" "1" \
      "$(echo "$salida" | grep -c 'AVISO: raíz declarada sin addons: odoo19e' || true)"

echo "== caso 4: sin ninguna fila raiz: el censo se rehúsa a medir =="
grep -v '^raiz:' "$DECL" > "$TMP/sin-raices.txt"
python3 "$CENSO" --quiet --declaracion "$TMP/sin-raices.txt" >/dev/null 2>&1
check "exit 2 sin raíces declaradas" 2 "$?"

echo "== caso 5: las filas de nivel MODELO se ignoran, no se cuentan =="
cp "$DECL" "$TMP/con-modelo.txt"
printf '\nmail.tracking.value   authz.AlgunModelo\n' >> "$TMP/con-modelo.txt"
salida="$(python3 "$CENSO" --quiet --declaracion "$TMP/con-modelo.txt" 2>&1)"
check "declara cuántas ignoró" "1" \
      "$(echo "$salida" | grep -c 'filas de nivel MODELO ignoradas: 1' || true)"

echo
echo "resultado: $ok ok, $fail fallas"
[ "$fail" -eq 0 ]
