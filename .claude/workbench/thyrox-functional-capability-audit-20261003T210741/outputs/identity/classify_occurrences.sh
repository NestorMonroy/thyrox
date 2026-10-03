#!/usr/bin/env bash
# Clasifica cada aparición versionada de «thyrox» (sin _references ni _archived)
# por categoría semántica, con la primera regla que casa. Cuenta apariciones,
# no superficies: una superficie (THYROX_INFRA_POSTGRES_DB) se cuenta en cada
# sitio donde aparece. La tabla curada de superficies es el TSV aparte.
# Métrica: apariciones por categoría. Ciega a: el significado de un literal que
# ninguna regla distingue (cae en PRODUCT_NAME) y a lo no versionado.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
git grep -n -o -i -E "[@./a-z0-9_-]{0,24}thyrox[a-z0-9_.:/-]{0,40}" -- . ':(exclude)_references' ':(exclude)_archived' \
| gawk -F: '
{ file=$1; m=substr($0, length($1)+length($2)+3); lm=tolower(m); c="" }
file ~ /^\.claude\/(workbench|jobs|build-logs|cache|settings-backups)\// || file ~ /^agent-results\// { c = (m ~ /(H|TASK)-THYROX-[0-9]/) ? "STABLE_DOMAIN_ID" : "HISTORICAL_REFERENCE" }
c=="" && m ~ /(H|TASK)-THYROX-[0-9]/ { c="STABLE_DOMAIN_ID" }
c=="" && lm ~ /thyrox-rename/ { c="COMPATIBILITY_ALIAS" }
c=="" && (file ~ /(^|\/)(tests|__tests__|testing|fixtures)\// ) { c="TEST_FIXTURE" }
c=="" && m ~ /@thyrox\// { c="PACKAGE_NAMESPACE" }
c=="" && m ~ /THYROX_[A-Z0-9]/ { c="ENV_NAMESPACE" }
c=="" && lm ~ /(io\.thyrox\.|thyrox\.(owner|model|resource|execution|task|worker|status|slice|secret))/ { c="OCI_LOGICAL_IDENTITY" }
c=="" && lm ~ /(localhost|docker\.io|ghcr\.io)\/[a-z0-9_.\/-]*thyrox/ { c="OCI_DISTRIBUTION_NAME" }
c=="" && lm ~ /thyrox-(postgres|redis|ollama|worker|model|task|infra|coordinator)/ { c="RUNTIME_RESOURCE_NAME" }
c=="" && lm ~ /\.thyrox(\/|$)/ { c="FILESYSTEM_NAMESPACE" }
c=="" && lm ~ /\.sock/ { c="SOCKET_PATH" }
c=="" && (lm ~ /\/thyrox:|thyrox -p|bin\/thyrox|thyrox-bg/) { c="USER_FACING_COMMAND" }
c=="" && file ~ /\.(md|rst|txt)$/ { c="DOCUMENTATION" }
c=="" && lm ~ /kaupamex/ { c="ECOSYSTEM_NAME" }
c=="" { c="PRODUCT_NAME" }
{ n[c]++ }
END { for (k in n) printf "%d\t%s\n", n[k], k }' | sort -rn
