#!/usr/bin/env bash
set -euo pipefail
F=/home/user/kaupamex-docs/source/gestion/pm/thyrox/iniciativas/resolve-all-thyrox-errors/hallazgos/hallazgo-H-THYROX-206-los-sustitutos-descansaban-en-premisas-ya-falsas.rst
test -e "$F" && { echo "YA EXISTE $F"; exit 1; }
TS=$(date -u +"%Y-%m-%dT%H:%M:%S")
cat > "$F" <<RST
.. meta::
   :fecha_creacion: $TS
   :autor: Equipo Kaupamex
   :estado: resuelto
   :submodulo: thyrox
   :iniciativa: resolve-all-thyrox-errors

.. _h-thyrox-206:

H-THYROX-206 — Los sustitutos de ``app-host`` y ``headless-sdk`` descansaban en premisas ya falsas
===================================================================================================

- **Severidad:** BAJA
- **Fecha:** $TS
- **Archivo:** ``thyrox: tests/verify/test_stand_ins_cleared.py``
- **Premisa verificada:** ``headless-sdk/package.json`` decía que el paquete
  «no es miembro del bun workspace»; el ``package.json`` raíz declara
  ``src/packages/*`` y ``Bun.resolveSync`` resolvió
  ``@thyrox/config/lazySchema`` y ``@thyrox/local-observability`` desde el
  paquete. En ``app-host``, el sustituto esperaba que ``@thyrox/config``
  exportara ``saveCurrentProjectConfig``: ya lo exportaba y
  ``context/stats.tsx`` lo importaba de ahí. [PROVEN]
- **Estado:** RESUELTO en ``thyrox@b0778eea`` y ``thyrox@f52c4d8e``.

Qué estaba mal
--------------

Cada sustituto declara su condición de retiro y nadie la re-medía. En
``app-host`` el archivo ya no tenía importadores: código muerto cuyo encabezado
seguía afirmando que el módulo original faltaba. En ``headless-sdk`` la copia
de ``lazySchema`` y el ``logEvent`` no-op sobrevivían a una premisa que el
workspace ya había vuelto falsa.

Los dos paquetes entran al ratchet ``test_stand_ins_cleared``, que mide la
condición por paquete; los importables sin ciclo del árbol bajaron de 120 a
114 en este pase.

*Métrica:* símbolos importables sin ciclo por paquete (``check_stand_ins``).
*Ciega a:* los sustitutos con ciclo, que siguen siendo necesarios.
RST
echo "escrito $F"
