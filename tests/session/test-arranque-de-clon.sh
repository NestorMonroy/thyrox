#!/usr/bin/env bash
# Pruebas de `clone_bootstrap.py` — el puente que deja a un clon nuevo con los
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
#
# REESCRITA — la version anterior CODIFICABA el diseno de una sola raiz, y por
# eso no podia pasar. Copiaba los mecanismos a `$CLON/src/session/` —un
# directorio que su propio `mkdir -p` no creaba— y corria la copia, con lo que
# el clon sintetico hacia de consumidor Y de proveedor a la vez. Su 1b exigia
# «cero comandos citan $DOCS_ROOT» con `$DOCS_ROOT` = la raiz del PROVEEDOR:
# bajo DEC-04 un comando de mecanismo tiene que citarla, asi que la asercion
# pedia lo contrario de lo correcto.
#
# Ahora hay DOS raices y ninguna se copia: el guion vive en el proveedor y se
# invoca con `--docs-root $CLON --raiz $TMP`. El 1b se parte en tres, porque
# «a donde apunta un comando» son tres preguntas distintas:
#
#     1b-i.   el script citado vive en el PROVEEDOR
#     1b-ii.  `--repo`/`--viva`/`--base` citan el CONSUMIDOR y su arbol
#     1b-iii. ninguno cita el arbol real de quien corre la prueba
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
DOCS_ROOT="$(thyrox_root)" || exit 2
GUION="$DOCS_ROOT/src/session/clone_bootstrap.py"
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

# Clon sintetico: SOLO lo que un consumidor aporta —su settings.json versionado
# y su bitacora de aprobaciones—. Los MECANISMOS no se copian aqui: viven en el
# proveedor y se invocan desde ahi (DEC-04). Copiarlos era el defecto de la
# version anterior, y ademas fallaba: el `cp` apuntaba a `$CLON/src/session/`,
# que ningun `mkdir` creaba.
CLON="$TMP/kaupamex-docs"
mkdir -p "$CLON/.claude/hooks" "$CLON/.claude-user"
# Los dos aportes del consumidor se SINTETIZAN, no se copian de un clon vivo.
# Copiarlos ataba la prueba al estado de otro repositorio —y de hecho el
# proveedor no los tiene, que es por lo que la version anterior no podia pasar—.
# Sintetizados, la prueba mide la conducta del guion y no la de un tercero.
cat > "$CLON/.claude/settings.json" <<'JSON'
{
  "hooks": {
    "SessionStart": [
      {"hooks": [{"type": "command",
                  "command": "bash .claude/hooks/saludo-del-clon.sh"}]}
    ]
  },
  "permissions": {"allow": ["Bash(git status)"]}
}
JSON
cat > "$CLON/.claude-user/bitacora-de-aprobaciones.json" <<'JSON'
{"allow": ["Bash(git status)",
           "Read(%%CONSUMER_ROOT%%/.claude/settings.json)",
           "Read(%%RAIZ%%/.claude/settings.local.json)"]}
JSON
VIVA="$TMP/.claude/settings.local.json"

# La raiz del proveedor se DECLARA, no se deja al ascenso: asi el comando que
# el guion emite es predecible y las aserciones pueden nombrarlo.
export THYROX_ROOT="$DOCS_ROOT"

# El guion real, apuntado al clon sintetico. `--raiz` fija donde cae la copia
# viva, para que ni una asercion toque la de quien corre la prueba.
arranque() { python3 "$GUION" --docs-root "$CLON" --raiz "$TMP" "$@"; }

