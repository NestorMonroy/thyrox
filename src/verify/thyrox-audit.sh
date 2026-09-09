#!/bin/bash
# =============================================================================
# src/verify/thyrox-audit.sh — auditoría mecánica de coherencia (kaupamex)
# =============================================================================
# Corre los gates verificables del monorepo kaupamex y emite un score por
# chequeo. NO corrige — documenta. El juicio cualitativo lo añade el agente
# increment-acceptor vía /thyrox:audit-coherence.
#
# Adaptado del thyrox-audit.sh de NestorMonroy/thyrox (Command -> Script +
# Agente), repunteado a la realidad de kaupamex: estado en el SMD (no
# ROADMAP/.thyrox/), skill `thyrox` (no pm-thyrox), 5 submódulos como clones
# hermanos, y lenguaje-muerto = los tokens que kaupamex ya prohibió.
#
# `--fast` existía para omitir el gate de referencias, que tardaba porque
# recorría todo el árbol buscando enlaces markdown. Su sustituto RST mide
# 3564 archivos en ~0.4 s, así que ya no hay nada que omitir: el flag se
# acepta y no cambia nada. Ver :ref:`h-docs-92`.
#
# Uso:
#   bash src/verify/thyrox-audit.sh            # reporte a stdout
#   bash src/verify/thyrox-audit.sh --strict   # exit 1 si algún FAIL
# =============================================================================
set -uo pipefail
# La raíz sale de la ubicación del PROPIO guion, no del cwd. Resolverla por
# `git rev-parse || pwd` hacía que el veredicto dependiera de desde dónde se
# invocara: medido, desde el repo daba 9 PASS · 0 FAIL · 12 WARN y desde
# `/home/user` —el directorio primario de una sesión multi-repo— daba
# 3 PASS · 1 FAIL · 17 WARN sobre un árbol que no es éste. Ver H-DOCS-292.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$ROOT"
PARENT="$(dirname "$ROOT")"
STRICT=false; FAST=false; TIMING=false
for a in "$@"; do
  [[ "$a" == "--strict" ]] && STRICT=true
  [[ "$a" == "--fast" ]]   && FAST=true   # reservado; ya no hay gate lento que omitir
  [[ "$a" == "--timing" ]] && TIMING=true
done
PASS=0; FAIL=0; WARN=0; SINMEDIR=0
ok()   { echo "PASS  · $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL  · $1"; FAIL=$((FAIL+1)); }
warn() { echo "WARN  · $1"; WARN=$((WARN+1)); }

# NOTA de mecanismo — medir un gate en TRES estados, no en dos.
# NO es una seccion de gate: no lleva `tick` y no aparece en el desglose de
# --timing. Llevaba forma de banner y el caso 4 de test-audit-timing.sh la
# contaba como seccion sin instrumentar (39 vs 38). El discriminador de una
# seccion es su `tick`; una nota de mecanismo no lo tiene ni debe tenerlo.
# Un gate que no puede medir rehusa con `exit 2` y sin emitir conteo, porque un
# 0 ahi seria un verde falso. Este guion lo leia con `${VAR:-0}`: el `2>/dev/null`
# tira el motivo, la sustitucion convierte la nada en 0, y el 0 se publica como
# PASS. Reproducido con el idioma exacto (H-DOCS-492):
#
#   codigo del gate: 2 (rehusa) | AMIN capturado: '<>'
#   VEREDICTO PUBLICADO: ok
#
# `medir_gate` deja tres cosas y NO decide: GATE_RC (el codigo), GATE_OUT (la
# salida entera) y GATE_N (su ultima linea). `gate_midio` publica el WARN de
# «sin medir» y devuelve 1 cuando el instrumento no pudo — asi el bloque que lo
# llama nunca tiene que elegir entre PASS y WARN sin saber si hubo medicion.
GATE_RC=0; GATE_OUT=""; GATE_N=""
medir_gate() {
    GATE_OUT="$("$@" 2>/dev/null)"; GATE_RC=$?
    GATE_N="$(printf '%s' "$GATE_OUT" | tail -1)"
}
gate_midio() {   # $1 = etiqueta que se publica
    if [[ "$GATE_RC" -eq 2 ]]; then
        warn "$1: SIN MEDIR — el gate rehusó con exit 2 (falta una precondición suya)"
        SINMEDIR=$((SINMEDIR+1))
        return 1
    fi
    if [[ -z "$GATE_N" ]]; then
        warn "$1: SIN MEDIR — el gate no emitió conteo (código $GATE_RC)"
        SINMEDIR=$((SINMEDIR+1))
        return 1
    fi
    # El contrato de `--quiet` es un ENTERO PELADO (control: check_rst_sintaxis
    # --quiet emite `413`). Un gate que no puede medir y lo dice en prosa saliendo
    # 0 —check_rst_convenciones sin git: «git no disponible; --nuevos no aplica»—
    # pasaba este filtro y llegaba al `[[ "$N" -eq 0 ]]` del llamador, donde bash
    # evalua ARITMETICAMENTE el operando: la primera palabra se lee como nombre de
    # variable. Con `set -u` revienta (ruidoso, que es como se encontro); sin el,
    # habria valido 0 y publicado un PASS. Es el sub-patron D de
    # `metrica-decide-la-conclusion.md` en el instrumento que audita a los demas.
    # Se cierra aqui y no en el gate concreto porque los 17 llamadores que
    # comparan con -eq heredan la misma trampa.
    if [[ ! "$GATE_N" =~ ^-?[0-9]+$ ]]; then
        warn "$1: SIN MEDIR — el gate emitió «$GATE_N» donde --quiet exige un entero"
        SINMEDIR=$((SINMEDIR+1))
        return 1
    fi
    return 0
}

