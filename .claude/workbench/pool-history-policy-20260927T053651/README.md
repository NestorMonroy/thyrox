# ¿Qué política de historial fija la cota del pool?

Sonda: `probe_policies.py`, salida en `result.txt`.

*Métrica:* pico de RAM (GNU Time, KB) por ítem de las ejecuciones de
headless-pool del lazo tsc; para cada ejecución, la cota que cada política
habría predicho con lo anterior, contra el pico real.
*Ciega a:* `thyrox -p` (los ítems son `claude -p`), a la VRAM (este contenedor
no tiene GPU) y a plantillas distintas de la del lazo tsc.

Lectura: sólo 5 de 37 ejecuciones tienen `.time` (GNU Time graba desde
2026-09-26). Con 4 predicciones, las cinco políticas fallan la misma (el salto
de 271 a 331 MB) y no se distinguen: los datos no deciden todavía. Lo que sí
miden: dentro de una ejecución, pico / mediana de sus ítems es 1.14–1.22, y el
salto entre ejecuciones fue 1.22x — ambos por debajo del margen ×2 por defecto,
que es lo que de verdad cubre hoy.
