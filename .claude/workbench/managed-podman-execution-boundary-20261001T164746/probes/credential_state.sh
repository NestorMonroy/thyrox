#!/usr/bin/env bash
# Clasifica una credencial en uno de tres estados, sin leer ni imprimir su valor:
#   active             presente, sin deuda de rotación, autenticación aceptada
#   pending_rotation   presente, con deuda declarada, autenticación aceptada -> se usa
#   unavailable        ausente, revocada o autenticación rechazada -> no se usa
#   exposed            su valor llegó a un tercero -> no se entrega a trabajadores
# La deuda de rotación es metadato de auditoría: nunca, por sí sola, hace
# inutilizable una credencial.
# Uso: credential_state.sh <presente: yes|no> <rotación: pending|none|revoked|exposed> <auth: success|failed|untested>
set -euo pipefail
present="$1" rotation="$2" auth="$3"
if [[ "$present" != yes ]]; then echo "unavailable reason=missing"; exit 0; fi
if [[ "$rotation" == revoked ]]; then echo "unavailable reason=revoked"; exit 0; fi
# Expuesta: su valor ya salió hacia un tercero. Puede seguir autenticando, pero
# no se entrega a ningún trabajador nuevo; no es lo mismo que una rotación pendiente.
if [[ "$rotation" == exposed ]]; then echo "exposed usable_for_workers=no"; exit 0; fi
if [[ "$auth" == failed ]]; then echo "unavailable reason=auth_failed"; exit 0; fi
if [[ "$auth" == untested ]]; then echo "untested rotation=$rotation"; exit 0; fi
if [[ "$rotation" == pending ]]; then echo "pending_rotation usable=yes warning=rotation_pending"; else echo "active usable=yes"; fi
