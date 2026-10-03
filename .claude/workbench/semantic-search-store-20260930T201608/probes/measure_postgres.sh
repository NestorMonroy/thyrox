#!/usr/bin/env bash
# Mide lo que decide el contrato de SemanticSearchStore en este entorno:
# el clúster local, la versión de pgvector y si el rol de pruebas puede crear
# la extensión o necesita al administrador. La URL sale del .env; su
# contraseña nunca se imprime.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
url=$(grep '^THYROX_TEST_POSTGRES_URL=' .env | cut -d= -f2-)
[ -n "$url" ] || { echo "sin THYROX_TEST_POSTGRES_URL en .env: no se mide"; exit 2; }
echo "== clúster"; pg_lsclusters
echo "== pgvector disponible"; grep default_version /usr/share/postgresql/16/extension/vector.control
echo "== ¿confiable? (f = sólo superusuario la crea)"
psql "$url" -X -tAc "select trusted from pg_available_extension_versions where name='vector' and version='0.8.6'"
echo "== versión instalada en la base de pruebas"
psql "$url" -X -tAc "select extversion from pg_extension where extname='vector'"
echo "== binary_quantize responde"
psql "$url" -X -tAc "select (binary_quantize('[1,-1,2]'::vector))::text"
