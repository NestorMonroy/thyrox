#!/usr/bin/env bash
# Prueba de H-DOCS-298 — el enlace de directorio esta SIN DECIDIR, no descartado.
#
# Que codifica
# ------------
# H-DOCS-294 midio que el veredicto que descarto el enlace habia medido el
# enlace de ARCHIVO, no el de DIRECTORIO, y declara explicitamente que «no dice
# que el enlace de directorio sirva». El guard del cliente queda por medir en la
# tarea #733.
#
# Esta suite hace que reafirmarlo como «descartado por medicion» FALLE, en vez
# de pasar inadvertido en un resumen. Es un gate de AFIRMACION DE ESTADO, no de
# codigo: no mide si el enlace sirve — mide que nadie diga que ya se sabe.
#
# Cuando esta suite deba cambiar
# -------------------------------
# Cuando #733 mida el guard. Ese dia el estado deja de ser «sin decidir» y las
# aserciones 2 y 3 dejan de describir el arbol: se actualizan CON la medicion
# citada, nunca antes. Un rojo aqui no es un defecto del arbol; es la senal de
# que alguien movio el estado sin mover la evidencia.
#
# Como discrimina (sub-patron D de metrica-decide-la-conclusion)
# ---------------------------------------------------------------
# Un gate que solo mira el arbol limpio pasaria igual estando roto el patron.
# Por eso lleva DOS controles:
#
#   POSITIVO (caso 5) — una linea con la sobre-afirmacion, escrita en un archivo
#     temporal. El patron TIENE que verla. Se declara fabricada: el arbol no
#     tiene ninguna, medido en el mismo pase que escribio H-DOCS-298.
#   NEGATIVO (caso 6) — una linea REAL del repositorio que habla del enlace
#     simbolico de archivo y de que el guard lo descarto. Es correcta y el
#     patron NO debe verla. Sin este control, un patron demasiado ancho daria
#     verde en el caso 4 por casualidad y marcaria prosa legitima manana.
set -uo pipefail

DOCS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$DOCS_ROOT"
H294="source/gestion/pm/docs/iniciativas/implementar-base-datos-agentes/hallazgos/hallazgo-H-DOCS-294-el-veredicto-descarto-el-archivo-no-el-directorio.rst"
OK=0; FALLOS=0

# La sobre-afirmacion: «enlace de directorio» y «descartad*» en la MISMA linea.
# Anclar en «directorio» es lo que separa el defecto de la prosa legitima sobre
# el enlace de archivo, que es el control negativo.
PATRON='enlace de directorio[^.]*descartad|descartad[^.]*enlace de directorio'

# H-DOCS-298 CITA la sobre-afirmacion para poder corregirla, asi que su propio
# archivo se excluye. Se nombra aqui y no en un baseline opaco: la exclusion es
# una decision, no una lista que crece sola.
EXCLUIR='hallazgo-H-DOCS-298-'

comprobar() {  # comprobar <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then
        OK=$((OK + 1))
    else
        FALLOS=$((FALLOS + 1))
        printf 'FALLO: %s\n  esperado: %s\n  obtenido: %s\n' "$1" "$2" "$3" >&2
    fi
}

comprobar "1. H-DOCS-294 existe" "si" \
    "$(test -f "$H294" && echo si || echo no)"

comprobar "2. su estado sigue siendo documentado, no resuelto" "si" \
    "$(grep -qE '^ *:estado: *documentado' "$H294" && echo si || echo no)"

comprobar "3. conserva la clausula que niega el descarte" "si" \
    "$(grep -q 'No dice que el enlace de directorio sirva' "$H294" && echo si || echo no)"

comprobar "4. nombra a #733 como sucesor del guard" "si" \
    "$(grep -q '#733' "$H294" && echo si || echo no)"

comprobar "5. ningun artefacto del arbol reafirma el descarte" "0" \
    "$(grep -rlIE "$PATRON" source/ 2>/dev/null | grep -v "$EXCLUIR" | wc -l | tr -d ' ')"

# --- control POSITIVO: el patron tiene que ver una sobre-afirmacion ---
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
printf 'el enlace de directorio quedo descartado por medicion en h-docs-294\n' \
    > "$TMP/fabricado.rst"
comprobar "6. CONTROL POSITIVO — el patron ve la sobre-afirmacion" "1" \
    "$(grep -lIE "$PATRON" "$TMP/fabricado.rst" 2>/dev/null | wc -l | tr -d ' ')"

# --- control NEGATIVO: prosa REAL del repo que NO debe marcarse ---
# La linea real vive en progreso-implementar-base-datos-agentes.rst:1206
printf 'Es la propiedad que hacia atractivo el enlace simbolico, y la que el guard del cliente descarto.\n' \
    > "$TMP/legitima.rst"
comprobar "7. CONTROL NEGATIVO — no marca el enlace de archivo" "0" \
    "$(grep -lIE "$PATRON" "$TMP/legitima.rst" 2>/dev/null | wc -l | tr -d ' ')"

comprobar "8. esa prosa legitima sigue viva en el repo (el control no es ficticio)" "si" \
    "$(grep -rqI 'atractivo el enlace' source/ && echo si || echo no)"

printf 'test-enlace-directorio-sin-decidir: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[ "$FALLOS" -eq 0 ]