# --- cronometro por gate -----------------------------------------------------
# H-DOCS-450 midio el agregado del hook de arranque: 151 s, sin desglose. Este
# cronometro lo reparte. `tick` cierra el gate anterior y abre el siguiente; la
# ultima seccion la cierra el volcado del final.
#
# El denominador NO se escribe a mano: sale de contar los `tick` declarados en
# el PROPIO guion. Una seccion nueva sin su `tick` aparece como «N de M» con
# N < M en vez de desaparecer del desglose — el sub-patron D de
# metrica-decide-la-conclusion.
TICK_ETIQUETAS=(); TICK_MS=(); TICK_INI=0; TICK_ACTUAL=""
_ahora_ms() { echo $(( $(date +%s%N) / 1000000 )); }
tick() {
    local fin; fin="$(_ahora_ms)"
    if [[ -n "$TICK_ACTUAL" ]]; then
        TICK_ETIQUETAS+=("$TICK_ACTUAL"); TICK_MS+=("$(( fin - TICK_INI ))")
    fi
    TICK_ACTUAL="${1:-}"; TICK_INI="$fin"
}
volcar_desglose() {
    tick ""                                   # cierra el ultimo gate abierto
    local total=0 i
    for i in "${TICK_MS[@]:-0}"; do total=$(( total + i )); done
    local declarados; declarados="$(grep -cE '^tick "[^"]' "${BASH_SOURCE[0]}")"
    echo ""
    echo "## Desglose por gate — total ${total} ms (alcance medido: ${#TICK_ETIQUETAS[@]} de ${declarados} secciones)"
    for i in "${!TICK_ETIQUETAS[@]}"; do
        printf '%s\t%s\n' "${TICK_MS[$i]}" "${TICK_ETIQUETAS[$i]}"
    done | sort -rn | while IFS=$'\t' read -r ms etq; do
        printf '  %6s ms  %s\n' "$ms" "$etq"
    done
}

echo "# Auditoría de coherencia kaupamex — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Repo: $ROOT"
echo ""

CANON=".claude/CLAUDE.md .claude/skills/thyrox/SKILL.md"
CANON_DIRS=".claude/commands .claude/rules .claude/agents .claude/skills/thyrox/references"

# --- Referencias cruzadas RST (:ref:) — el dominio real de este repo ---
tick "Los gates del registro, corridos por su corredor (#253)"
# UNA fuente, no dos. `registry.py` declara los gates y `runner.py` los corre;
# este guion enumeraba 37 bloques a mano contra los mismos guiones. Medido al
# cortar: los 35 que invocaba eran un SUBCONJUNTO ESTRICTO de los 47 del
# registro —cero vivian solo aqui— y doce registrados no corrian nunca desde
# el audit. Delegar no perdio nada y gano doce.
#
# El desglose por gate lo publica el propio corredor; aqui la seccion es una,
# porque una es la invocacion.
DOCTOR_OUT="$(python3 src/verify/runner.py --json 2>/dev/null)"; DOCTOR_RC=$?
if [[ "$DOCTOR_RC" -ge 2 || -z "$DOCTOR_OUT" ]]; then
    warn "Gates del registro: SIN MEDIR — el corredor salio $DOCTOR_RC sin emitir veredicto"
    SINMEDIR=$((SINMEDIR+1))
else
    # El veredicto se lee del corredor, no se recompone: sus cuatro estados
    # —aprobado, con violaciones, ausente, sin medir— ya distinguen «no pude
    # medir» de «medi cero», que es lo que `gate_midio` protege bloque a bloque.
    # La clave es `summary`, medida contra la salida real del corredor: leer
    # una que no existe habria dado ceros en las cinco, y cinco ceros pasan el
    # `-eq 0` de abajo como PASS. Es el sub-patron D dentro de la propia
    # delegacion, asi que el conteo se compara contra el registro (caso 4 de
    # `test_audit_delegates.sh`) y no se acepta a solas.
    eval "$(printf '%s' "$DOCTOR_OUT" | python3 -c '
import json, sys
v = json.load(sys.stdin).get("summary", {})
for k in ("passed", "failed", "missing", "unmeasured", "total"):
    print("D_%s=%d" % (k.upper(), int(v.get(k, 0))))
')"
    if [[ "${D_FAILED:-0}" -eq 0 && "${D_MISSING:-0}" -eq 0 ]]; then
        ok "Gates del registro: ${D_PASSED:-0} aprobados de ${D_TOTAL:-0} (alcance: el registro entero)"
    else
        bad "Gates del registro: ${D_FAILED:-0} con violaciones, ${D_MISSING:-0} ausentes de ${D_TOTAL:-0} — corre python3 src/verify/runner.py"
    fi
    if [[ "${D_UNMEASURED:-0}" -gt 0 ]]; then
        warn "Gates del registro: ${D_UNMEASURED:-0} SIN MEDIR — su precondicion falta; corre runner.py --verbose"
        SINMEDIR=$((SINMEDIR + ${D_UNMEASURED:-0}))
    fi
fi

tick "Lenguaje muerto DURO: tokens de template nunca válidos en kaupamex"
# arc42 / .claude/prds / .claude/epics / /task:create no existen en kaupamex.
# Se excluyen los docs del PROPIO auditor (describen los patrones que detecta →
# auto-FP; lección registro-errores-falsos-positivos FP-01).
SELF='(coherence-audit-gate|audit-coherence|thyrox-audit)\.md'
HARD=$(grep -rniE "\barc42\b|\.claude/prds|\.claude/epics|/task:create" \
        $CANON $CANON_DIRS 2>/dev/null | grep -vE "$SELF" | wc -l)
if [[ "$HARD" -eq 0 ]]; then ok "Lenguaje muerto (duro): 0 tokens de template ajeno"
else bad "Lenguaje muerto (duro): $HARD (arc42/.claude/prds/.claude/epics//task:create)"; fi

# --- Candidatos a deriva (WARN, no FAIL): triage cualitativo ---
tick "Candidatos a deriva (WARN, no FAIL): triage cualitativo"
# pm-thyrox/.thyrox/ROADMAP/now.md/type(scope) tienen menciones LEGÍTIMAS en
# kaupamex (notas de adaptación que explican qué NO usar). Detección mecánica
# no distingue uso-real de mención-documental -> son CANDIDATOS, los tría el
# agente increment-acceptor, no un FAIL automático (lección del dogfood inicial).
CAND=$(grep -rniE "pm-thyrox|\.thyrox/context|ROADMAP\.md|\bnow\.md\b|type\(scope\):" \
        $CANON $CANON_DIRS 2>/dev/null | grep -vE "$SELF" | wc -l)
if [[ "$CAND" -eq 0 ]]; then ok "Candidatos a deriva: 0"
else warn "Candidatos a deriva: $CAND menciones (pm-thyrox/.thyrox/ROADMAP/now.md/type(scope)) — triage cualitativo (muchas son notas de adaptación legítimas; revisar usos-como-instrucción en SKILL.md)"; fi

# --- Coherencia de estado (SMD ↔ docs ↔ git) ---
tick "Coherencia de estado (SMD ↔ docs ↔ git)"
SMD="$PARENT/kaupamex-docs/source/gestion/pm/siguiente-mejor-decision.rst"
if [[ -f "$SMD" ]]; then
    REF=$(grep -oE ':commit_referencia:.*docs [0-9a-f]{7}' "$SMD" | grep -oE '[0-9a-f]{7}$' | head -1)
    DOCSHEAD=$(git -C "$PARENT/kaupamex-docs" rev-parse --short=7 HEAD 2>/dev/null)
    FA=$(grep -oE ':fecha_actualizacion: [0-9T:-]+' "$SMD" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
    AGE=$(( ( $(date -u +%s) - $(date -u -d "${FA:-1970-01-01}" +%s 2>/dev/null || echo 0) ) / 86400 ))
    if [[ "$AGE" -gt 7 ]]; then warn "SMD: :fecha_actualizacion: $FA tiene >7 días — refrescar"
    else ok "SMD: fresco en el tiempo ($FA, ${AGE}d)"; fi
    if [[ -n "$REF" && -n "$DOCSHEAD" ]]; then
        if [[ "$REF" == "$DOCSHEAD" ]]; then ok "SMD: :commit_referencia: docs == HEAD ($REF)"
        else warn "SMD: :commit_referencia: docs $REF != docs HEAD $DOCSHEAD (deriva; +commits metadata tolerado)"; fi
    fi
else
    warn "SMD: no encontrado en $SMD (submódulo docs no clonado como hermano)"
fi
# El rótulo decía "Git super" y medía `$ROOT`, que es el repo donde corre el
# audit — normalmente `kaupamex-docs`, no el superproyecto. Se nombra el repo
# real para que la línea no prometa un alcance que no tiene (:ref:`h-docs-92`).
DIRTY=$(git status --short 2>/dev/null | wc -l)
if [[ "$DIRTY" -eq 0 ]]; then ok "Git $(basename "$ROOT"): árbol limpio (todo commiteado)"
else warn "Git $(basename "$ROOT"): $DIRTY archivos sin commitear"; fi

# --- Anatomía oficial del skill thyrox ---
tick "Anatomía oficial del skill thyrox"
MISS=""
for d in SKILL.md scripts references assets; do
    [[ -e ".claude/skills/thyrox/$d" ]] || MISS="$MISS $d"
done
[[ -z "$MISS" ]] && ok "Anatomía: thyrox SKILL+scripts+references+assets presentes" \
                 || bad "Anatomía thyrox: faltan ->$MISS"

# --- Coherencia parent ↔ submódulos (gitlink vs clon hermano) ---
tick "Coherencia parent ↔ submódulos (gitlink vs clon hermano)"
if [[ -f .gitmodules ]]; then
    while read -r sm; do
        clone="$PARENT/kaupamex-$sm"
        link=$(git ls-tree HEAD "$sm" 2>/dev/null | awk '{print $3}')
        tip=$(git -C "$clone" rev-parse HEAD 2>/dev/null)
        if [[ -z "$tip" ]]; then warn "Submódulo $sm: clon hermano no hallado en $clone"
        elif [[ "$tip" == "$link" ]]; then ok "Submódulo $sm: gitlink == clon HEAD (${tip:0:7})"
        else bad "Submódulo $sm: gitlink ${link:0:7} != clon HEAD ${tip:0:7} (gitlink-bump-gate)"; fi
    done < <(git config -f .gitmodules --get-regexp path | awk '{print $2}')
else
    # NO se puede concluir nada del proyecto desde la ausencia de .gitmodules
    # aquí: kaupamex ES multi-submódulo (5). Lo ausente es el clon del
    # superproyecto, así que el gate del gitlink queda SIN MEDIR, no en PASS.
    # Decía "el proyecto no es multi-submódulo" — leía la falta de su propio
    # insumo como una propiedad del proyecto. Ver :ref:`h-docs-92`.
    # AUSENTE POR DECISIÓN, no por accidente (directiva del ejecutor
    # 2026-08-07T19:38:44): el superproyecto ya no se trabaja — se operaba mal
    # y vivía siempre en un mismo estado. Mientras no se cargue, el gitlink no
    # es medible y su ausencia NO es un defecto del árbol.
    #
    # Sigue siendo WARN y no PASS a propósito: "no aplica hoy" no es "está
    # bien". El día que el superproyecto vuelva a la sesión, la rama de arriba
    # mide de verdad; hasta entonces esta línea dice por qué no hay cifra, que
    # es distinto de callar. Ver la sección "Precondición" de
    # gitlink-bump-gate.md.
    HERM=$(ls -d "$PARENT"/kaupamex-* 2>/dev/null | wc -l)
    warn "Submódulos: NO APLICA — superproyecto ausente por decisión del ejecutor (2026-08-07); $HERM clones hermanos en $PARENT. El gitlink queda DESCONOCIDO, no pendiente"
fi

# --- Fechas fabricadas (ISO) — las TRES señales de la regla ---
tick "Fechas fabricadas (ISO) — las TRES señales de la regla"
# `timestamps-iso8601-obligatorios.md` enumera tres señales de fabricación;
# este gate implementaba **una** (THH:00:00) sobre `.claude/**`, que no es
# donde la regla se aplica: `:fecha_creacion:` vive en `source/**.rst`. El
# PASS que publicaba era cierto sobre 95 archivos y ciego sobre 3564.
# Ver :ref:`h-docs-92`.
TS_ROOT="source"
TS_TOT=$(grep -rhoE "T[0-9]{2}:[0-9]{2}:[0-9]{2}" $TS_ROOT --include=*.rst 2>/dev/null | wc -l)
FAB=$(grep -rhoE "T[0-9]{2}:00:00" $TS_ROOT --include=*.rst 2>/dev/null | wc -l)
SEG=$(grep -rhoE "T[0-9]{2}:[0-9]{2}:00" $TS_ROOT --include=*.rst 2>/dev/null | wc -l)
# Señal 3: el mismo timestamp en >1 archivo (el batch que arrastra un valor).
REP=$(grep -rhoE "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}" \
        $TS_ROOT --include=*.rst -l 2>/dev/null >/dev/null; \
      grep -roE "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}" \
        $TS_ROOT --include=*.rst 2>/dev/null \
      | sort -u | cut -d: -f2- | sort | uniq -c | awk '$1>1' | wc -l)
if [[ "$TS_TOT" -eq 0 ]]; then
    warn "Timestamps: 0 timestamps medidos en $TS_ROOT — raíz sospechosa, revisar"
elif [[ "$FAB" -eq 0 && "$SEG" -eq 0 && "$REP" -eq 0 ]]; then
    ok "Timestamps: 3 señales limpias (alcance medido: $TS_TOT timestamps en $TS_ROOT/**.rst)"
else
    warn "Timestamps: hora redonda $FAB · segundos :00 $SEG · repetido entre archivos $REP (alcance medido: $TS_TOT timestamps en $TS_ROOT/**.rst) — deuda heredada; el azar explica ~1/60 de los :00 y ~1/3600 de los :00:00"
fi

# --- Artefactos mínimos por iniciativa (DEC-AM-01) — surfacing, no bloqueante ---
tick "Subagentes en disco que el store no registró"
# El registro automático depende de los hooks SubagentStart/Stop de
# `.claude/settings.json`, y esos hooks sólo cargan cuando este repo es el cwd
# de la sesión. Con el repo como directorio adicional (harness remoto, cwd
# /home/user) el hook no dispara y el store se queda atrás sin que nada lo
# diga — medido: 12 subagentes de un día sin fila (:ref:`h-docs-1010`). El
# reconciliador lee el disco; aquí sólo se publica cuánto falta.
if [[ -f src/agents/reconciliar_store.py ]]; then
    medir_gate python3 src/agents/reconciliar_store.py --dry-run
    RS_FALTAN="$(printf '%s' "$GATE_N" | sed -n 's/.*faltan: \([0-9][0-9]*\).*/\1/p')"
    RS_DISCO="$(printf '%s' "$GATE_N" | sed -n 's/.*transcripts en disco: \([0-9][0-9]*\).*/\1/p')"
    GATE_N="$RS_FALTAN"
    if ! gate_midio "Store de agentes"; then :
    elif [[ "$RS_FALTAN" -eq 0 ]]; then ok "Store de agentes: los $RS_DISCO transcripts en disco tienen fila (alcance medido: $RS_DISCO transcripts)"
    else warn "Store de agentes: $RS_FALTAN de $RS_DISCO transcripts sin fila — corre python3 src/agents/reconciliar_store.py"; fi
else
    warn "Store de agentes: reconciliar_store.py no encontrado"
fi

# --- Guion de workflow que escribe código sin fase de refutación ---
tick "Hallazgo cuyo prefijo de ID no coincide con el <submodulo> de su ruta."
# ----------------------------------------------------------------------
# Los githooks activos en los cinco clones (#21).
#
# `core.hooksPath` vive en `.git/config`, que NO se versiona: un contenedor
# nuevo nace con los hooks escritos y git sin mirarlos, y entonces el
# pre-commit y el commit-msg de ese repo no corren — sin rojo, sin mensaje y
# sin `--no-verify` que lo delate. Medido en H-DOCS-447: cuatro de los cinco
# clones commitearon una sesion entera asi; lo que se colo lo mide
# `remedicion-gates-githook.rst`.
#
# Es el sub-patron D en su forma mas pura: el control pasa porque no existe.
tick "guion huerfano y catalogo de scripts reproducible"
#
# Dos mitades del mismo fondo. El catalogo se DERIVA de quien cita a cada
# guion, asi que un consumidor que desaparece degrada su clase sola; si el
# archivo en disco deja de reproducir, alguien lo edito a mano y el
# instrumento de descripcion dejo de describir. El huerfano es el caso
# extremo: nadie lo cita, y desde el listado se ve igual que uno critico.
# Los 5 heredados van en baseline — uno NUEVO es lo que este gate atrapa.
if [[ -f src/corpus/censar_scripts.py ]]; then
    HUERLINEA=$(python3 src/corpus/censar_scripts.py --huerfanos 2>/dev/null | head -1)
    # Anclado al nombre del gate por la misma razon que el bloque de arriba
    # (H-DOCS-493, #941): `: N hu` es un sustantivo truncado, no un ancla.
    HUER=$(printf '%s' "$HUERLINEA" \
        | grep -oE '^censar-scripts: [0-9]+' | grep -oE '[0-9]+$')
    HUERDEN=$(printf '%s' "$HUERLINEA" | grep -oE "alcance medido: [^)]*")
    if [[ -z "$HUER" ]]; then
        warn "Guion huerfano: NO MEDIDO — el censo no devolvio conteo"
    elif [[ "$HUER" -eq 0 ]]; then
        ok "Guion huerfano: ninguno nuevo — $HUERDEN"
    else
        warn "Guion huerfano: $HUER nuevo(s) — declara su consumidor o retiralo (censar_scripts.py --huerfanos)"
    fi
    if python3 src/corpus/censar_scripts.py --verificar >/dev/null 2>&1; then
        ok "Catalogo de scripts: reproduce byte a byte"
    else
        warn "Catalogo de scripts: NO reproduce — corre censar_scripts.py sin --verificar"
    fi
else
    warn "Guion huerfano: censar_scripts.py no encontrado"
fi

# --- el generador de un evento no toma el instante del reloj ---------------
tick "Los hooks declarados en los clones llegan a la fuente viva de settings."
if [[ -f src/hooks/bridge_hooks.py ]]; then
    medir_gate python3 src/hooks/bridge_hooks.py --quiet; PHK="$GATE_N"
    PHKDEN=$(python3 src/hooks/bridge_hooks.py --quiet 2>/dev/null | head -1)
    if ! gate_midio "Puente de hooks"; then :
    elif [[ "$PHK" -eq 0 ]]; then ok "Puente de hooks: todo lo puenteable está en la fuente — $PHKDEN"
    else warn "Puente de hooks: $PHK sin puentear — $PHKDEN; corre bridge_hooks.py (dry-run) y --apply al arrancar sesión"; fi
else
    warn "Puente de hooks: bridge_hooks.py no encontrado"
fi

# ----------------------------------------------------------------------
# Clase de corchetes con caracter multibyte en herramienta de bytes
# (:ref:`h-docs-1114`, tarea #148).
# grep/sed/awk operan sobre BYTES: `[eé]` no casa nada y devuelve 0 SIN aviso,
# asi que el cero se lee como ausencia. Se encontro porque un
# `grep -ciE 'm[eé]trica:'` dio 0 sobre un archivo con 6 ocurrencias.
$TIMING && volcar_desglose

echo ""
echo "## Score: $PASS PASS · $FAIL FAIL · $WARN WARN · $SINMEDIR SIN MEDIR"
# Un VERDE sobre gates que no pudieron medir no discrimina «no hay defectos» de
# «no pude verlo» — sub-patron D de `metrica-decide-la-conclusion.md`. El
# veredicto NO se colapsa: nombra los dos, y el conteo de sin-medir es su
# denominador. Sigue sin bloquear (surfacing, `coherence-audit-gate.md`).
if [[ "$FAIL" -ne 0 ]]; then
    echo "Veredicto mecánico: hay FAIL — ver action plan"
elif [[ "$SINMEDIR" -ne 0 ]]; then
    echo "Veredicto mecánico: VERDE PARCIAL — 0 FAIL sobre lo medido, pero $SINMEDIR gate(s) no pudieron medir"
else
    echo "Veredicto mecánico: VERDE (el juicio cualitativo lo añade increment-acceptor)"
fi
$STRICT && [[ "$FAIL" -gt 0 ]] && exit 1
exit 0
