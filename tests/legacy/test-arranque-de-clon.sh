#!/usr/bin/env bash
# Pruebas de `arranque_de_clon.py` — el puente que deja a un clon nuevo con los
# hooks de sesion cargados.
#
# Todo corre contra un CLON SINTETICO en un directorio temporal. Ni una sola
# asercion toca el `settings.local.json` real: si lo tocara, la prueba
# reescribiria la configuracion de quien la corre.
#
# El caso 2 es un CONTROL ANULADO — se salta la sustitucion de raiz a proposito
# y comprueba que el caso 1 la habria visto. Sin el, un verde en el caso 1 no
# distingue «la sustitucion funciona» de «la prueba no mira».
#
# Y el control anulado corrigio a esta misma suite. Anulando `render()` en el
# guion —devolviendo el valor sin sustituir— cayeron exactamente estas dos:
#
#     1c. todos apuntan al clon sintetico     FALLO
#     7.  capturar y volver a instalar        FALLO
#     1b. cero apuntan al arbol real          verde  <- NO discrimina
#
# El 1b pasa por el motivo equivocado: sin sustitucion el marcador se queda
# literal (`%%DOCS_ROOT%%`), asi que tampoco cita el arbol real. Sigue en la
# suite porque cubre OTRA cosa —una fuga, que es un fallo distinto de una
# sustitucion omitida— pero la aserción que mide la sustitucion es la 1c.
set -uo pipefail

DOCS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$DOCS_ROOT/.claude/scripts/session/arranque_de_clon.py"
OK=0; FALLOS=0

comprobar() {  # comprobar <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then
        OK=$((OK + 1))
    else
        FALLOS=$((FALLOS + 1))
        printf 'FALLO: %s\n  esperado: %s\n  obtenido: %s\n' "$1" "$2" "$3" >&2
    fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Clon sintetico: sólo los archivos que el guion lee.
CLON="$TMP/kaupamex-docs"
# El clon espeja la estructura POR CLASE (`scripts/session/`), no un
# `scripts/` plano: el guion deriva la raiz con `parents[3]`, asi que copiarlo
# un nivel mas arriba le daria una raiz equivocada y todas las aserciones
# fallarian por la ruta, no por la conducta que miden.
mkdir -p "$CLON/.claude/scripts/session" "$CLON/.claude/hooks" "$CLON/.claude-user"
cp "$DOCS_ROOT/.claude/settings.json"                       "$CLON/.claude/"
cp "$DOCS_ROOT/.claude/scripts/session/sincronizar_settings_local.py" \
   "$CLON/.claude/scripts/session/"
cp "$GUION"                                                  "$CLON/.claude/scripts/session/"
cp "$DOCS_ROOT/.claude-user/bitacora-de-aprobaciones.json"    "$CLON/.claude-user/"
GUION_SINT="$CLON/.claude/scripts/session/arranque_de_clon.py"
VIVA="$TMP/.claude/settings.local.json"

# --- Caso 1: clon limpio -> escribe, y NADA apunta al arbol real -------------
python3 "$GUION_SINT" --si >/dev/null 2>&1
comprobar "1a. escribe la copia viva" "si" \
    "$([ -f "$VIVA" ] && echo si || echo no)"
comprobar "1b. cero comandos apuntan al arbol real" "0" \
    "$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
c=[h['command'] for a in d['hooks'].values() for m in a for h in m.get('hooks',[])]
print(sum(1 for x in c if '$DOCS_ROOT' in x))" "$VIVA")"
comprobar "1c. todos apuntan al clon sintetico" "si" \
    "$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
c=[h['command'] for a in d['hooks'].values() for m in a for h in m.get('hooks',[])]
print('si' if c and all('$CLON' in x for x in c) else 'no')" "$VIVA")"

# --- Caso 2: CONTROL ANULADO — sin sustituir la raiz, el caso 1b caeria ------
# El guion original vive en el arbol real y su DOCS_ROOT apunta ahi. Correrlo
# desde ahi contra la misma raiz reproduce lo que pasaria si la sustitucion no
# ocurriera: los comandos citan el arbol real.
python3 "$GUION" --raiz "$TMP/anulado" --si >/dev/null 2>&1
comprobar "2. instalado desde el arbol real, los comandos SI lo citan" "si" \
    "$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
c=[h['command'] for a in d['hooks'].values() for m in a for h in m.get('hooks',[])]
print('si' if any('$DOCS_ROOT' in x for x in c) else 'no')" \
    "$TMP/anulado/.claude/settings.local.json")"

# --- Caso 3: union, nunca reemplazo -----------------------------------------
python3 - "$VIVA" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["permissions"]["allow"] = ["Bash(aprobacion-propia-del-desarrollador)"]
json.dump(d, open(sys.argv[1], "w"))
PY
python3 "$GUION_SINT" --si >/dev/null 2>&1
comprobar "3. la aprobacion propia sobrevive a una segunda instalacion" "si" \
    "$(python3 -c "
import json,sys
a=json.load(open(sys.argv[1]))['permissions']['allow']
print('si' if 'Bash(aprobacion-propia-del-desarrollador)' in a else 'no')" "$VIVA")"

# --- Caso 4: --solo-mostrar no escribe --------------------------------------
ANTES="$(md5sum < "$VIVA")"
python3 "$GUION_SINT" --solo-mostrar >/dev/null 2>&1
comprobar "4. --solo-mostrar deja el archivo intacto" "$ANTES" "$(md5sum < "$VIVA")"

# --- Caso 5: sin terminal y sin --si, no escribe y sale 1 -------------------
rm -f "$VIVA"
python3 "$GUION_SINT" </dev/null >/dev/null 2>&1
comprobar "5a. sin --si y sin terminal sale 1" "1" "$?"
comprobar "5b. y no escribio nada" "no" \
    "$([ -f "$VIVA" ] && echo si || echo no)"

# --- Caso 6: sin bitacora versionada, error y NINGUN archivo a medias -------
mv "$CLON/.claude-user/bitacora-de-aprobaciones.json" "$TMP/guardada.json"
python3 "$GUION_SINT" --si >/dev/null 2>&1
comprobar "6a. sin bitacora sale distinto de cero" "1" "$?"
comprobar "6b. y no dejo un archivo sin aprobaciones" "no" \
    "$([ -f "$VIVA" ] && echo si || echo no)"
mv "$TMP/guardada.json" "$CLON/.claude-user/bitacora-de-aprobaciones.json"

# --- Caso 7: --capturar es la inversa de la instalacion ----------------------
python3 "$GUION_SINT" --si >/dev/null 2>&1
python3 "$GUION_SINT" --capturar >/dev/null 2>&1
comprobar "7. capturar y volver a instalar da el mismo conjunto" "si" \
    "$(python3 - "$VIVA" "$CLON/.claude-user/bitacora-de-aprobaciones.json" "$CLON" "$TMP" <<'PY'
import json, sys
viva, payload, clon, raiz = sys.argv[1:5]
antes = set(json.load(open(viva))["permissions"]["allow"])
crudo = json.load(open(payload))["allow"]
render = {r.replace("%%DOCS_ROOT%%", clon).replace("%%RAIZ%%", raiz) for r in crudo}
print("si" if antes == render else "no")
PY
)"

