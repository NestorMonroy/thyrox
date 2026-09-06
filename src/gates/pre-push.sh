#!/usr/bin/env bash
# pre-push — dos gates, en orden, sobre el repo consumidor que lo invoca.
#
# Uso:  bash pre-push.sh [<raiz-del-consumidor>]
#
# EL ORDEN NO ES ARBITRARIO. Una etiqueta duplicada corrompe **en silencio**:
# Sphinx emite `duplicate label` y el `:ref:` resuelve al hallazgo equivocado
# sin que nadie lo note. Un artefacto mínimo faltante, en cambio, es visible en
# cuanto alguien abre la iniciativa. Se reporta primero el defecto que nadie
# vería.
#
# POR QUÉ VIVE AQUÍ. Los dos gates se mudaron a `thyrox/src/gates/`, y el
# `.githooks/pre-push` del consumidor se quedó buscándolos en su propio árbol:
# el de IDs se saltaba EN SILENCIO (`if [ -f ... ]` falso) y el de artefactos
# imprimía «skip» y salía 0. Un push con los dos gates ausentes se veía igual
# que uno correcto — el sub-patrón D de `metrica-decide-la-conclusion.md`: el
# verde no distingue «el árbol está sano» de «el gate no estaba».
#
# Por eso: **un gate que no se puede correr REHÚSA**. No es lo mismo que un
# hook `Stop`, que hace surfacing y nunca rompe el flujo; esto autoriza una
# publicación, y una autorización que no midió nada es una mentira.
#
# Escape hatch: `git push --no-verify`. Está para emergencias, no para rutina —
# si se usa, el motivo va en el progreso de la iniciativa.
set -uo pipefail

CONSUMIDOR="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# Localizador de thyrox: la variable si está declarada; si no, la raíz propia
# de este guion, que vive en `<thyrox>/src/gates/`.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THYROX="${THYROX_ROOT:-$(dirname "$(dirname "$AQUI")")}"
GATES="$THYROX/src/gates"

IDS="$GATES/check-ids-duplicados.sh"
ARTEFACTOS="$GATES/check-artefactos-minimos.sh"

for g in "$IDS" "$ARTEFACTOS"; do
    [ -f "$g" ] && continue
    cat >&2 <<MSG
pre-push REHUSADO — no se encontró el gate:

  $g

No se emite un veredicto: un gate que no puede medir no autoriza el push. Su
silencio se leería como «el árbol está sano», y no es lo que se midió.

Declarar THYROX_ROOT, o clonar thyrox junto a los repos de kaupamex.
MSG
    # 2, no 1: «no emití veredicto» y no «encontré un defecto». Git aborta el
    # push con cualquier código distinto de 0, así que la protección es la
    # misma; lo que cambia es que el motivo se puede LEER. Con 1, un rehúse por
    # gate ausente era indistinguible de un bloqueo por árbol sucio — y ese
    # exit 1 llegaba por accidente (`command not found` = 127, que el `if !`
    # del gate 2 convertía en bloqueo), no por decisión.
    exit 2
done

cd "$CONSUMIDOR" || exit 1

# --- Gate 1: unicidad de etiqueta de hallazgo (H-DOCS-162) ------------------
#
# Se mide SÓLO la mitad A (`--solo-etiquetas`), y la asimetría es medida, no
# comodidad: A es una propiedad del árbol —dos etiquetas iguales son un defecto
# ahí mismo— mientras que B compara el árbol contra el tablero versionado, que
# es un volcado del store EFÍMERO del contenedor. B roja puede significar
# "nadie regeneró el tablero", y eso detendría el push de un cambio ajeno por
# un artefacto del entorno: el gate mediría el fenómeno equivocado.
#
# No es hipotético: medido sobre el árbol del merge `8f7ef0d7`, A daba 5 y B
# daba 86 — las 86 eran rezago del volcado, no contenido.
#
# `|| ESTADO=$?` y no dos sentencias: con `set -e` un fallo abortaría el guion
# ANTES de poder leer `$?`, y el push moriría sin decir por qué.
ESTADO_IDS=0
bash "$IDS" --strict --solo-etiquetas >/dev/null 2>&1 || ESTADO_IDS=$?
# 2 = universo vacío: el gate no midió nada, así que no afirma nada (H-API-336).
if [ "$ESTADO_IDS" -eq 1 ]; then
    bash "$IDS" --solo-etiquetas >&2
    cat >&2 <<'MSG'

pre-push BLOQUEADO — etiquetas de hallazgo DUPLICADAS (H-DOCS-162).

Son hallazgos distintos con el mismo ID. Sphinx emite `duplicate label` y el
`:ref:` resuelve al equivocado **en silencio** — la cita apunta a otro
hallazgo y nadie lo nota.

Casi siempre lo trae un merge: cada rama está limpia por separado y la
colisión nace al unir los árboles. Renumera **quien integra**, no quien está
construyendo la otra rama.

  1. Bloque libre por encima del máximo del árbol.
  2. Renumerar los NUESTROS: etiqueta, título, archivo (`git mv`) y `:ref:`.
  3. Verificar con el gate, sin `--strict`.

Emergencia: `git push --no-verify` (y anotar el motivo en el progreso).

MSG
    exit 1
fi

# --- Gate 2: artefactos mínimos por iniciativa (DEC-AM-01) ------------------
#
# Graduación de surfacing → bloqueante, autorizada por el ejecutor (2026-07-31)
# una vez que el conteo de incumplidoras llegó a 0. La regla
# `artefactos-minimos-iniciativa.md` fijaba esa condición explícitamente:
# bloquear con deuda heredada viva habría marcado rojo por trabajo ajeno.
if ! bash "$ARTEFACTOS" --strict; then
    cat >&2 <<'MSG'

pre-push BLOQUEADO — artefactos mínimos incompletos (DEC-AM-01).

Corregir la iniciativa señalada arriba y reintentar. Los tres casos
habituales:

  - falta `alcance-<slug>.rst`  → el estado exige alcance con "Premisa
    verificada"; si la iniciativa aún no dejó DISCOVER, el arreglo puede
    ser corregir `:estado:` a `en-analisis`, no fabricar el alcance.
  - falta `progreso-<slug>.rst` → `en-ejecucion` lo exige.
  - `:estado:` fuera del canon  → ver DEC-SM-01 en `metadata-standards.md`.

Emergencia: `git push --no-verify` (y anotar el motivo en el progreso).

MSG
    exit 1
fi
