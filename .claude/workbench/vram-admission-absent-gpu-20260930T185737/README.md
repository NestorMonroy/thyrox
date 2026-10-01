# vram-admission-absent-gpu

## El encargo

«NVIDIA puede utilizarse si se tiene, si no se usa lo que se tiene»; «tienes que corregir los scripts».

## La premisa, si se corrigio al primer comando

Sin `nvidia-smi`, `gpu_monitor admit` espera el plazo entero y sale 3, «sin sitio». Ver `source.md`.

## Las piezas

| archivo | que hace |
|---|---|
| `source.md` | la fuente de verdad del ítem |
| `launch.sh` | el pool |

## Los resultados

Se escriben al integrar.

*Metrica:* código de salida y tiempo hasta rehusar.
*Ciega a:* una GPU real.
