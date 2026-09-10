#!/bin/bash
# =============================================================================
# .claude/scripts/gates/check-fr-admin-coverage.sh — gate de cobertura FR↔UC admin
# =============================================================================
# Verifica que CADA caso de uso del subdominio admin (casos-uso/admin/uc-adm-NN)
# tenga >=1 Requisito Funcional derivado en requisitos-funcionales/admin/
# uc-adm-NN-<slug>/fr-adm-NN-*.rst.
#
# Origen: iniciativa VIVA `derivar-frs-admin` (SOL-012, H-DOCS-01). El subdominio
# admin tenía la capa 2 vacía; este gate impide que un UC-ADM nuevo vuelva a
# quedar sin FRs sin que salte en el coherence-audit (surfacing cada sesión).
#
# El eje es el DOMINIO, no el actor: dominios operados por admin/staff
# (inventario, logistica, reportes…) NO cuentan aquí — viven en su dominio.
#
# Uso:
#   bash .claude/scripts/gates/check-fr-admin-coverage.sh          # reporte
#   bash .claude/scripts/gates/check-fr-admin-coverage.sh --strict # exit 1 si falta
#   bash .claude/scripts/gates/check-fr-admin-coverage.sh --quiet  # solo el conteo
# =============================================================================
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"
STRICT=false; QUIET=false
for a in "$@"; do
  [[ "$a" == "--strict" ]] && STRICT=true
  [[ "$a" == "--quiet" ]]  && QUIET=true
done

UC_DIR="source/requisitos/casos-uso/admin"
FR_DIR="source/requisitos/requisitos-funcionales/admin"

VIOL=0; TOTAL=0
report() { $QUIET || echo "$1"; }

for uc in "$UC_DIR"/uc-adm-*.rst; do
  [[ -f "$uc" ]] || continue
  slug="$(basename "$uc" .rst)"                       # uc-adm-NN-<slug>
  num="$(printf '%s' "$slug" | grep -oE 'uc-adm-[0-9]+' | grep -oE '[0-9]+')"
  TOTAL=$((TOTAL+1))
  cnt=$(find "$FR_DIR/$slug" -maxdepth 1 -iname "fr-adm-${num}-*.rst" 2>/dev/null | wc -l)
  if [[ "$cnt" -eq 0 ]]; then
    VIOL=$((VIOL+1))
    report "FALTAN FRs: $slug (0 fr-adm-${num}-*)"
  else
    report "OK: $slug ($cnt FRs)"
  fi
done

if $QUIET; then
  echo "$VIOL"
else
  echo "---"
  echo "UC-ADM sin FRs derivados: $VIOL de $TOTAL"
fi

# Universo vacío = el gate no encontró su árbol (se corrió fuera del repo docs).
# No puede afirmar nada, así que no sale verde. Ver H-API-336.
if [[ "$TOTAL" -eq 0 ]]; then
  $QUIET || echo "check-fr-admin-coverage: 0 UC-ADM que medir — el gate no puede afirmar nada. ¿Se corrió fuera de kaupamex-docs?"
  exit 2
fi

if $STRICT && [[ "$VIOL" -gt 0 ]]; then exit 1; fi
exit 0
