#!/bin/bash
set -e
mkdir -p con-comillas && cd con-comillas
cat > nota.txt <<'FIN'
El cono se estrecha con `touch EJECUTADO` y se revierte.
FIN
