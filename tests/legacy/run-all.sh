#!/usr/bin/env bash
# Corre todas las pruebas de ``.claude/scripts/`` y publica el resultado con su
# denominador.
#
# Por qué existe: hasta 2026-08-13 los tests eran archivos hermanos del código,
# sin directorio propio y sin punto de entrada. Correrlos exigía **saberse los
# nombres** — cinco entonces, más después. La referencia resuelve lo mismo con
# descubrimiento (``bun test`` sobre ``src/__tests__/``); aquí el equivalente
# nativo es un glob, porque nuestras pruebas son bash y python sin framework.
#
# Descubre ``test-*.sh`` y ``test-*.py`` de este directorio. Un test nuevo entra
# solo por existir: no hay lista que mantener, que es la mitad del punto.
#
# Uso:  bash .claude/scripts/tests/run-all.sh [--quiet]
# Sale 0 si todas pasan, 1 si alguna falla, 2 si no encontró ninguna.

set -uo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

# `test_*.py` ademas de `test-*.py`: `convention-naming.md` manda snake_case en
# todo `.py` (el nombre ES el modulo), asi que los tests de Python se llaman
# `test_x.py` y el glob con guion no los veia. Medido al añadirlo: 44
# descubiertos contra 46 archivos de test en disco — dos suites corriendo cero
# veces mientras el runner publicaba «44 PASS». Ver H-DOCS-396.
mapfile -t SUITES < <(find "$TEST_DIR" -maxdepth 1 \
  \( -name 'test-*.sh' -o -name 'test-*.py' -o -name 'test_*.py' \) | sort)

TOTAL=${#SUITES[@]}
if (( TOTAL == 0 )); then
  echo "ERROR: no se encontró ninguna prueba en $TEST_DIR" >&2
  exit 2
fi

VERDES=0
declare -a ROJAS=()

for suite in "${SUITES[@]}"; do
  nombre="$(basename "$suite")"
  case "$suite" in
    *.py) salida=$(python3 "$suite" 2>&1) ;;
    *)    salida=$(bash    "$suite" 2>&1) ;;
  esac
  rc=$?

  if (( rc == 0 )); then
    VERDES=$(( VERDES + 1 ))
    (( QUIET )) || printf '  ok    %-34s (exit 0)\n' "$nombre"
  else
    ROJAS+=("$nombre")
    printf '  FALLA %-34s (exit %d)\n' "$nombre" "$rc"
    # La cola es lo único que se imprime: el detalle vive en la salida de la
    # suite, y volcarla entera aquí ahogaría el resumen.
    printf '%s\n' "$salida" | tail -12 | sed 's/^/        /'
  fi
done

echo
# El denominador va SIEMPRE junto al conteo: sin él, un runner ciego y uno
# correcto publican la misma cifra (lección de check-hallazgo-sucesor.sh).
echo "resultado: $VERDES de $TOTAL suites en verde"
if (( ${#ROJAS[@]} > 0 )); then
  printf 'fallaron: %s\n' "${ROJAS[*]}"
  exit 1
fi
exit 0
