#!/bin/bash
# =============================================================================
# reconciliar-agentes.sh — clasificar el trabajo en segundo plano por su
# estado real, y CONFIRMAR la muerte antes de relanzar
# =============================================================================
#
# Por qué existe
# --------------
# `bash-background-tasks.md`, sección "Reconciliación tras resume", reconcilia
# **a mano** con tres comandos (`ps`, `TaskStop`, `git status` por repo) y no
# distingue dos situaciones que exigen conductas opuestas:
#
#   • **atascado** — el trabajo sigue existiendo y no avanza. Relanzarlo
#     duplica el trabajo: dos copias escribiendo el mismo working tree.
#   • **desaparecido** — murió sin decirlo. Relanzarlo es lo correcto.
#
# ERR-12 rozó exactamente ese riesgo: un summary declaraba dos tandas "RUNNING"
# y las dos habían terminado dejando trabajo sin commitear. Se reconcilió a
# mano; si en vez de eso se hubiera relanzado, habrían corrido dos copias.
#
# La distinción vanished/stalled viene de `hccw: 21-background-fleet.md:§21.4`
# (versión 2.1.202). Se adapta la IDEA, no la implementación: nuestro binario
# (2.1.42) no tiene esas cadenas y no hace falta que las tenga — igual que la
# referencia Odoo gobierna sin ejecutarse. Ver :ref:`h-docs-138`.
#
# **Corregido 2026-08-13 (:ref:`h-docs-140`).** Esta cabecera atribuía el guard
# de abajo a `_respawn_unconfirmed_bail`. Es falso, y lo corrige una fuente de
# mayor calidad: `ccb: bgDaemon.ts:462-469` muestra que ese evento dispara
# cuando el trabajo **muere antes de confirmar que arrancó**, para que quien
# espera reciba el error real en vez de un timeout — eso vive ahora en
# `esperar-marcador.sh`, no aquí. La anti-duplicación que sí hace este guion
# es `tengu_bg_respawn_stale` (`:638-642`), y el contador de intentos de más
# abajo es `respawn-stalled` (`:599-604`). Tres nombres, tres mecanismos.
#
# El roster ya existía y no lo usábamos
# --------------------------------------
# Medido 2026-08-13 sobre esta sesión, `/tmp/claude-0/-home-user/<sesión>/tasks`:
#
#   84 symlinks  → subagentes; apuntan a `subagents/agent-<id>.jsonl`
#  172 archivos  → tareas de `Bash(run_in_background)`; son su propio stdout
#    0 enlaces rotos
#
# Es un roster con marca de tiempo por entrada. La reconciliación manual nunca
# lo consultó: iba a `ps`, que no ve a los subagentes porque no son procesos.
#
# Qué marcador terminal tiene cada clase (medido, y NO es simétrico)
# -------------------------------------------------------------------
# Subagentes — la última línea del JSONL:
#
#     83 de 84   assistant con bloque `text`   → cerró con su reporte final
#      1 de 84   `user` (un tool_result)       → murió a media frase
#
# Ese 1 es el control positivo: existe en el repo, no se fabricó. Es la firma
# del subagente cortado por `maxTurns`, que `agent-results-to-docs.md` ya
# describía sin poder detectarlo ("no devuelve mensaje final").
#
# Tareas bash — tres poblaciones, y la mayor no es decidible:
#
#      7 de 172  `[exited with code N]`  (marcador del harness)
#     75 de 172  `^EXIT=N`               (marcador nuestro, patrón R-2.0)
#     90 de 172  sin marcador            → **INDECIDIBLE desde el archivo**
#
# Ese 52 % indecidible es la justificación medida del guard: en más de la mitad
# de los casos la muerte NO se puede confirmar, así que relanzar sobre esa base
# es apostar. El guard convierte "no puedo saberlo" en "no relanzo", nunca en
# "supongo que murió".
#
# Corolario que valida R-2.0: los 75 decidibles lo son porque alguien escribió
# `echo EXIT=$?`. Es la única razón por la que no son 90+75.
#
# Qué NO hace
# -----------
#   • No mapea id → PID: el `.output` no guarda el pid y el subagente no es un
#     proceso. La vivacidad se mide por avance de mtime, no por `ps`.
#   • No mata ni relanza nada. Clasifica y, con `--confirmar-muerte`, autoriza
#     o deniega. La acción es del llamador.
#   • No mira el working tree. Eso ya lo cubre el paso 3 de la regla.
#
# Uso
# ---
#   bash .claude/scripts/agents/reconciliar-agentes.sh                  # reporte
#   bash .claude/scripts/agents/reconciliar-agentes.sh --quiet          # sólo conteos
#   bash .claude/scripts/agents/reconciliar-agentes.sh --vigilar 20     # 2 muestras
#   bash .claude/scripts/agents/reconciliar-agentes.sh --confirmar-muerte <id>
#       exit 0 = muerte CONFIRMADA  → relanzar es seguro
#       exit 2 = BAIL               → no se pudo confirmar, NO relanzar
# =============================================================================

