#!/usr/bin/env bash
# commit-msg-citation.sh — el gate de resolucion de cita, para un HOOK que llama.
#
# Por que existe este envoltorio y no se invoca el gate directo
# --------------------------------------------------------------
# `citation_resolution.py` sale 0 (todas resuelven), 1 (hay deuda) o 2 (no pudo
# medir). Los cinco `.githooks/commit-msg` de los consumidores declaran
# `set -euo pipefail` y cierran con `exit "$EXIT"`: un **1** los aborta ANTES de
# su propio veredicto Tim Pope, o sea que el aviso de una deuda heredada haria
# caer un commit por una razon que no es la suya.
#
# De ahi el contrato, y es la razon de ser del archivo:
#
#     SALE 0 O 2. NUNCA 1.
#
#   0 — se midio. Si habia deuda, el aviso ya fue por stderr; el commit sigue.
#   2 — NO se pudo medir. Un 0 aqui lo leeria el hook llamador como permiso,
#       que es el defecto que `evidencia-antes-de-afirmar` cierra.
#
# LA GRADUACION ES UNA LINEA, Y AQUI. Cuando el historial sostenga 0 sin
# resolver —`citation_resolution.py --history 50`— se saca el `1` de su cubo y
# se le da `exit 1` propio. Un solo archivo, y los cinco stubs no se tocan: por
# eso la politica vive en el proveedor y no replicada en cada consumidor.
#
# Uso:  bash commit-msg-citation.sh <archivo-de-mensaje>
set -uo pipefail

MENSAJE="${1:-}"
if [[ -z "$MENSAJE" ]]; then
    echo "commit-msg-citation REHUSADO — no se recibio el archivo de mensaje." >&2
    exit 2
fi

# La raiz sale de la UBICACION de este guion, no de `THYROX_ROOT`. Medido por
# conducta: `bin/` ASIGNA `THYROX_ROOT` desde su propia ubicacion antes de
# invocar, asi que un valor declarado por el llamador ya viene pisado cuando se
# entra aqui —`THYROX_ROOT=/no/existe bash bin/commit-msg-citation` sale 0, no 2—.
# Leerla aqui seria una rama muerta que aparenta honrar una declaracion que no
# llega: el sub-patron D con este guion como sujeto.
#
# Quien SI resuelve y rehusa es el stub del consumidor, que es donde la raiz aun
# es una incognita. Mismo reparto que el `pre-commit` de kaupamex-docs.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(dirname "$(dirname "$AQUI")")"
# Se invoca por `bin/`, NO por la ruta al fuente. `bin/` esta versionado, asi
# que el nombre corto funciona en un clon recien bajado; y su envoltorio resuelve
# el interprete del proveedor y exporta PYTHONPATH, que es exactamente lo que una
# invocacion por ruta NO hace. Componer aqui el `PYTHONPATH=... python3 src/...`
# seria una segunda copia de esa resolucion, que puede divergir de la generada.
GATE="$RAIZ/bin/citation_resolution"

if [[ ! -x "$GATE" ]]; then
    cat >&2 <<MSG
commit-msg-citation REHUSADO — no se encontro el envoltorio del gate.
  buscado en: $GATE
No se emite veredicto: un 0 aqui lo leeria el hook llamador como permiso.
Declarar THYROX_ROOT, o clonar thyrox junto a los repos que lo consumen.
Si el arbol esta pero bin/ no: python3 src/session/generate_bin.py
MSG
    exit 2
fi

# El veredicto se captura con `|| CODIGO=$?` y no con `; case $?`: bajo un
# llamador con `set -e` la segunda forma ya habria abortado.
# El guard del interprete no se replica aqui — `bin/` ya rehusa con exit 2 si
# falta el entorno del proveedor, y su exit 2 cae solo en el cubo de rehuse.
CODIGO=0
bash "$GATE" "$MENSAJE" || CODIGO=$?

case "$CODIGO" in
    0|1) exit 0 ;;   # 0 = todas resuelven · 1 = deuda, ya avisada por stderr
    *)   exit 2 ;;   # el gate rehuso; su motivo ya salio por stderr
esac
