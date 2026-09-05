#!/bin/bash
# =============================================================================
# .claude/scripts/thyrox-audit.sh — auditoría mecánica de coherencia (kaupamex)
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
#   bash .claude/scripts/thyrox-audit.sh            # reporte a stdout
#   bash .claude/scripts/thyrox-audit.sh --strict   # exit 1 si algún FAIL
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
PASS=0; FAIL=0; WARN=0
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
        return 1
    fi
    if [[ -z "$GATE_N" ]]; then
        warn "$1: SIN MEDIR — el gate no emitió conteo (código $GATE_RC)"
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
tick "Referencias cruzadas RST (:ref:) — el dominio real de este repo"
# Medía "broken markdown links" por herencia del template THYROX. `source/`
# acepta sólo `.rst` (0 archivos `.md` medidos) y el validador heredado recoge
# sólo `.md`/`.json`, así que su PASS hablaba de `.claude/` y callaba sobre los
# 3564 `.rst` del producto. Además pasaba `--links-only`, un flag que ese
# script NUNCA implementó (0 hits en todo `.py`). Ver :ref:`h-docs-92`.
if [[ -f .claude/scripts/gates/check_rst_referencias.py ]]; then
    REFOUT=$(python3 .claude/scripts/gates/check_rst_referencias.py 2>&1)
    REFRC=$?
    REFN=$(echo "$REFOUT" | grep -oE '^check-rst-referencias: [0-9]+' | grep -oE '[0-9]+$')
    # `head -1`: desde la tarea #166 el guion publica DOS denominadores — el de
    # :ref: y el de :doc:. Sin el recorte, este warn arrastraría el segundo.
    REFDEN=$(echo "$REFOUT" | grep -oE '\(alcance medido:.*' | head -1)
    if [[ "$REFRC" -eq 2 ]]; then
        warn "Referencias RST: SIN MEDIR — $(echo "$REFOUT" | tail -1)"
    elif [[ -z "$REFN" ]]; then
        ok "Referencias RST: todas resuelven $REFDEN"
    else
        warn "Referencias RST: $REFN usos de :ref: sin etiqueta $REFDEN — corre check_rst_referencias.py"
    fi
else
    warn "Referencias RST: check_rst_referencias.py no encontrado"
fi