# Los comandos de la copia viva, como lista.
comandos() { python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print('\\n'.join(h['command'] for a in d['hooks'].values()
                 for m in a for h in m.get('hooks',[])))" "$1"; }

# --- Caso 1: clon limpio -> escribe, y cada token apunta a SU raiz -----------
arranque --si >/dev/null 2>&1
comprobar "1a. escribe la copia viva" "si" \
    "$([ -f "$VIVA" ] && echo si || echo no)"

# El script de un comando es MECANISMO: vive en el proveedor. Exigirle que cite
# al consumidor —lo que hacia la version anterior— pedia lo contrario de DEC-04.
# Se acota a los comandos del MECANISMO: los hooks propios del consumidor
# citan al consumidor con razon —son suyos— y meterlos en el denominador hacia
# que la asercion midiera dos poblaciones bajo un rotulo (sub-patron A).
comprobar "1b-i. el script del mecanismo vive en el proveedor" "0" \
    "$(comandos "$VIVA" | grep "sync_local_settings.py" | awk '{print $2}' \
       | grep -cv "^$DOCS_ROOT/" || true)"
comprobar "1b-i-bis. y hay comandos de mecanismo que medir" "5" \
    "$(comandos "$VIVA" | grep -c "sync_local_settings.py" || true)"

# Sus ARGUMENTOS son parametro del consumidor: `--repo` en el clon, `--viva` y
# `--base` bajo la raiz que se le declaro.
comprobar "1b-ii. --repo cita al consumidor" "si" \
    "$(comandos "$VIVA" | grep -q -- "--repo $CLON/" && echo si || echo no)"
comprobar "1b-ii-bis. --viva cita la raiz declarada" "si" \
    "$(comandos "$VIVA" | grep -q -- "--viva $TMP/" && echo si || echo no)"

# Y nada cita el arbol REAL del consumidor, que es el literal congelado en los
# datos del sincronizador. Esa fuga es un fallo distinto de una sustitucion
# omitida, y es la que esta asercion mide.
comprobar "1b-iii. cero tokens citan el arbol real" "0" \
    "$(comandos "$VIVA" | grep -c "/home/user/kaupamex-docs" || true)"

comprobar "1c. ningun marcador queda sin sustituir" "0" \
    "$(comandos "$VIVA" | grep -c "%%" || true)"

# --- Caso 2: CONTROL ANULADO — sin el marcador del proveedor, 1b-i cae -------
# Un verde en 1b-i no distingue «la sustitucion funciona» de «la prueba no
# mira». Se anula sobre una COPIA del sincronizador: uno de sus comandos vuelve
# al literal congelado de antes de la mudanza, y tiene que reaparecer
# exactamente el dano —un script fuera del proveedor, y el AVISO que lo nombra.
PROV_ANULADO="$TMP/proveedor-anulado"
mkdir -p "$PROV_ANULADO/src"
cp -r "$DOCS_ROOT/src/paths" "$DOCS_ROOT/src/session" "$PROV_ANULADO/src/"
python3 - "$PROV_ANULADO/src/session/sync_local_settings.py" <<'PYA'
import pathlib, sys
f = pathlib.Path(sys.argv[1]); t = f.read_text()
viejo = "python3 %%PROVEEDOR%%/src/session/sync_local_settings.py"
nuevo = "python3 /home/user/kaupamex-docs/.claude/scripts/session/sync_local_settings.py"
asentado = t.replace(viejo, nuevo, 1)
assert asentado != t, "la anulacion no encontro que anular"
f.write_text(asentado)
PYA
SALIDA_ANULADA="$(THYROX_ROOT="$PROV_ANULADO" python3 \
    "$PROV_ANULADO/src/session/clone_bootstrap.py" \
    --docs-root "$CLON" --raiz "$TMP/anulado" --solo-mostrar 2>&1)"
comprobar "2. anulado el marcador, el guion avisa del script inexistente" "si" \
    "$(printf '%s' "$SALIDA_ANULADA" | grep -q "AVISO" && echo si || echo no)"
# El literal congelado NO reaparece tal cual, y eso es correcto: el guion lo
# re-marca contra `sync.REPO_ROOT` y lo rinde al consumidor. Lo que el dano SI
# produce es que el script del MECANISMO se busque FUERA del proveedor — la
# negacion exacta de 1b-i, que es lo que esta asercion mide.
comprobar "2-bis. y el mecanismo se busca fuera del proveedor" "si" \
    "$(printf '%s' "$SALIDA_ANULADA" | grep "sync_local_settings.py" \
       | grep -qv "^ *$DOCS_ROOT/" && echo si || echo no)"

# --- Caso 3: union, nunca reemplazo -----------------------------------------
python3 - "$VIVA" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d["permissions"]["allow"] = ["Bash(aprobacion-propia-del-desarrollador)"]
json.dump(d, open(sys.argv[1], "w"))
PY
arranque --si >/dev/null 2>&1
comprobar "3. la aprobacion propia sobrevive a una segunda instalacion" "si" \
    "$(python3 -c "
import json,sys
a=json.load(open(sys.argv[1]))['permissions']['allow']
print('si' if 'Bash(aprobacion-propia-del-desarrollador)' in a else 'no')" "$VIVA")"

# --- Caso 4: --solo-mostrar no escribe --------------------------------------
ANTES="$(md5sum < "$VIVA")"
arranque --solo-mostrar >/dev/null 2>&1
comprobar "4. --solo-mostrar deja el archivo intacto" "$ANTES" "$(md5sum < "$VIVA")"

# --- Caso 5: sin terminal y sin --si, no escribe y sale 1 -------------------
rm -f "$VIVA"
arranque </dev/null >/dev/null 2>&1
comprobar "5a. sin --si y sin terminal sale 1" "1" "$?"
comprobar "5b. y no escribio nada" "no" \
    "$([ -f "$VIVA" ] && echo si || echo no)"

# --- Caso 6: sin bitacora versionada, error y NINGUN archivo a medias -------
mv "$CLON/.claude-user/bitacora-de-aprobaciones.json" "$TMP/guardada.json"
arranque --si >/dev/null 2>&1
comprobar "6a. sin bitacora sale distinto de cero" "1" "$?"
comprobar "6b. y no dejo un archivo sin aprobaciones" "no" \
    "$([ -f "$VIVA" ] && echo si || echo no)"
mv "$TMP/guardada.json" "$CLON/.claude-user/bitacora-de-aprobaciones.json"

# --- Caso 7: --capturar es la inversa de la instalacion ----------------------
arranque --si >/dev/null 2>&1
arranque --capturar >/dev/null 2>&1
comprobar "7. capturar y volver a instalar da el mismo conjunto" "si" \
    "$(python3 - "$VIVA" "$CLON/.claude-user/bitacora-de-aprobaciones.json" "$CLON" "$TMP" <<'PY'
import json, sys
viva, payload, clon, raiz = sys.argv[1:5]
antes = set(json.load(open(viva))["permissions"]["allow"])
crudo = json.load(open(payload))["allow"]
render = {r.replace("%%CONSUMER_ROOT%%", clon).replace("%%RAIZ%%", raiz) for r in crudo}
print("si" if antes == render else "no")
PY
)"

# --- Caso 8: el aviso de ruta rota SI puede fallar ---------------------------
# Control positivo: en el clon sintetico ningun hook existe todavia, asi que el
# aviso debe dispararse. Si se crean los archivos, debe callarse.
comprobar "8a. con los hooks ausentes, el guion avisa" "si" \
    "$(arranque --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
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
    "$(arranque --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
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
    "$(arranque --solo-mostrar 2>&1 | grep -q "AVISO" && echo si || echo no)"
comprobar "8c-bis. y nombra al que falta" "si" \
    "$(arranque --solo-mostrar 2>&1 | grep -qF "$VICTIMA" && echo si || echo no)"

printf 'test-arranque-de-clon: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[ "$FALLOS" -eq 0 ]
