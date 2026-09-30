#!/usr/bin/env bash
set -euo pipefail
F=/home/user/kaupamex-docs/source/gestion/pm/thyrox/iniciativas/resolve-all-thyrox-errors/hallazgos/hallazgo-H-THYROX-205-un-sustituto-importable-puede-ser-un-homonimo.rst
test -e "$F" && { echo "YA EXISTE $F"; exit 1; }
TS=$(date -u +"%Y-%m-%dT%H:%M:%S")
cat > "$F" <<RST
.. meta::
   :fecha_creacion: $TS
   :autor: Equipo Kaupamex
   :estado: resuelto
   :submodulo: thyrox
   :iniciativa: resolve-all-thyrox-errors

.. _h-thyrox-205:

H-THYROX-205 — Un sustituto importable puede ser un homónimo, no una copia
===========================================================================

- **Severidad:** BAJA
- **Fecha:** $TS
- **Archivo:** ``thyrox: src/verify/check_stand_ins.py``, ``src/packages/server/src/internal/pendingCrossPackageDeps.ts``
- **Premisa verificada:** ``check_stand_ins`` señaló ``CompactMetadata`` de
  ``server`` como importable desde ``@thyrox/agent/loop/transcript``; el tipo
  de allá (``transcript.ts:36``) tiene ``trigger`` cerrado, ``postTokens`` y
  ``cumulativeDroppedTokens`` obligatorios, y el de ``server`` es la forma del
  mapper del SDK (``preservedSegment``, campos opcionales). [PROVEN]
- **Estado:** RESUELTO en ``thyrox@38fe5d22``.

Qué estaba mal
--------------

El gate compara **nombres**: mide el significante y concluye sobre el
significado. Su docstring ya declaraba esa ceguera, pero no había forma de
resolverla: forzar el import cambiaba el tipo, y dejar el ratchet en rojo
bloqueaba el paquete sin defecto.

Un sustituto declara ahora el homónimo junto al símbolo, con su razón
(``// homonym <Símbolo>: <razón>``). El gate lo saca de los importables y lo
publica aparte; una declaración **sin** razón no cuenta, porque callaría al
gate sin un juicio escrito.

Control de anulación: sin descontar los homónimos cae exactamente su caso;
sin exigir la razón caen los tres que dependen de ella.

*Métrica:* símbolos del sustituto con el mismo nombre en la frontera pública
de otro paquete, menos los homónimos declarados con razón.
*Ciega a:* un homónimo no declarado, que sigue contando como importable.
RST
echo "escrito $F"
