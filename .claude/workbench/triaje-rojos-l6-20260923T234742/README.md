# Triaje de los 22 rojos de Python y shell de feature/thyrox-l6

`rojos.txt` sale de `-- ROJO` en la suite completa de `l6`. Cada suite se
volvió a correr sola con `run-task-pool --memfree` lanzado por `thyrox-bg`:

| Archivo | Qué es |
|---|---|
| `triaje.txt` | con el entorno del corredor (`THYROX_ROOT` exportado): los 22 siguen en rojo, con su último error |
| `pasan-sin-raiz.txt` | las mismas 22 SIN `THYROX_ROOT` heredado: pasan exactamente 2 |
| `verde-raiz-heredada.txt` | esas 2, corregidas, con `THYROX_ROOT` exportado: `test-reach-sh.sh` 8/8, `test_generate_bin.py` 118/0 (antes 109/9) |

Las dos eran la misma clase que `test_install.sh`: la suite prueba cómo se
deriva la raíz, y `tests/run.sh` y `bin/` exportan `THYROX_ROOT`, que heredada
gana. Las otras 20 fallan por causas distintas y quedan para los siguientes
bloques.