set -euo pipefail

WINDOW_SECONDS="${RECONCILIAR_VENTANA:-900}"   # 15 min = ciclo largo del loop
# Holgura de reloj, SEPARADA de la ventana a proposito: quien escribe el
# timestamp puede no compartir reloj con quien lo lee. El binario la declara
# como constante aparte (CLOCK_SKEW_ALLOWANCE_MS=60000, build 2.1.261) en vez
# de incrustarla en el umbral, y por la misma razon.
CLOCK_SKEW_SECONDS="${RECONCILIAR_HOLGURA_RELOJ:-60}"
MODE="reporte"
WATCH_SECONDS=0
TARGET_ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quiet)            MODE="quiet"; shift ;;
    --vigilar)          WATCH_SECONDS="${2:?--vigilar exige segundos}"; shift 2 ;;
    --confirmar-muerte) MODE="confirmar"; TARGET_ID="${2:?--confirmar-muerte exige un id}"; shift 2 ;;
    --ventana)          WINDOW_SECONDS="${2:?--ventana exige segundos}"; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 64 ;;
  esac
done

# --- Resolver el roster --------------------------------------------------
# Prioridad: variable de entorno declarada > heurística de mtime. Mismo
# criterio que snapshot-tasks.sh: adivinar cuando el entorno lo declara es
# medir mal.
ROSTER="${RECONCILIAR_ROSTER:-}"
ORIGEN_ROSTER="declarado"
if [[ -z "$ROSTER" ]]; then
  ORIGEN_ROSTER="mtime (heurística)"
  ROSTER=$(find /tmp/claude-0 -maxdepth 3 -type d -name tasks -printf '%T@ %p\n' 2>/dev/null \
           | sort -rn | head -1 | cut -d' ' -f2- || true)
fi

if [[ -z "$ROSTER" || ! -d "$ROSTER" ]]; then
  echo "reconciliar-agentes: no hay roster legible (probé: ${ROSTER:-<vacío>})" >&2
  exit 3
fi

NOW=$(date +%s)

# Localizador de THYROX, donde vive el veredicto: la variable si esta
# declarada; si no, el hermano `thyrox/` ascendiendo desde aqui (H-DOCS-1081).
LECTOR=""
if [[ -n "${THYROX_ROOT:-}" ]]; then
    LECTOR="$THYROX_ROOT/src"
else
    NIVEL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$NIVEL" != "/" ]]; do
        if [[ -f "$NIVEL/thyrox/src/roster/job_liveness.py" ]]; then
            LECTOR="$NIVEL/thyrox/src"; break
        fi
        NIVEL="$(dirname "$NIVEL")"
    done
fi
if [[ -z "$LECTOR" || ! -f "$LECTOR/roster/job_liveness.py" ]]; then
    # REHUSA en vez de degradar: sin el primitivo no se puede clasificar, y
    # publicar un roster sin veredictos se leeria como «no hay nada que
    # reconciliar» — el cero silencioso que este guion existe para no dar.
    echo "reconciliar-agentes: no se encontro thyrox/src/roster/job_liveness.py" >&2
    exit 2
fi

# --- Forma terminal de UNA entrada ---------------------------------------
# Emite una de: terminado | anormal | sin-marcador
terminal_shape() {
  local entry="$1"
  if [[ -L "$entry" ]]; then
    local target; target=$(readlink -f "$entry" 2>/dev/null || true)
    [[ -f "$target" ]] || { echo "anormal"; return; }   # destino perdido
    tail -1 "$target" 2>/dev/null | python3 -c '
import sys, json
try:
    o = json.load(sys.stdin)
except Exception:
    print("sin-marcador"); raise SystemExit
msg = o.get("message") or {}
content = msg.get("content")
if o.get("type") == "assistant" and isinstance(content, list) \
   and any(b.get("type") == "text" for b in content):
    print("terminado")          # cerró con su reporte final
else:
    print("anormal")            # murió a media frase: tool_result o tool_use suelto
' 2>/dev/null || echo "sin-marcador"
  else
    # Tarea bash: dos marcadores posibles, ninguno garantizado.
    #
    # Se compara con el motor de expresiones de bash, NO con `grep` en tubería.
    # `grep -q` cierra la tubería al primer match, el productor muere con
    # SIGPIPE (141) y bajo `pipefail` el pipeline entero sale distinto de 0
    # aunque el patrón HAYA coincidido — el `if` leería falso. Es la forma de
    # H-DOCS-120, medida dos veces más al escribir snapshot-tasks.sh y su test.
    local tail_text; tail_text=$(tail -5 "$entry" 2>/dev/null || true)
    if [[ "$tail_text" =~ \[exited\ with\ code\ [0-9]+\] ]]; then
      echo "terminado"
    elif [[ "$tail_text" =~ (^|$'\n')EXIT=[0-9]+ ]]; then
      echo "terminado"
    else
      echo "sin-marcador"       # 90 de 172 medidos: NO decidible desde el archivo
    fi
  fi
}

