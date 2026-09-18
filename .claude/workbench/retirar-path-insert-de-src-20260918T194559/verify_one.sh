#!/usr/bin/env bash
# Verifica UN modulo tras el barrido, en DOS ejes que no se colapsan:
#
#   1. CABLEADO  -- el modulo llega a cargar. Es el eje que el barrido de
#                   `sys.path.insert` puede romper.
#   2. ESCRITURA -- no escribe al importarse, medido por CONDUCTA (strace),
#                   que es el contrato de assert_no_writes (ERR-066).
#
# Dos correcciones que el control destapo, en este orden:
#
#   a) La primera version devolvia el codigo de assert_no_writes tal cual, y
#      ese codigo es ciego al exito del sujeto: un modulo que NO carga y no
#      llega a escribir sale 0 y la fila se lee como verde. Medido: 4 de 96
#      filas verdes con subject_exit != 0, y dos eran una regresion real.
#   b) La segunda uso el codigo de salida del sujeto como veredicto, y eso
#      confunde «no cargo» con «cargo y rehuso por su propia politica» — la
#      guarda DEPRECATED de backfill_agent_sessions y el rehuse de
#      check_rst_referencias al medir un consumidor desde el proveedor.
#
# El discriminador es la CLASE de la excepcion, no el codigo de salida: es el
# mismo criterio que `exercise_entrypoints` ya deriva del fenomeno en vez de
# mantener una lista de excepciones por nombre, que envejece.
#
# Veredictos: 0 carga y no escribe - 1 escribe - 2 no se pudo medir
#             3 no carga (ImportError: cableado roto)
set -uo pipefail
ROOT="${THYROX_ROOT:-/home/user/thyrox}"
MODULE="$1"
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

read -r -d '' PROGRAM <<'PY' || true
import importlib, sys
try:
    importlib.import_module(sys.argv[1])
except ImportError as exc:
    print(f'{type(exc).__name__}: {exc}', file=sys.stderr)
    raise SystemExit(3)
except BaseException:
    # Cargo y luego rehuso: politica del modulo, no del cableado.
    raise SystemExit(0)
raise SystemExit(0)
PY

salida="$(bash "$ROOT/bin/assert_no_writes" -- python3 -c "$PROGRAM" "$MODULE" 2>&1)"
writes_code=$?

subject_code="$(printf '%s' "$salida" | grep -oE 'subject_exit=[0-9]+' | head -1 | cut -d= -f2)"
subject_code="${subject_code:-desconocido}"

if [ "$writes_code" -eq 2 ]; then
    veredicto=2
elif [ "$subject_code" = "3" ]; then
    veredicto=3
elif [ "$writes_code" -ne 0 ]; then
    veredicto=1
else
    veredicto=0
fi

printf '%s\t%s\tsubject_exit=%s\t%s\n' "$MODULE" "$veredicto" "$subject_code" \
    "$(printf '%s' "$salida" | tr '\n' ' ' | cut -c1-200)"
exit $veredicto
