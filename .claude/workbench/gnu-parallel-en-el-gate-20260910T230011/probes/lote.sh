#!/usr/bin/env bash
# Cuerpo de un trabajo por lote. Recibe N rutas y emite las que declaran
# apertura. El programa awk es byte a byte el de `universo()`: lo que cambia
# es el DESPACHO, no el criterio.
ABIERTO="$P_ABIERTO"; INLINE="$P_INLINE"; SECCION="$P_SECCION"
for f in "$@"; do
    [[ -f "$f" ]] || continue
    awk -v abierto="$ABIERTO" -v inline="$INLINE" -v seccion="$SECCION" '
        { linea[NR] = $0 }
        END {
            for (i = 1; i <= NR; i++) {
                if (linea[i] !~ abierto) continue
                if (linea[i] ~ inline) continue
                cerrada = 0
                for (j = i + 1; j <= i + 4 && j <= NR; j++)
                    if (linea[j] ~ seccion) { cerrada = 1; break }
                if (!cerrada) { print "ABIERTO"; exit }
            }
        }' "$f" | grep -q ABIERTO && echo "$f"
done
exit 0