# --- Caso 8: el aviso de ruta rota SI puede fallar ---------------------------
# Control positivo: en el clon sintetico ningun hook existe todavia, asi que el
# aviso debe dispararse. Si se crean los archivos, debe callarse.
comprobar "8a. con los hooks ausentes, el guion avisa" "si" \
    "$(python3 "$GUION_SINT" --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
python3 - "$CLON" <<'PY'
import json, pathlib, sys
clon = pathlib.Path(sys.argv[1])
d = json.load(open(clon / ".claude" / "settings.json"))
for arr in d.get("hooks", {}).values():
    for m in arr:
        for h in m.get("hooks", []):
            for tok in h["command"].split():
                if tok.startswith(".claude/"):
                    p = clon / tok
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.touch()
PY
# El 8b se mide en el estado REAL de un clon recien hecho: los scripts de hook
# presentes y `settings_local.base.json` AUSENTE. Antes se le hacia `touch` a
# ese archivo justo antes de la asercion, y por eso la suite no veia H-DOCS-303
# — el positivo real era exactamente el estado que la prueba borraba.
comprobar "8b. con los scripts presentes, se calla aunque falte la base" "no" \
    "$(python3 "$GUION_SINT" --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
comprobar "8b-bis. y la base sigue sin existir" "no" \
    "$([ -e "$CLON/.claude/agent-results/settings_local.base.json" ] && echo si || echo no)"

# --- Caso 8c: CONTROL — el aviso vuelve si falta un script de verdad --------
# Sin esta asercion, el 8b en verde no distingue «el aviso discrimina» de «el
# aviso ya no mira nada». Se retira UN script real y se exige que lo nombre.
VICTIMA="$(python3 - "$CLON" <<'PY'
import json, pathlib, sys
clon = pathlib.Path(sys.argv[1])
d = json.load(open(clon / ".claude" / "settings.json"))
for arr in d.get("hooks", {}).values():
    for m in arr:
        for h in m.get("hooks", []):
            for tok in h["command"].split():
                if tok.startswith(".claude/"):
                    print(tok); sys.exit(0)
PY
)"
rm -f "$CLON/$VICTIMA"
comprobar "8c. retirado un script real, el aviso vuelve" "si" \
    "$(python3 "$GUION_SINT" --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
comprobar "8c-bis. y nombra al que falta" "si" \
    "$(python3 "$GUION_SINT" --solo-mostrar 2>&1 | grep -qF "$VICTIMA" && echo si || echo no)"

printf 'test-arranque-de-clon: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[ "$FALLOS" -eq 0 ]