# --- Veredicto de UNA entrada --------------------------------------------
# terminado | vivo | atascado | desaparecido | indecidible
classify() {
  local entry="$1" shape age mtime veredicto
  shape=$(terminal_shape "$entry")
  # -L: la entrada de un subagente es un SYMLINK a su transcript, y `stat` sin
  # -L mide el enlace — que no cambia desde que el harness lo creo. Medido
  # 2026-09-02 (H-DOCS-1004): seis agentes vivos reportados «atascado 11-14
  # min» con el enlace a las 05:06 y el transcript creciendo a las 05:22.
  mtime=$(stat -L -c %Y "$entry" 2>/dev/null || echo 0)
  age=$(( NOW - mtime ))

  # El veredicto lo decide `thyrox: src/roster/job_liveness.py`; aqui solo se
  # inyectan los parametros de este consumidor (la ventana y la holgura) y se
  # traduce al vocabulario que este guion ya publicaba.
  veredicto=$(THYROX_SRC="$LECTOR" python3 - "$shape" "$age" "$WINDOW_SECONDS" "$CLOCK_SKEW_SECONDS" <<'DIAGNOSTICO'
import os, sys
sys.path.insert(0, os.environ["THYROX_SRC"])
from roster.job_liveness import diagnose

FORMA = {"terminado": "terminated", "anormal": "cut", "sin-marcador": "pending"}
d = diagnose(FORMA[sys.argv[1]], float(sys.argv[2]),
             stale_after=float(sys.argv[3]), clock_skew=float(sys.argv[4]))
print(d.verdict)
DIAGNOSTICO
)

  case "$veredicto" in
    terminated)       echo "terminado" ;;
    stalled_evident)  echo "desaparecido" ;;   # hay evidencia POSITIVA del corte
    stalled_unknown)  echo "indecidible" ;;    # ausencia de marcador != muerte
    recent)
      # Escribio dentro de la ventana. Una segunda muestra SI separa "sigue
      # trabajando" de "se quedo pegado", y es la unica senal que el primitivo
      # no tiene: mide un instante, no dos.
      if (( WATCH_SECONDS > 0 )); then
        local before="$mtime" after
        sleep "$WATCH_SECONDS"
        after=$(stat -L -c %Y "$entry" 2>/dev/null || echo 0)
        if (( after > before )); then echo "vivo"; else echo "atascado"; fi
      else
        # ANTES decia "atascado", y eso NO era conservador: era el veredicto
        # contrario, y es el que reporto seis agentes vivos como atascados
        # (H-DOCS-1004). Sin segunda muestra no se puede afirmar ninguno de
        # los dos, asi que se publica el tercero: escribio hace poco, y quien
        # lo lea sabe que lo decidio la senal debil.
        echo "reciente"
      fi
      ;;
    *)                echo "indecidible" ;;
  esac
}

