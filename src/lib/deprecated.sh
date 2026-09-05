#!/usr/bin/env bash
# Guard de script deprecado — se declara en la cabecera y se aplica al correr.
#
# Un artefacto con un defecto medido NO se barre ni se reescribe en el sitio:
# se queda como evidencia, se marca desactivado con su motivo, y la versión
# nueva vive al lado. Ese es el criterio; este archivo es su mitad ejecutable.
#
# La convención en `.rst` ya existía —`:estado: Historico` más un aviso con
# fecha, motivo y sucesor— y para un script no había nada. Un script sin
# marcador corre en silencio: nada distingue «ejecuté la versión vigente» de
# «ejecuté la reserva degradada», y esa indistinción es un verde que no
# discrimina (sub-patrón D de `metrica-decide-la-conclusion.md`).
#
# Uso, en el script que se deprecia:
#
#     #!/usr/bin/env bash
#     # DEPRECATED: <fecha ISO> — <motivo, medido>
#     # SUCESOR: <qué usar en su lugar>
#     # HALLAZGO: <ID del hallazgo que lo mide>
#     set -uo pipefail
#     source "$(dirname "${BASH_SOURCE[0]}")/deprecated.sh"
#     deprecated_guard <nombre-del-script>
#
# Y en el ÚNICO sitio donde la ejecución sigue siendo legítima:
#
#     ACCEPT_DEPRECATED=<nombre-del-script> bash <ruta>
#
# La declaración nombra un script concreto: no es un permiso global. Quien la
# escribe deja constancia de que conoce el defecto y aun así lo invoca.

# deprecated_guard <nombre> — avisa siempre; rehúsa salvo declaración explícita.
#
# El aviso va a stderr sin excepción, incluso en el camino aceptado: un guard
# que calla cuando se le declara devuelve el problema que existe para cerrar.
# Y stderr, no stdout, porque el script deprecado suele generar un artefacto
# por stdout y el aviso lo corrompería.
deprecated_guard() {
    local origen="${BASH_SOURCE[1]:-}"
    local nombre="${1:-$(basename "${origen:-desconocido}")}"
    local termino fecha sucesor hallazgo

    # El TÉRMINO se lee, no se asume. `deprecated` es lo que aún funciona y no
    # se recomienda; `obsolete` es lo que ya no sirve a ningún propósito.
    # Anunciar siempre «DEPRECATED» colapsaría los dos en el punto de uso, que
    # es justo donde la distinción importa.
    termino=$(sed -nE 's/^# (DEPRECATED|OBSOLETE):.*/\1/p' "$origen" 2>/dev/null | head -1)
    termino=${termino:-DEPRECATED}
    fecha=$(sed -nE 's/^# (DEPRECATED|OBSOLETE): *//p' "$origen" 2>/dev/null | head -1)
    sucesor=$(sed -n 's/^# SUCESOR: *//p' "$origen" 2>/dev/null | head -1)
    hallazgo=$(sed -n 's/^# HALLAZGO: *//p' "$origen" 2>/dev/null | head -1)

    {
        printf '%s — %s\n' "$termino" "$nombre"
        [[ -n "$fecha" ]]    && printf '  desde:    %s\n' "$fecha"
        [[ -n "$sucesor" ]]  && printf '  usar:     %s\n' "$sucesor"
        [[ -n "$hallazgo" ]] && printf '  hallazgo: %s\n' "$hallazgo"
    } >&2

    if [[ "${ACCEPT_DEPRECATED:-}" == "$nombre" ]]; then
        printf '  se ejecuta: el llamador declaró ACCEPT_DEPRECATED=%s\n' "$nombre" >&2
        return 0
    fi

    printf '  NO se ejecuta. Para invocarlo a sabiendas: ACCEPT_DEPRECATED=%s <comando>\n' \
        "$nombre" >&2
    exit 3
}
