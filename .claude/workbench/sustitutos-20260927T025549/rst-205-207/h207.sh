#!/usr/bin/env bash
set -euo pipefail
F=/home/user/kaupamex-docs/source/gestion/pm/thyrox/iniciativas/resolve-all-thyrox-errors/hallazgos/hallazgo-H-THYROX-207-en-bun-test-un-doble-se-fuga-a-los-archivos-posteriores.rst
test -e "$F" && { echo "YA EXISTE $F"; exit 1; }
TS=$(date -u +"%Y-%m-%dT%H:%M:%S")
cat > "$F" <<RST
.. meta::
   :fecha_creacion: $TS
   :autor: Equipo Kaupamex
   :estado: resuelto
   :submodulo: thyrox
   :iniciativa: resolve-all-thyrox-errors

.. _h-thyrox-207:

H-THYROX-207 — En ``bun test`` un doble de prueba se fuga a los archivos posteriores
=====================================================================================

- **Severidad:** MEDIA
- **Fecha:** $TS
- **Archivo:** ``thyrox: src/packages/headless-sdk/src/__tests__/sdkMemorySummary.test.ts``
- **Premisa verificada:** con bun 1.3.11, un archivo sin mock propio vio el
  módulo reemplazado por ``mock.module`` en otro archivo, y otro vio el
  ``logger`` capturador que ``sdkMemorySummary.test.ts`` instaló con
  ``installLocalObservability``; con ``afterAll`` restaurando el previo, vio
  el no-op. [PROVEN]
- **Estado:** RESUELTO en ``thyrox@6a81caaa``; evidencia en
  ``thyrox: .claude/workbench/mock-module-leak-20260927T061112/``.

Qué estaba mal
--------------

Lo destapó una pregunta del ejecutor: *«¿sin mockear un import de paquete?
¿pero eso no es lo que hace la carpeta de tests?»*. Medir la diferencia mostró
que las dos formas cambian estado del proceso: ``bun test`` corre todos los
archivos en uno, así que un doble instalado sin restaurar lo hereda el
archivo que corra después. La diferencia entre las dos es el alcance —el
módulo entero frente a su ``logger``— y que la segunda usa la API de
inyección que el paquete ofrece.

Y un segundo hecho, que casi invierte la conclusión: **bun no ejecuta los
archivos en el orden de los argumentos**. Una primera corrida pareció mostrar
que no había fuga porque la sonda corrió antes; un control dentro del mismo
archivo probó que la sonda detecta el capturador.

*Métrica:* lo que un archivo posterior lee del módulo en la misma ejecución
de ``bun test``.
*Ciega a:* ejecuciones con archivos en procesos separados, y a otra versión
de bun.
RST
echo "escrito $F"