# --- Lenguaje muerto DURO: tokens de template nunca válidos en kaupamex ---
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
tick "Artefactos mínimos por iniciativa (DEC-AM-01) — surfacing, no bloqueante"
# Sólo audita iniciativas ACTIVAS (terminales exentas: retrofit prospectivo).
# WARN por deuda heredada; graduar a FAIL/--strict cuando el conteo esté en 0.
# Ver definir-artefactos-minimos-iniciativa.
if [[ -f .claude/scripts/gates/check-artefactos-minimos.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-artefactos-minimos.sh --quiet; AMIN="$GATE_N"
    AMDEN=$(bash .claude/scripts/gates/check-artefactos-minimos.sh 2>/dev/null | tail -1 | sed 's/^## Artefactos mínimos: //')
    if ! gate_midio "Artefactos mínimos"; then :
    elif [[ "$AMIN" -eq 0 ]]; then ok "Artefactos mínimos: $AMDEN (DEC-AM-01)"
    else warn "Artefactos mínimos: $AMIN iniciativas activas sin index/alcance/Premisa/:flow:/progreso — corre check-artefactos-minimos.sh (deuda heredada; graduar a --strict en 0)"; fi
else
    warn "Artefactos mínimos: check-artefactos-minimos.sh no encontrado"
fi

# --- Cobertura FR↔UC del subdominio admin — surfacing, no bloqueante ---
tick "Cobertura FR↔UC del subdominio admin — surfacing, no bloqueante"
# Cada UC-ADM debe tener >=1 FR derivado. Iniciativa viva `derivar-frs-admin`
# (SOL-012). Eje = dominio, no actor.
if [[ -f .claude/scripts/gates/check-fr-admin-coverage.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-fr-admin-coverage.sh --quiet; FRADM="$GATE_N"
    FRDEN=$(bash .claude/scripts/gates/check-fr-admin-coverage.sh 2>/dev/null | tail -1)
    if ! gate_midio "Cobertura FR admin"; then :
    elif [[ "$FRADM" -eq 0 ]]; then ok "Cobertura FR admin: $FRDEN (derivar-frs-admin)"
    else warn "Cobertura FR admin: $FRDEN — corre check-fr-admin-coverage.sh (deriva sus FRs en derivar-frs-admin)"; fi
else
    warn "Cobertura FR admin: check-fr-admin-coverage.sh no encontrado"
fi

# --- Hallazgo con alcance abierto sin sucesor registrado ---
tick "Hallazgo con alcance abierto sin sucesor registrado"
# Un hallazgo que declara "Lo que este hallazgo no cierra" debe nombrar su
# sucesor (#NNN, sub-iniciativa, o DESCONOCIDO con condición de cierre).
# Ver hallazgo-abierto-genera-sucesor.md. Arrancó en 0 — a diferencia de
# artefactos-mínimos, aquí NO hay deuda heredada que absorber, así que la
# condición de graduación a --strict (pre-push) ya está cumplida; el cambio
# de flujo de push es decisión del ejecutor, como lo fue en DEC-AM-01.
if [[ -f .claude/scripts/gates/check-hallazgo-sucesor.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-hallazgo-sucesor.sh --quiet; SUC="$GATE_N"
    SUCDEN=$(bash .claude/scripts/gates/check-hallazgo-sucesor.sh 2>/dev/null | tail -1 | sed 's/^ *//')
    if ! gate_midio "Sucesores"; then :
    elif [[ "$SUC" -eq 0 ]]; then ok "Sucesores: todo hallazgo con alcance abierto nombra el suyo $SUCDEN"
    else warn "Sucesores: $SUC hallazgo(s) declaran alcance abierto sin sucesor — corre check-hallazgo-sucesor.sh (registrar tarea/sub-iniciativa, NO borrar la declaración)"; fi
else
    warn "Sucesores: check-hallazgo-sucesor.sh no encontrado"
fi

# --- Artefactos de agente derivados del paquete (@kaupamex/agent) ---
tick "Artefactos de agente derivados del paquete"
# Los `.claude/agents/*.md` se EMITEN desde `.claude/packages/agent`; un .md
# editado a mano o una definición TS sin re-emitir divergen en silencio hasta
# el pre-commit. Aquí se publica cada sesión. El gate rehúsa con exit 2 sin el
# runtime (bun + zod), y gate_midio lo reporta como SIN MEDIR, no como 0.
if [[ -f .claude/scripts/gates/check-agent-artifacts.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-agent-artifacts.sh
    ART_N="$(printf '%s' "$GATE_N" | sed -n 's/.*; \([0-9][0-9]*\) con diferencia.*/\1/p')"
    ART_DEN="$(printf '%s' "$GATE_N" | sed -n 's/^emit: \([0-9][0-9]*\) definici.*/\1/p')"
    GATE_N="$ART_N"
    if ! gate_midio "Artefactos de agente"; then :
    elif [[ "$ART_N" -eq 0 ]]; then ok "Artefactos de agente: los $ART_DEN .md coinciden con su definición TS (alcance medido: $ART_DEN definiciones)"
    else warn "Artefactos de agente: $ART_N de $ART_DEN .md divergen de su definición — corre (cd .claude/packages/agent && bun run bin/emit.ts)"; fi
else
    warn "Artefactos de agente: check-agent-artifacts.sh no encontrado"
fi

# --- Subagentes en disco que el store no registró ---
tick "Subagentes en disco que el store no registró"
# El registro automático depende de los hooks SubagentStart/Stop de
# `.claude/settings.json`, y esos hooks sólo cargan cuando este repo es el cwd
# de la sesión. Con el repo como directorio adicional (harness remoto, cwd
# /home/user) el hook no dispara y el store se queda atrás sin que nada lo
# diga — medido: 12 subagentes de un día sin fila (:ref:`h-docs-1010`). El
# reconciliador lee el disco; aquí sólo se publica cuánto falta.
if [[ -f .claude/scripts/agents/reconciliar_store.py ]]; then
    medir_gate python3 .claude/scripts/agents/reconciliar_store.py --dry-run
    RS_FALTAN="$(printf '%s' "$GATE_N" | sed -n 's/.*faltan: \([0-9][0-9]*\).*/\1/p')"
    RS_DISCO="$(printf '%s' "$GATE_N" | sed -n 's/.*transcripts en disco: \([0-9][0-9]*\).*/\1/p')"
    GATE_N="$RS_FALTAN"
    if ! gate_midio "Store de agentes"; then :
    elif [[ "$RS_FALTAN" -eq 0 ]]; then ok "Store de agentes: los $RS_DISCO transcripts en disco tienen fila (alcance medido: $RS_DISCO transcripts)"
    else warn "Store de agentes: $RS_FALTAN de $RS_DISCO transcripts sin fila — corre python3 .claude/scripts/agents/reconciliar_store.py"; fi
else
    warn "Store de agentes: reconciliar_store.py no encontrado"
fi

# --- Guion de workflow que escribe código sin fase de refutación ---
tick "Guion de workflow que escribe código sin fase de refutación"
# Un guion cuyos agentes escriben en el árbol debe declarar una fase que mida
# el DISCO con un instrumento distinto del auto-reporte del agente que
# escribió. Ver hallazgo-abierto… no: :ref:`h-docs-101`.
#
# Arrancó en 0 tras cerrar la tarea #212 — no hay deuda heredada que absorber
# (los cinco guiones están declarados y los cuatro que escriben refutan). La
# graduación a --strict queda disponible, y es decisión del ejecutor como en
# DEC-AM-01: aquí bloquearía el push de quien añada un guion sin declararlo,
# que es exactamente el momento en que el gate sirve.
if [[ -f .claude/scripts/gates/check-workflow-refutacion.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-workflow-refutacion.sh --quiet; WFR="$GATE_N"
    WFRDEN=$(bash .claude/scripts/gates/check-workflow-refutacion.sh 2>/dev/null | grep -m1 'alcance medido' | sed 's/^ *//')
    if ! gate_midio "Refutación en workflows"; then :
    elif [[ "$WFR" -eq 0 ]]; then ok "Refutación en workflows: todo guion que escribe declara su fase $WFRDEN"
    else warn "Refutación en workflows: $WFR guion(es) sin declarar @escribe-codigo/@verifica-en, o cuya fase declarada NO aborta — corre check-workflow-refutacion.sh"; fi
else
    warn "Refutación en workflows: check-workflow-refutacion.sh no encontrado"
fi

# ----------------------------------------------------------------------
# Convenciones de artefacto RST: autoría canónica y tablas en list-table.
# Surfacing, no bloqueante: la deuda heredada era grande al escribirse el
# gate — mismo criterio de arranque que DEC-AM-01 y que check-hallazgo-sucesor.
# La forma accionable HOY es --nuevos, que acota a lo que el árbol de trabajo
# toca.
tick "Convenciones de artefacto RST: autoría canónica y tablas en list-table"
if [[ -f .claude/scripts/gates/check_rst_convenciones.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_rst_convenciones.py --nuevos --quiet; RSTC="$GATE_N"
    RSTCDEN=$(python3 .claude/scripts/gates/check_rst_convenciones.py --nuevos 2>/dev/null | grep -m1 'alcance medido' | sed 's/^ *//')
    if ! gate_midio "Convenciones RST"; then :
    elif [[ "$RSTC" -eq 0 ]]; then ok "Convenciones RST: autoría canónica y tablas en list-table $RSTCDEN"
    else warn "Convenciones RST: $RSTC archivo(s) modificado(s) con :autor: del agente o tabla plana — corre check_rst_convenciones.py --nuevos"; fi
else
    warn "Convenciones RST: check_rst_convenciones.py no encontrado"
fi

# ----------------------------------------------------------------------
# Unicidad de etiqueta de hallazgo y vigencia de las citas de tarea.
# Ver H-DOCS-119 (dos hallazgos con el mismo ID: Sphinx avisa `duplicate
# label` y el `:ref:` resuelve al equivocado) y H-DOCS-121 (el board
# versionado, sin el cual la mitad B no se puede medir).
#
# Arranca en 0/0, así que la graduación a --strict está disponible desde el
# día uno — mismo criterio que los gates #9 y #10; el cambio de flujo de push
# sigue siendo decisión del ejecutor, como en DEC-AM-01.
tick "Unicidad de etiqueta de hallazgo y vigencia de las citas de tarea."
if [[ -f .claude/scripts/gates/check-ids-duplicados.sh ]]; then
    medir_gate bash .claude/scripts/gates/check-ids-duplicados.sh --quiet; IDS="$GATE_N"
    IDSDEN=$(bash .claude/scripts/gates/check-ids-duplicados.sh 2>/dev/null | grep -m1 'etiquetas de hallazgo' | sed 's/^ *//')
    if ! gate_midio "IDs"; then :
    elif [[ "$IDS" -eq 0 ]]; then ok "IDs: sin etiquetas duplicadas ni citas de tarea colgantes — $IDSDEN"
    else warn "IDs: $IDS colisión(es) de etiqueta o cita(s) colgante(s) — corre check-ids-duplicados.sh (renumerar el hallazgo MÁS NUEVO, no el citado)"; fi
else
    warn "IDs: check-ids-duplicados.sh no encontrado"
fi

# ----------------------------------------------------------------------
# Sintaxis RST verificada con el motor REAL de Sphinx (roles, directivas y
# extensiones de conf.py registradas; LoggingReporter como en sphinx/io.py:85).
#
# Ver H-DOCS-134: el validador anterior era un parse de docutils pelado cuyos
# mensajes se filtraban con una lista de cadenas escrita a mano — un control
# negativo de cuatro defectos sembrados lo pasaba entero.
#
# Corre en modo --nuevos: parsear los 3756 .rst con una app Sphinx cuesta
# minutos y este audit se dispara en cada sesión. El barrido completo se corre
# a mano (sin --nuevos) o desde CI.
tick "Sintaxis RST verificada con el motor REAL de Sphinx (roles, directivas"
if [[ -f .claude/scripts/gates/check_rst_sintaxis.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_rst_sintaxis.py --nuevos --quiet; RSTS="$GATE_N"
    RSTSDEN=$(python3 .claude/scripts/gates/check_rst_sintaxis.py --nuevos 2>/dev/null | grep -m1 'alcance medido' | sed 's/^ *//')
    if ! gate_midio "Sintaxis RST"; then :
    elif [[ "$RSTS" -eq 0 ]]; then ok "Sintaxis RST: sin errores de parseo — $RSTSDEN"
    else warn "Sintaxis RST: $RSTS archivo(s) no parsean con Sphinx — corre check_rst_sintaxis.py --nuevos"; fi
else
    warn "Sintaxis RST: check_rst_sintaxis.py no encontrado"
fi

# ----------------------------------------------------------------------
# La list-table de un hallazgos/index.rst y su toctree dicen lo mismo.
#
# Los dos listan el mismo conjunto y se mantienen a mano, así que divergen en
# silencio hacia ambos lados: un archivo en el toctree sin fila desaparece de
# la vista agregada que el índice existe para dar, y una fila sin entrada
# promete un hallazgo que el árbol no incluye.
#
# Sólo compara los :ref: que ocupan la PRIMERA CELDA de una fila: un :ref: del
# cuerpo es una cita cruzada a otra iniciativa. Medido al escribirlo, contar
# todos los :ref: señalaba 7 de 17 índices y contar filas señala 3 — el
# instrumento amplio mezclaba dos poblaciones.
tick "La list-table de un hallazgos/index.rst y su toctree dicen lo mismo."
if [[ -f .claude/scripts/gates/check_hallazgos_index.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_hallazgos_index.py --quiet; HIDX="$GATE_N"
    HIDXDEN=$(python3 .claude/scripts/gates/check_hallazgos_index.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if ! gate_midio "Índices de hallazgos"; then :
    elif [[ "$HIDX" -eq 0 ]]; then ok "Índices de hallazgos: tabla y toctree coinciden — $HIDXDEN"
    else warn "Índices de hallazgos: $HIDX índice(s) con desajuste tabla/toctree — corre check_hallazgos_index.py"; fi
else
    warn "Índices de hallazgos: check_hallazgos_index.py no encontrado"
fi

# ----------------------------------------------------------------------
# Vocabulario cerrado del catálogo de errores (DEC-ERR-01..04).
# La referencia externa que aportó la FORMA de este registro no trae
# vocabulario: 9 valores de `type:` sobre 16 archivos, 7 grafías de
# `severity:` para 4 niveles. Sobre ese corpus ningún agregado por tipo es
# calculable, y ése es el estado al que este gate impide llegar.
tick "Cada error-*.rst declara clase y tipo del vocabulario cerrado."
if [[ -f .claude/scripts/gates/check_error_catalog.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_error_catalog.py --quiet; ECAT="$GATE_N"
    ECATDEN=$(python3 .claude/scripts/gates/check_error_catalog.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if ! gate_midio "Catálogo de errores"; then :
    elif [[ "$ECAT" -eq 0 ]]; then ok "Catálogo de errores: vocabulario cerrado respetado — $ECATDEN"
    else warn "Catálogo de errores: $ECAT incumplidor(es) — corre check_error_catalog.py"; fi
else
    warn "Catálogo de errores: check_error_catalog.py no encontrado"
fi

# ----------------------------------------------------------------------
# :doc: cuyo documento destino no existe (tarea #166).
#
# Va en su propio gate y no sumado al #1 a propósito: un :ref: roto y un :doc:
# roto son dos poblaciones con dos causas y dos reparaciones — la etiqueta
# ausente frente al documento movido o borrado. Un encabezado único sobre las
# dos es el sub-patrón A de metrica-decide-la-conclusion.
tick ":doc: cuyo documento destino no existe (tarea #166)."
if [[ -f .claude/scripts/gates/check_rst_referencias.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_rst_referencias.py --quiet-doc; DOCN="$GATE_N"
    DOCDEN=$(python3 .claude/scripts/gates/check_rst_referencias.py 2>/dev/null \
             | grep -oE '\(alcance medido: [0-9]+ usos de :doc:.*')
    if ! gate_midio "Documentos RST"; then :
    elif [[ "$DOCN" -eq 0 ]]; then ok "Documentos RST: todos los :doc: resuelven $DOCDEN"
    else warn "Documentos RST: $DOCN usos de :doc: sin documento $DOCDEN — corre check_rst_referencias.py"; fi
else
    warn "Documentos RST: check_rst_referencias.py no encontrado"
fi

# ----------------------------------------------------------------------
# Hallazgo cuyo prefijo de ID no coincide con el <submodulo> de su ruta.
#
# La regla lo fija en una frase — el <submodulo> lo determina la CAPA del
# hallazgo, no dónde se descubrió — y el árbol la cumple 448 de 511 veces, así
# que es la convención dominante y no una invención. La deuda heredada (62) va
# en baseline: prospectivo, se paga al mover. Ver :ref:`h-docs-227`.
#
# La prevención real no es este gate sino su hook PreToolUse hermano: aquí el
# archivo ya está escrito, indexado y citado.
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
tick "Githooks activos en los cinco clones"
if [[ -f .claude/scripts/gates/check_githooks_activos.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_githooks_activos.py --quiet; GHK="$GATE_N"
    GHKDEN=$(python3 .claude/scripts/gates/check_githooks_activos.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if ! gate_midio "Githooks"; then :
    elif [[ "$GHK" -eq 0 ]]; then ok "Githooks: los cinco clones los tienen activos — $GHKDEN"
    else warn "Githooks: $GHK clon(es) con los hooks inactivos — corre check_githooks_activos.py y, en cada uno, bash scripts/install-hooks.sh"; fi
else
    warn "Githooks: check_githooks_activos.py no encontrado"
fi

if [[ -f .claude/scripts/gates/check_hallazgo_submodulo.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_hallazgo_submodulo.py --quiet; HSUB="$GATE_N"
    HSUBDEN=$(python3 .claude/scripts/gates/check_hallazgo_submodulo.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if ! gate_midio "Submódulo del hallazgo"; then :
    elif [[ "$HSUB" -eq 0 ]]; then ok "Submódulo del hallazgo: ID, meta y carpeta coinciden — $HSUBDEN"
    else warn "Submódulo del hallazgo: $HSUB hallazgo(s) fuera de su submódulo — corre check_hallazgo_submodulo.py"; fi
else
    warn "Submódulo del hallazgo: check_hallazgo_submodulo.py no encontrado"
fi

# ----------------------------------------------------------------------
# Vocabulario de la prosa en sus dos ejes: sustantivo inventado (léxico) y
# forma vetada (lista cerrada de la regla). Ver `redaccion-tecnica-es.md`.
#
# El guion NO emite cifra si le falta su librería — un 0 por import ausente
# sería el verde falso que el sub-patrón D describe. Por eso aquí se
# distingue "sin hallazgos" de "no se pudo medir".
tick "Vocabulario de la prosa en sus dos ejes: sustantivo inventado (léxico)"
if [[ -f .claude/scripts/gates/check_vocabulario_prosa.py ]]; then
    VOC=$(python3 .claude/scripts/gates/check_vocabulario_prosa.py --quiet 2>/dev/null)
    VOCDEN=$(python3 .claude/scripts/gates/check_vocabulario_prosa.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$VOC" ]]; then
        warn "Vocabulario de prosa: NO MEDIDO — falta spacy-lookups-data (pip install spacy-lookups-data)"
    elif [[ "$VOC" -eq 0 ]]; then
        ok "Vocabulario de prosa: sin inventados ni formas vetadas nuevas — $VOCDEN"
    else
        warn "Vocabulario de prosa: $VOC hallazgo(s) nuevo(s) — ejecuta check_vocabulario_prosa.py"
    fi
else
    warn "Vocabulario de prosa: check_vocabulario_prosa.py no encontrado"
fi

# --- nombre de archivo Python -------------------------------------
tick "nombre de archivo Python"
#
# El nombre de un `.py` ES el nombre del módulo, así que un guion medio lo
# vuelve inimportable. NO cubre el `.sh`: en este árbol conviven dos
# convenciones de shell y ninguna es un defecto (ver el docstring del guion).
if [[ -f .claude/scripts/gates/check_script_naming.py ]]; then
    NAM=$(python3 .claude/scripts/gates/check_script_naming.py --quiet 2>/dev/null)
    NAMDEN=$(python3 .claude/scripts/gates/check_script_naming.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$NAM" ]]; then
        warn "Nombre de módulo Python: NO MEDIDO — el guion no devolvió conteo"
    elif [[ "$NAM" -eq 0 ]]; then
        ok "Nombre de módulo Python: todo en snake_case — $NAMDEN"
    else
        warn "Nombre de módulo Python: $NAM con guion medio — ejecuta check_script_naming.py"
    fi
else
    warn "Nombre de módulo Python: check_script_naming.py no encontrado"
fi

# --- idioma del nombre de archivo ------------------------------------------
tick "idioma del nombre de archivo"
#
# Segundo eje del mismo gate: los archivos van en ingles, los comentarios en
# espanol (directiva del ejecutor 2026-08-28, decision #647). El lexico se
# reusa de api/scripts/check_identifier_language.py; sin el, el gate rehusa
# con 2 y NO emite cifra.
if [[ -f .claude/scripts/gates/check_script_naming.py ]]; then
    IDI=$(python3 .claude/scripts/gates/check_script_naming.py --idioma --quiet 2>/dev/null)
    IDIDEN=$(python3 .claude/scripts/gates/check_script_naming.py --idioma 2>/dev/null | grep 'alcance medido' | sed 's/^ *//')
    if [[ -z "$IDI" ]]; then
        warn "Idioma del nombre: NO MEDIDO — falta el léxico de api"
    elif [[ "$IDI" -eq 0 ]]; then
        ok "Idioma del nombre: ninguno nuevo en español — $IDIDEN"
    else
        warn "Idioma del nombre: $IDI nombre(s) nuevo(s) en español — ejecuta check_script_naming.py --idioma"
    fi
else
    warn "Idioma del nombre: check_script_naming.py no encontrado"
fi

# --- idioma de los identificadores de .claude/** ----------------------------
tick "idioma de identificadores"
#
# Tercer eje del mismo gate. El gate hermano de api mide src/, tests/ y
# addons/ por AST; su ROOTS no alcanza .claude/**, que es donde vive el
# tooling de esta sesion. Sin este eje, un identificador nuevo en espanol
# entraba ahi sin que nada lo viera. Mismo guard: sin lexico rehusa con 2 y
# NO emite cifra.
if [[ -f .claude/scripts/gates/check_script_naming.py ]]; then
    IDD=$(python3 .claude/scripts/gates/check_script_naming.py --identifiers --quiet 2>/dev/null)
    IDDDEN=$(python3 .claude/scripts/gates/check_script_naming.py --identifiers 2>/dev/null \
        | grep 'alcance medido' | sed 's/^ *//')
    if [[ -z "$IDD" ]]; then
        warn "Idioma de identificadores: NO MEDIDO — falta el léxico de api"
    elif [[ "$IDD" -eq 0 ]]; then
        ok "Idioma de identificadores: ninguno nuevo en español — $IDDDEN"
    else
        warn "Idioma de identificadores: $IDD nuevo(s) en español — ejecuta check_script_naming.py --identifiers"
    fi
else
    warn "Idioma de identificadores: check_script_naming.py no encontrado"
fi

# --- resolucion de la raiz de la referencia ---------------------------------
tick "resolucion de raiz de referencia"
#
# Community reparte sus addons en DOS raices y `base` vive en la segunda. Un
# guion que componga la ruta a mano declara ausente lo que si existe, y su
# mensaje lo llama pregunta de alcance (H-DOCS-507). La ruta se pide a
# reference_roots.addons_de()/addon_root(), nunca se compone.
if [[ -f .claude/scripts/gates/check_reference_root_resolution.py ]]; then
    RRR=$(python3 .claude/scripts/gates/check_reference_root_resolution.py --quiet 2>/dev/null)
    RRRDEN=$(python3 .claude/scripts/gates/check_reference_root_resolution.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$RRR" ]]; then
        warn "Raíz de referencia: NO MEDIDO — el gate no emitió cifra"
    elif [[ "$RRR" -eq 0 ]]; then
        ok "Raíz de referencia: ninguno compone la ruta a mano — $RRRDEN"
    else
        warn "Raíz de referencia: $RRR guion(es) componen la ruta — usar addons_de()/addon_root()"
    fi
else
    warn "Raíz de referencia: check_reference_root_resolution.py no encontrado"
fi

# --- nombre del evento con que se declara cada hook -------------------------
tick "nombre del evento de hook"
if [[ -f .claude/scripts/gates/check_eventos_hook.py ]]; then
    EVH=$(python3 .claude/scripts/gates/check_eventos_hook.py --quiet 2>/dev/null)
    EVHDEN=$(python3 .claude/scripts/gates/check_eventos_hook.py 2>/dev/null | sed -n '2p' | sed 's/^ *//')
    if [[ -z "$EVH" ]]; then
        warn "Evento de hook: NO MEDIDO — sin universo derivable del binario"
    elif [[ "$EVH" -eq 0 ]]; then
        ok "Evento de hook: todos los declarados existen — $EVHDEN"
    else
        warn "Evento de hook: $EVH desconocido(s) — el hook NO dispara; ejecuta check_eventos_hook.py"
    fi
else
    warn "Evento de hook: check_eventos_hook.py no encontrado"
fi

# --- regla de permiso que ninguna invocacion puede alcanzar -----------------
tick "regla de permiso inalcanzable"
#
# Una `allow` cubierta por un `deny` o un `ask` mas ancho no produce error:
# sigue en el archivo, se lee como concedida, y el permiso se vuelve a pedir
# para siempre. Ver H-DOCS-480; la forma se adapta de `shadowedRuleDetection`
# del corpus `ccb`, extendida a la cobertura por prefijo.
if [[ -f .claude/scripts/gates/check_unreachable_rules.py ]]; then
    UNREACH=$(python3 .claude/scripts/gates/check_unreachable_rules.py --quiet 2>/dev/null)
    UNREACH_DEN=$(python3 .claude/scripts/gates/check_unreachable_rules.py 2>/dev/null | sed -n '2p' | sed 's/^ *//')
    if [[ -z "$UNREACH" ]]; then
        warn "Regla inalcanzable: NO MEDIDO — ningun archivo leido declara permisos"
    elif [[ "$UNREACH" -eq 0 ]]; then
        ok "Regla inalcanzable: ninguna — $UNREACH_DEN"
    else
        warn "Regla inalcanzable: $UNREACH allow cubierta(s) — ejecuta check_unreachable_rules.py"
    fi
else
    warn "Regla inalcanzable: check_unreachable_rules.py no encontrado"
fi

# --- evidencia citada sin respaldo versionado -------------------------------
tick "evidencia citada sin respaldo versionado"
#
# El cliente deshace con `file-history`, guardando el delta de cada archivo
# fuera de git. Nosotros NO copiamos ese mecanismo, y la consecuencia es que
# una evidencia sólo-local muere con el contenedor: el defecto de H-DOCS-120.
if [[ -f .claude/scripts/gates/check_evidence_tracked.py ]]; then
    EVID=$(python3 .claude/scripts/gates/check_evidence_tracked.py --quiet 2>/dev/null)
    EVID_DEN=$(python3 .claude/scripts/gates/check_evidence_tracked.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$EVID" ]]; then
        warn "Evidencia versionada: NO MEDIDO — el gate rehusó (¿sin git?)"
    elif [[ "$EVID" -eq 0 ]]; then
        ok "Evidencia versionada: toda cita se sostiene — $EVID_DEN"
    else
        warn "Evidencia versionada: $EVID cita(s) sin respaldo — ejecuta check_evidence_tracked.py"
    fi
else
    warn "Evidencia versionada: check_evidence_tracked.py no encontrado"
fi

# --- cota del peor caso de cada hook ---------------------------------------
tick "cota del peor caso de cada hook"
#
# El turno ESPERA al hook, así que uno sin `timeout` no tiene peor caso
# acotado: si se cuelga, cuelga el turno. Ver H-DOCS-449 y la forma que lo
# destapó (claude-octopus, MIT, 39 de 43 con siete valores distintos).
if [[ -f .claude/scripts/gates/check_hooks_timeout.py ]]; then
    HTO=$(python3 .claude/scripts/gates/check_hooks_timeout.py 2>/dev/null | tail -1)
    HTOE=${PIPESTATUS[0]:-0}
    if [[ -z "$HTO" ]]; then
        warn "Timeout de hooks: NO MEDIDO — el gate no devolvió conteo"
    elif [[ "$HTO" == OK:* ]]; then
        ok "Timeout de hooks: ${HTO#OK: }"
    else
        warn "Timeout de hooks: $HTO — ejecuta check_hooks_timeout.py"
    fi
else
    warn "Timeout de hooks: check_hooks_timeout.py no encontrado"
fi

# --- coherencia de la declaración de deprecación ---------------------------
tick "coherencia de la declaración de deprecación"
#
# Un artefacto con un defecto medido se queda como evidencia: se marca
# desactivado con su motivo y su sucesor, y la versión nueva vive al lado. Este
# gate mide que las dos mitades vayan juntas —la cabecera que declara y el
# guard que aplica—, NO decide qué merece deprecarse: eso es juicio, y su cero
# significa «ninguna declaración a medias», no «no queda deuda».
if [[ -f .claude/scripts/gates/check_script_deprecated.py ]]; then
    DEP=$(python3 .claude/scripts/gates/check_script_deprecated.py --quiet 2>/dev/null)
    DEPDEN=$(python3 .claude/scripts/gates/check_script_deprecated.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$DEP" ]]; then
        warn "Deprecación declarada: NO MEDIDO — el guion no devolvió conteo"
    elif [[ "$DEP" -eq 0 ]]; then
        ok "Deprecación declarada: coherente — $DEPDEN"
    else
        warn "Deprecación declarada: $DEP a medias — ejecuta check_script_deprecated.py"
    fi
else
    warn "Deprecación declarada: check_script_deprecated.py no encontrado"
fi

# --- aislamiento declarado vs anunciado en los agentes ---------------------
tick "aislamiento declarado vs anunciado en los agentes"
#
# Un agente que declara `isolation: worktree` entrega en
# `.claude/worktrees/agent-<id>/`, no en el clon: quien lo despacha necesita
# saberlo para hacer el pase de consolidación. Cuando el frontmatter y la
# `description` discrepan, alguien opera sobre una premisa falsa. NO mide si el
# aislamiento está justificado — ese criterio es de juicio y vive en
# `.claude/references/coordinator-integration.md`.
if [[ -f .claude/scripts/gates/check_agent_isolation.py ]]; then
    AIS=$(python3 .claude/scripts/gates/check_agent_isolation.py --quiet 2>/dev/null)
    AISDEN=$(python3 .claude/scripts/gates/check_agent_isolation.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$AIS" ]]; then
        warn "Aislamiento de agentes: NO MEDIDO — el guion no devolvió conteo"
    elif [[ "$AIS" -eq 0 ]]; then
        ok "Aislamiento de agentes: frontmatter y description coinciden — $AISDEN"
    else
        warn "Aislamiento de agentes: $AIS incoherente(s) — ejecuta check_agent_isolation.py"
    fi
else
    warn "Aislamiento de agentes: check_agent_isolation.py no encontrado"
fi

# --- cifra que es propiedad de un artefacto vivo ---------------------------
tick "cifra que es propiedad de un artefacto vivo"
#
# El corolario de `calibration-verified-numbers.md`: si el número lo produce
# un comando, la prosa nombra EL COMANDO, no el número. Ciego al ordinal de
# gate suelto a propósito — colisiona con los IDs de tarea (ver el docstring).
if [[ -f .claude/scripts/gates/check_cifra_de_artefacto_vivo.py ]]; then
    CIF=$(python3 .claude/scripts/gates/check_cifra_de_artefacto_vivo.py --quiet 2>/dev/null)
    CIFDEN=$(python3 .claude/scripts/gates/check_cifra_de_artefacto_vivo.py 2>/dev/null | tail -1 | sed 's/^ *//')
    if [[ -z "$CIF" ]]; then
        warn "Cifra-propiedad: NO MEDIDO — el guion no devolvió conteo"
    elif [[ "$CIF" -eq 0 ]]; then
        ok "Cifra-propiedad: sin transcripciones nuevas — $CIFDEN"
    else
        warn "Cifra-propiedad: $CIF nueva(s) — ejecuta check_cifra_de_artefacto_vivo.py"
    fi
else
    warn "Cifra-propiedad: check_cifra_de_artefacto_vivo.py no encontrado"
fi

# --- colisiones de etiqueta ENTRE ramas hermanas vivas ---------------------
tick "colisiones de etiqueta ENTRE ramas hermanas vivas"
#
# `check-ids-duplicados.sh` mide el arbol de trabajo. Dos ramas que avanzan en
# paralelo eligen el numero siguiente cada una mirando el suyo: la colision no
# existe en ninguna de las dos y NACE EN EL MERGE. Surfacing, no bloqueante:
# al cablearlo habia 6 vivas y ninguna es de quien empuja.
if [[ -f .claude/scripts/gates/check_ids_entre_ramas.py ]]; then
    RAMAS=$(python3 .claude/scripts/gates/check_ids_entre_ramas.py --quiet 2>/dev/null)
    if [[ -z "$RAMAS" ]]; then
        warn "IDs entre ramas: NO MEDIDO — el guion no devolvio conteo"
    elif [[ "$RAMAS" -eq 0 ]]; then
        ok "IDs entre ramas: sin colisiones"
    else
        warn "IDs entre ramas: $RAMAS colision(es) — ejecuta check_ids_entre_ramas.py"
    fi
else
    warn "IDs entre ramas: check_ids_entre_ramas.py no encontrado"
fi

# --- corpus extraido contra el ejecutable instalado ------------------------
tick "corpus extraido contra el ejecutable instalado"
#
# El corpus de `tools/claude-code-bin/` responde toda consulta sobre el
# binario. Cuando el ejecutable avanza y el corpus no, sigue respondiendo —
# con las respuestas del build anterior, y sin sintoma. Ocurrio: 2.1.241
# extraido contra 2.1.246 servido, cinco versiones (H-DOCS-434).
if [[ -f .claude/scripts/gates/check_corpus_al_dia.py ]]; then
    CORPUS=$(python3 .claude/scripts/gates/check_corpus_al_dia.py 2>/dev/null | head -1)
    CORPUS_RC=$?
    if [[ -z "$CORPUS" ]]; then
        warn "Corpus del binario: NO MEDIDO — el guion no devolvio veredicto"
    elif [[ "$CORPUS" == corpus\ al\ dia* ]]; then
        ok "Corpus del binario: $CORPUS"
    else
        warn "Corpus del binario: $CORPUS"
    fi
else
    warn "Corpus del binario: check_corpus_al_dia.py no encontrado"
fi

# --- contrato de .gitattributes en los cinco clones ------------------------
tick "contrato de .gitattributes en los cinco clones"
#
# Sin `.gitattributes` la normalizacion de finales de linea la decide
# `core.autocrlf` de `.git/config`, que no se versiona: el mismo archivo se
# normaliza en un clon y no en el de al lado. El gate nombra los repos que NO
# midio — un conteo sobre cero repos y uno sobre cinco publican la misma cifra.
if [[ -f .claude/scripts/gates/check_gitattributes.py ]]; then
    GAT=$(python3 .claude/scripts/gates/check_gitattributes.py --quiet 2>/dev/null \
              | grep -oE 'check_gitattributes: [0-9]+' | grep -oE '[0-9]+')
    GATDEN=$(python3 .claude/scripts/gates/check_gitattributes.py --quiet 2>/dev/null \
              | grep -oE "alcance medido: [^)]*")
    if [[ -z "$GAT" ]]; then
        warn "Contrato .gitattributes: NO MEDIDO — el guion no devolvio conteo"
    elif [[ "$GAT" -eq 0 ]]; then
        ok "Contrato .gitattributes: sin divergencias — $GATDEN"
    else
        warn "Contrato .gitattributes: $GAT divergencia(s) — ejecuta check_gitattributes.py"
    fi
else
    warn "Contrato .gitattributes: check_gitattributes.py no encontrado"
fi

# --- forma del comando de hook: el script tiene que ser identificable -------
tick "forma del comando de hook: el script tiene que ser identificable"
#
# `arranque_de_clon.py` toma el primer token de ruta como «el script». Un
# comando con `cat datos | bash hook.sh`, con `-c`, o con dos scripts encadenados
# hace que ese token NO sea el script — y el diagnostico sale mal sin avisar.
# Cero comandos medidos NO es un aprobado: el guion lo declara y --strict falla.
if [[ -f .claude/scripts/gates/check_hook_script_token.py ]]; then
    HTK=$(python3 .claude/scripts/gates/check_hook_script_token.py --quiet 2>/dev/null \
              | grep -oE 'check_hook_script_token: [0-9]+' | grep -oE '[0-9]+')
    HTKDEN=$(python3 .claude/scripts/gates/check_hook_script_token.py --quiet 2>/dev/null \
              | grep -oE "alcance medido: [^)]*")
    if [[ -z "$HTK" ]]; then
        warn "Forma del comando de hook: NO MEDIDO — el guion no devolvio conteo"
    elif [[ "$HTK" -eq 0 ]]; then
        ok "Forma del comando de hook: sin comandos opacos — $HTKDEN"
    else
        warn "Forma del comando de hook: $HTK opaco(s) — ejecuta check_hook_script_token.py"
    fi
else
    warn "Forma del comando de hook: check_hook_script_token.py no encontrado"
fi

# --- mutante superviviente del medidor de suite ----------------------------
tick "mutante superviviente del medidor de suite"
#
# `check_suite_discrimina.py` muta el arbol en el sitio y restaura desde un
# `finally`, que protege contra una excepcion y NO contra la muerte del proceso.
# Un mutante superviviente no rompe ningun test —su efecto es devolver el valor
# que el llamador ya admite— asi que sin este gate vive hasta que alguien mire
# `git status` por otro motivo. Es lo que paso en H-DOCS-307.
if [[ -f .claude/scripts/gates/check_suite_discrimina.py ]]; then
    MUTLINEA=$(python3 .claude/scripts/gates/check_suite_discrimina.py --verificar 2>/dev/null | head -1)
    # El patron se ancla al NOMBRE del gate, no al sustantivo: `: N mutante`
    # casaria dos veces el dia que el denominador diga «mutantes» en vez de
    # «archivos .py», y el bloque publicaria dos numeros pegados. Es el
    # defecto de H-DOCS-493, aqui prevenido antes de que ocurra (#941).
    MUT=$(printf '%s' "$MUTLINEA" \
        | grep -oE '^check-suite-discrimina --verificar: [0-9]+' | grep -oE '[0-9]+$')
    MUTDEN=$(printf '%s' "$MUTLINEA" | grep -oE "alcance medido: [^)]*")
    if [[ -z "$MUT" ]]; then
        warn "Mutante superviviente: NO MEDIDO — el guion no devolvió conteo"
    elif [[ "$MUT" -eq 0 ]]; then
        ok "Mutante superviviente: el árbol está limpio — $MUTDEN"
    else
        bad "Mutante superviviente: $MUT vivo(s) — corre check_suite_discrimina.py --verificar"
    fi
else
    warn "Mutante superviviente: check_suite_discrimina.py no encontrado"
fi

# --- guion huerfano y catalogo de scripts reproducible ---------------------
tick "guion huerfano y catalogo de scripts reproducible"
#
# Dos mitades del mismo fondo. El catalogo se DERIVA de quien cita a cada
# guion, asi que un consumidor que desaparece degrada su clase sola; si el
# archivo en disco deja de reproducir, alguien lo edito a mano y el
# instrumento de descripcion dejo de describir. El huerfano es el caso
# extremo: nadie lo cita, y desde el listado se ve igual que uno critico.
# Los 5 heredados van en baseline — uno NUEVO es lo que este gate atrapa.
if [[ -f .claude/scripts/corpus/censar_scripts.py ]]; then
    HUERLINEA=$(python3 .claude/scripts/corpus/censar_scripts.py --huerfanos 2>/dev/null | head -1)
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
    if python3 .claude/scripts/corpus/censar_scripts.py --verificar >/dev/null 2>&1; then
        ok "Catalogo de scripts: reproduce byte a byte"
    else
        warn "Catalogo de scripts: NO reproduce — corre censar_scripts.py sin --verificar"
    fi
else
    warn "Guion huerfano: censar_scripts.py no encontrado"
fi

# --- el generador de un evento no toma el instante del reloj ---------------
tick "determinismo del generador de evento"
#
# El cliente RECHAZA en el parseo un guion de workflow que use Date.now() —
# "breaks resume", porque su cache es por (prompt, opts). Nuestros generadores
# derivan el instante del RUN_ID por la misma razon, y eso era convencion:
# nada impedia que el siguiente llamara al reloj. Ver H-DOCS-490.
#
# Se mide con `medir_gate`/`gate_midio` — el mecanismo que trae H-DOCS-492: su
# guarda rehusa con exit 2 cuando la raiz de eventos no existe, y ahi un 0
# seria un verde falso.
if [[ -f .claude/scripts/gates/check_generator_determinism.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_generator_determinism.py
    # El patron se ancla al NOMBRE del gate: `: N generador` casa dos veces
    # en la misma linea — el conteo y el denominador — y DET salia con dos
    # numeros. Ver H-DOCS-493.
    DET=$(printf '%s' "$GATE_N" | grep -oE '^check-generator-determinism: [0-9]+' | grep -oE '[0-9]+$')
    DETDEN=$(printf '%s' "$GATE_N" | grep -oE "alcance medido: [^)]*")
    if ! gate_midio "Determinismo del generador"; then :
    elif [[ -z "$DET" ]]; then
        warn "Determinismo del generador: SIN MEDIR — la salida no trae conteo"
    elif [[ "$DET" -eq 0 ]]; then
        ok "Determinismo del generador: 0 toman el instante del reloj — $DETDEN"
    else
        warn "Determinismo del generador: $DET generador(es) llaman al reloj — deriva el instante del RUN_ID"
    fi
else
    warn "Determinismo del generador: check_generator_determinism.py no encontrado"
fi

# --- una regla que cita un literal del ejecutable lo cita VERBATIM ---------
tick "cita verbatim de literal del ejecutable"
#
# H-DOCS-211 dejo en dos reglas de api `min(16, CPUs-2)` donde el ejecutable
# declara `Math.min(16,Math.max(2,r-2))`. La parafrasis pierde el piso: con
# `nproc <= 3` predice 1 donde el real es 2. Aqui coincidian por casualidad
# —`nproc` = 4 da 2 por ambas formas— y esa coincidencia lo oculto nueve dias.
#
# Directiva del ejecutor 2026-08-28: *«si se escribe en prosa es dificil
# recordar, es por eso que usamos los scripts»*. Este gate es esa forma: el
# literal se RE-MIDE del ejecutable en cada pase, no se recuerda.
if [[ -f .claude/scripts/gates/check_binary_literal_citations.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_binary_literal_citations.py
    CITA=$(printf '%s' "$GATE_N" \
        | grep -oE '^check-binary-literal-citations: [0-9]+' | grep -oE '[0-9]+$')
    CITADEN=$(printf '%s' "$GATE_N" | grep -oE "alcance medido: [^)]*")
    if ! gate_midio "Cita de literal del ejecutable"; then :
    elif [[ -z "$CITA" ]]; then
        warn "Cita de literal del ejecutable: SIN MEDIR — la salida no trae conteo"
    elif [[ "$CITA" -eq 0 ]]; then
        ok "Cita de literal del ejecutable: 0 parafraseadas — $CITADEN"
    else
        warn "Cita de literal del ejecutable: $CITA parafraseada(s) — el ejecutable manda, no la memoria"
    fi
else
    warn "Cita de literal del ejecutable: check_binary_literal_citations.py no encontrado"
fi

# ----------------------------------------------------------------------
# El veredicto de un gate NO colapsa "no pude medir" con "0 defectos".
#
# Un `${VAR:-0}` sobre la salida de un gate publica PASS cuando el gate
# rehusa: la cadena vacia se lee como cero. Es el sub-patron D de
# `metrica-decide-la-conclusion.md` aplicado al propio auditor — el verde
# no distingue "no hay defectos" de "el instrumento no midio". Ver
# :ref:`h-docs-492`.
#
# El gate se mide a si mismo con `medir_gate`/`gate_midio`, que es el
# mecanismo que introduce; usar el idioma viejo aqui seria el defecto
# dentro de su propio control.
# --- deriva de premisa entre dos ejecuciones --------------------------------
tick "Deriva de premisa: una ficha que cambio de veredicto desde el baseline"
#
# La cadena de premisas —detector, emisor, evaluador— existia entera y nadie la
# corria (tarea #10). Su valor no esta en el veredicto de un dia: el acuerdo del
# mismo dia es estructural, porque los instrumentos se incluyen. Esta en la
# RE-MEDICION, y sin un disparador periodico esa segunda lectura no ocurre.
#
# El gate publica la DIFERENCIA contra un baseline, no los veredictos. Sin
# baseline rehusa con 2 en vez de publicar un 0: «nada cambio» y «no habia
# contra que medir» no se pueden colapsar.
if [[ -f .claude/scripts/gates/check_premise_drift.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_premise_drift.py --quiet; PDR="$GATE_N"
    PDRDEN=$(python3 .claude/scripts/gates/check_premise_drift.py 2>/dev/null \
             | grep -oE "alcance medido: [^)]*")
    if ! gate_midio "Deriva de premisa"; then :
    elif [[ "$PDR" -eq 0 ]]; then ok "Deriva de premisa: ningun veredicto cambio — $PDRDEN"
    else warn "Deriva de premisa: $PDR ficha(s) cambiaron de veredicto — ejecuta check_premise_drift.py"; fi
else
    warn "Deriva de premisa: check_premise_drift.py no encontrado"
fi

tick "Veredicto de gate: no lee «no pude medir» como 0"
if [[ -f .claude/scripts/gates/check_veredicto_de_gate.py ]]; then
    medir_gate python3 .claude/scripts/gates/check_veredicto_de_gate.py --quiet; VDG="$GATE_N"
    VDGDEN=$(python3 .claude/scripts/gates/check_veredicto_de_gate.py 2>/dev/null \
             | grep -oE "alcance medido: [^)]*")
    if ! gate_midio "Veredicto de gate"; then :
    elif [[ "$VDG" -eq 0 ]]; then ok "Veredicto de gate: ninguno colapsa el rechazo con un 0 — $VDGDEN"
    else warn "Veredicto de gate: $VDG veredicto(s) leen «no pude medir» como 0 — usa medir_gate/gate_midio"; fi
else
    warn "Veredicto de gate: check_veredicto_de_gate.py no encontrado"
fi

# ----------------------------------------------------------------------
# Deriva del puente de hooks (tarea #107, :ref:`h-docs-1010`).
# El `.claude/settings.json` de un clon NO es fuente de settings bajo el
# harness remoto: el cwd del proceso es /home/user y los clones entran como
# directorios adicionales. Un hook declarado ahí está escrito y no dispara —
# y su ausencia no produce ningún error, así que se lee como que corrió.
tick "Los hooks declarados en los clones llegan a la fuente viva de settings."
if [[ -f .claude/scripts/bridge_hooks.py ]]; then
    medir_gate python3 .claude/scripts/bridge_hooks.py --quiet; PHK="$GATE_N"
    PHKDEN=$(python3 .claude/scripts/bridge_hooks.py --quiet 2>/dev/null | head -1)
    if ! gate_midio "Puente de hooks"; then :
    elif [[ "$PHK" -eq 0 ]]; then ok "Puente de hooks: todo lo puenteable está en la fuente — $PHKDEN"
    else warn "Puente de hooks: $PHK sin puentear — $PHKDEN; corre bridge_hooks.py (dry-run) y --apply al arrancar sesión"; fi
else
    warn "Puente de hooks: bridge_hooks.py no encontrado"
fi

$TIMING && volcar_desglose

echo ""
echo "## Score: $PASS PASS · $FAIL FAIL · $WARN WARN"
[[ "$FAIL" -eq 0 ]] && echo "Veredicto mecánico: VERDE (el juicio cualitativo lo añade increment-acceptor)" \
                   || echo "Veredicto mecánico: hay FAIL — ver action plan"
$STRICT && [[ "$FAIL" -gt 0 ]] && exit 1
exit 0
