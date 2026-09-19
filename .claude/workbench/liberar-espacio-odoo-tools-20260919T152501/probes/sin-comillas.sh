#!/bin/bash
set -e
mkdir -p sin-comillas && cd sin-comillas
cat > nota.txt <<FIN
El cono se estrecha con `touch EJECUTADO` y se revierte.
FIN
