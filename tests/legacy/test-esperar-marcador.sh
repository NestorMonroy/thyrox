#!/bin/bash
# =============================================================================
# test-esperar-marcador.sh — prueba de esperar-marcador.sh
# =============================================================================
#
# Las tres salidas se prueban contra procesos REALES, no simulados: un `bash -c`
# que escribe el marcador, otro que muere sin escribirlo, y uno que sigue vivo
# al vencer el plazo. Un fixture que sólo tocara archivos probaría el `grep`,
# que no es lo que el guion aporta — lo que aporta es distinguir "murió" de
# "sigue" usando el pid.
#
# Uso:  bash .claude/scripts/test-esperar-marcador.sh
# =============================================================================

set -uo pipefail

# El SUT vive un nivel arriba: los tests son un directorio hermano del
# código, no viven junto a él (forma medida en ``ccb: daemon/src/__tests__/``).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUT="$SCRIPT_DIR/session/esperar-marcador.sh"

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
export ESPERAR_INTERVALO=1

echo "== 1. el trabajo termina bien -> exit 0 =="
LOG="$TMP/ok.log"
nohup bash -c "sleep 1; echo 'todo bien' >> '$LOG'; echo 'EXIT=0' >> '$LOG'" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
: > "$LOG"
OUT=$(bash "$SUT" "$LOG" --pid "$P" --timeout 20 2>&1); RC=$?
check "marcador presente -> exit 0" "0" "$RC"
case "$OUT" in *"EXIT=0"*) check "imprime la cola real del log" "sí" "sí" ;;
               *)          check "imprime la cola real del log" "sí" "no" ;; esac

echo "== 2. el trabajo muere sin marcador -> exit 2 (BAIL), no timeout =="
LOG="$TMP/muere.log"
nohup bash -c "echo 'arranco' >> '$LOG'; sleep 1; kill -9 \$\$" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
INICIO=$(date +%s)
OUT=$(bash "$SUT" "$LOG" --pid "$P" --timeout 60 2>&1); RC=$?
DURACION=$(( $(date +%s) - INICIO ))
check "muerte sin marcador -> exit 2" "2" "$RC"
check "aborta pronto, NO agota los 60s del timeout" "sí" "$( (( DURACION < 20 )) && echo sí || echo "no (${DURACION}s)" )"
case "$OUT" in *"NO es un"*"timeout"*) check "distingue BAIL de timeout en el mensaje" "sí" "sí" ;;
                                   *) check "distingue BAIL de timeout en el mensaje" "sí" "no" ;; esac
case "$OUT" in *"arranco"*) check "adjunta la cola real como evidencia" "sí" "sí" ;;
                        *) check "adjunta la cola real como evidencia" "sí" "no" ;; esac

echo "== 3. el trabajo muere con el log VACÍO -> lo dice explícito =="
LOG="$TMP/vacio.log"; : > "$LOG"
nohup bash -c "sleep 1; kill -9 \$\$" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
OUT=$(bash "$SUT" "$LOG" --pid "$P" --timeout 30 2>&1); RC=$?
check "log vacío + muerte -> exit 2" "2" "$RC"
case "$OUT" in *"murió antes de emitir nada"*) check "nombra el caso de 0 bytes" "sí" "sí" ;;
                                            *) check "nombra el caso de 0 bytes" "sí" "no" ;; esac

echo "== 4. sigue vivo al vencer el plazo -> exit 3, y NO lo llama muerte =="
LOG="$TMP/lento.log"; : > "$LOG"
nohup bash -c "sleep 30" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
OUT=$(bash "$SUT" "$LOG" --pid "$P" --timeout 3 2>&1); RC=$?
kill -9 "$P" 2>/dev/null || true
check "vivo al vencer -> exit 3 (no 2)" "3" "$RC"
case "$OUT" in *"sigue vivo"*) check "el timeout dice que el proceso vive" "sí" "sí" ;;
                            *) check "el timeout dice que el proceso vive" "sí" "no" ;; esac

echo "== 5. sin --pid declara que no puede decidir, en vez de fingirlo =="
LOG="$TMP/sinpid.log"; : > "$LOG"
OUT=$(bash "$SUT" "$LOG" --timeout 2 2>&1); RC=$?
check "sin --pid -> exit 3" "3" "$RC"
case "$OUT" in *"no se puede distinguir"*) check "declara la indecidibilidad" "sí" "sí" ;;
                                        *) check "declara la indecidibilidad" "sí" "no" ;; esac

echo "== 6. carrera: escribe el marcador y muere en el mismo instante =="
LOG="$TMP/carrera.log"; : > "$LOG"
nohup bash -c "sleep 1; echo 'EXIT=0' >> '$LOG'; kill -9 \$\$" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
OUT=$(bash "$SUT" "$LOG" --pid "$P" --timeout 20 2>&1); RC=$?
check "marcador escrito al morir -> exit 0, no BAIL" "0" "$RC"

echo "== 7. patrón propio (no sólo EXIT=) =="
LOG="$TMP/patron.log"; : > "$LOG"
nohup bash -c "sleep 1; echo '2464 passed in 585s' >> '$LOG'; sleep 20" >/dev/null 2>&1 &
P=$!; disown $P 2>/dev/null || true
OUT=$(bash "$SUT" "$LOG" --pid "$P" --patron 'passed|failed' --timeout 20 2>&1); RC=$?
kill -9 "$P" 2>/dev/null || true
check "--patron arbitrario -> exit 0" "0" "$RC"

echo
echo "resultado: $PASS ok, $FAIL fallas"
[[ "$FAIL" -eq 0 ]] || exit 1
