#!/usr/bin/env bash
# test-toolchain-sh.sh — contrato del selector de toolchain del proveedor.
#
# El defecto que cierra, medido hoy: `api: scripts/check_identifier_language.py`
# delega en el gate del proveedor con `sys.executable`, o sea con el interprete
# que HEREDA de quien lo invoca. Sobre el mismo arbol, el mismo baseline y los
# mismos 2587 archivos eso dio dos veredictos opuestos:
#
#   python3       3.11.15  corpus True   exit 1  «FAIL — 2994 fuera»
#   uv run python 3.12.3   corpus False  exit 0  «OK: en ingles»
#
# La causa es de reparto, no de codigo: las dependencias del MECANISMO las
# declara el proveedor (`thyrox: pyproject.toml`), y las del SUJETO las declara
# el consumidor (`kaupamex-api: pyproject.toml`). Son dos entornos y hay que
# elegir a proposito.
#
# El caso que DISCRIMINA es el 5: los dos interpretes tienen que ser
# DISTINTOS. Un selector que devolviera `python3` para ambos pasa los casos
# 1-4 y falla el 5, que es justo la diferencia.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

# Caso 1 — el archivo existe y se puede sourcear dos veces sin efecto.
if [[ -f "$SUBJECT" ]]; then ok "el selector existe"; else bad "falta $SUBJECT"; fi
source "$SUBJECT" 2>/dev/null || true
source "$SUBJECT" 2>/dev/null || true

# Caso 2 — el interprete del PROVEEDOR es el de su propio entorno declarado.
provider="$(thyrox_toolchain_provider_python 2>/dev/null || echo '')"
if [[ "$provider" == "$ROOT/.venv/bin/python" ]]; then
  ok "el proveedor usa su propio entorno"
else
  bad "el proveedor deberia usar $ROOT/.venv/bin/python, dio '$provider'"
fi

# Caso 3 — sin entorno del proveedor REHUSA, y nombra el remedio. No cae a
# `python3`: un fallback silencioso reintroduce exactamente la divergencia.
salida="$(THYROX_ROOT="$(mktemp -d)" thyrox_toolchain_provider_python 2>&1)"; codigo=$?
if [[ $codigo -ne 0 && "$salida" == *"uv sync"* ]]; then
  ok "sin entorno rehusa y nombra uv sync"
else
  bad "deberia rehusar nombrando uv sync; codigo=$codigo salida='$salida'"
fi

# Caso 4 — el consumidor se invoca por SU proyecto, no por el del proveedor.
consumer="$(thyrox_toolchain_consumer_argv api 2>/dev/null || echo '')"
if [[ "$consumer" == *"uv run --project"* && "$consumer" == *"kaupamex-api"* ]]; then
  ok "el consumidor se invoca por su propio proyecto"
else
  bad "esperaba 'uv run --project <ruta de api>', dio '$consumer'"
fi

# Caso 5 — EL DISCRIMINANTE: los dos no pueden ser el mismo interprete.
if [[ -n "$provider" && "$consumer" != *"$provider"* ]]; then
  ok "proveedor y consumidor son entornos distintos"
else
  bad "el selector no distingue los dos entornos"
fi

# Caso 6 — un repositorio que no existe se rehusa por nombre, no se compone.
if ! thyrox_toolchain_consumer_argv no-existe >/dev/null 2>&1; then
  ok "un consumidor desconocido se rehusa"
else
  bad "compuso una ruta para un consumidor que no existe"
fi

thyrox_summary