# --- Modo: confirmar muerte antes de relanzar ----------------------------
if [[ "$MODE" == "confirmar" ]]; then
  ENTRY="$ROSTER/${TARGET_ID}.output"
  if [[ ! -e "$ENTRY" ]]; then
    echo "BAIL — no hay entrada de roster para '$TARGET_ID' en $ROSTER"
    echo "       Una entrada ausente no es prueba de muerte: puede ser el id"
    echo "       equivocado, u otro roster. No relanzar."
    exit 2
  fi
  # Contador de relanzamientos — adaptado de `ccb: bgDaemon.ts:599-604`
  # (`respawn-stalled`), que rehúsa el segundo con `EGAVEUP`:
  #
  #     const attempts = oldRecord.attachStallRespawns ?? 0
  #     if (attempts >= 1) { … return err('EGAVEUP', `… not respawning again`) }
  #
  # Sin esto, una muerte confirmada autoriza relanzar tantas veces como se
  # pregunte: un trabajo que muere siempre por su propia causa entra en bucle
  # de relanzamiento, y cada vuelta parece legítima porque la muerte ES real.
  # El guard de muerte responde "¿está muerto?"; éste responde "¿ya lo
  # intentamos?", que es una pregunta distinta.
  LEDGER="$ROSTER/.reconciliar-respawns"
  attempts=0
  if [[ -f "$LEDGER" ]]; then
    attempts=$(awk -v k="$TARGET_ID" '$1==k {print $2; exit}' "$LEDGER" 2>/dev/null || echo 0)
    attempts="${attempts:-0}"
  fi

  VERDICT=$(classify "$ENTRY")
  if [[ "$VERDICT" == "desaparecido" && "$attempts" -ge 1 ]]; then
    echo "BAIL — $TARGET_ID ya se relanzó $attempts vez/veces y volvió a morir."
    echo "       La muerte es real, pero relanzar otra vez repite la causa en"
    echo "       vez de arreglarla. Diagnosticar antes de insistir."
    echo "       (para forzar: borrar su línea de $LEDGER)"
    exit 2
  fi

  case "$VERDICT" in
    desaparecido)
      printf '%s %s\n' "$TARGET_ID" "$(( attempts + 1 ))" >> "$LEDGER"
      echo "MUERTE CONFIRMADA — $TARGET_ID"
      echo "  forma terminal : anormal (cortado a media frase)"
      echo "  sin escribir   : $(( (NOW - $(stat -L -c %Y "$ENTRY")) / 60 )) min (ventana ${WINDOW_SECONDS}s)"
      echo "  relanzar es seguro: no hay copia viva que duplicar."
      exit 0 ;;
    *)
      echo "BAIL — $TARGET_ID está '$VERDICT', no 'desaparecido'."
      case "$VERDICT" in
        terminado)   echo "       Ya cerró. Relanzarlo repetiría trabajo hecho." ;;
        vivo)        echo "       Su mtime avanzó durante la vigilancia. Sigue trabajando." ;;
        reciente)    echo "       Escribió dentro de la ventana. Sin una segunda muestra" ;
                     echo "       no se sabe si avanza, y relanzarlo pondría DOS copias" ;
                     echo "       sobre el mismo working tree." ;;
        atascado)    echo "       Escribió dentro de la ventana y no cerró. Relanzarlo" ;
                     echo "       pondría DOS copias sobre el mismo working tree." ;;
        indecidible) echo "       Sin marcador terminal y sin forma medible del corte." ;
                     echo "       Es el 52 % medido: la muerte NO se puede confirmar aquí." ;;
      esac
      exit 2 ;;
  esac
fi

# --- Modo: reporte / quiet -----------------------------------------------
declare -A COUNT=( [terminado]=0 [vivo]=0 [reciente]=0 [atascado]=0 [desaparecido]=0 [indecidible]=0 )
TOTAL=0
DETAIL=""

while IFS= read -r entry; do
  [[ -n "$entry" ]] || continue
  TOTAL=$(( TOTAL + 1 ))
  v=$(classify "$entry")
  COUNT[$v]=$(( ${COUNT[$v]} + 1 ))
  if [[ "$v" == "desaparecido" || "$v" == "atascado" ]]; then
    id=$(basename "$entry" .output)
    kind=$([[ -L "$entry" ]] && echo subagente || echo bash)
    mins=$(( (NOW - $(stat -L -c %Y "$entry" 2>/dev/null || echo "$NOW")) / 60 ))
    DETAIL+="  $v  $id  ($kind, sin escribir ${mins} min)"$'\n'
  fi
done < <(find "$ROSTER" -maxdepth 1 -name '*.output' 2>/dev/null | sort)

if [[ "$MODE" == "quiet" ]]; then
  echo "reconciliar-agentes: desaparecidos=${COUNT[desaparecido]} atascados=${COUNT[atascado]} indecidibles=${COUNT[indecidible]} (alcance medido: $TOTAL entradas de roster)"
  exit 0
fi

echo "== reconciliación del roster =="
echo "roster    : $ROSTER  [$ORIGEN_ROSTER]"
echo "ventana   : ${WINDOW_SECONDS}s$( (( WATCH_SECONDS > 0 )) && echo "  · vigilancia: ${WATCH_SECONDS}s" )"
echo
printf '  %-14s %s\n' terminado    "${COUNT[terminado]}"
printf '  %-14s %s\n' vivo         "${COUNT[vivo]}"
printf '  %-14s %s\n' reciente     "${COUNT[reciente]}"
printf '  %-14s %s\n' atascado     "${COUNT[atascado]}"
printf '  %-14s %s\n' desaparecido "${COUNT[desaparecido]}"
printf '  %-14s %s\n' indecidible  "${COUNT[indecidible]}"
echo "  ------------------------"
printf '  %-14s %s\n' TOTAL "$TOTAL"
[[ -n "$DETAIL" ]] && { echo; echo "$DETAIL"; }
echo "Sólo 'desaparecido' autoriza relanzar, y sólo vía --confirmar-muerte <id>."
echo "'indecidible' NO es 'muerto': es que este instrumento no puede verlo."
exit 0
