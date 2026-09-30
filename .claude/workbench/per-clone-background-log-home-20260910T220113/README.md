# Hogar por clon de los logs de segundo plano

Fecha: 2026-09-10T22:12:38

`BG_DIR` era la unica ruta de hogar del arbol sin prefijo `THYROX_`, asi que
`verify/check_env_contract_keys.py` —que declara `PREFIX = "THYROX_"`— no la
veia: ni la contaba ni exigia declararla. Y `background.log_dir` ya tenia la
constante correcta (`THYROX_BACKGROUND_LOG_DIR`) sin familia por clon.

El heredoc de este README se escribio SIN comillas la primera vez, y las
comillas invertidas de arriba se ejecutaron como sustitucion de comando. Es la
misma trampa que partio `bg.sh` al añadirle la operacion `log-home`: un
programa que viaja dentro de una cadena de shell entre comillas dobles. Se
registra porque ocurrio dos veces en el mismo pase.

## Lo que midio cada control

| Archivo | Que dice |
|---|---|
| `outputs/red-half.txt` | la mitad ROJA: 1 fallo + 6 errores antes de implementar |
| `outputs/anulacion.txt` | retirada la rama por clon de `log_dir`: caen 4 de 7 — los 2 de nombre y el de rehuse sobreviven, porque no dependen de la familia |
| `outputs/anulacion-bg-dir.txt` | retirado `_resolve_flat_home`: caen 2 de 20 en `test-bg-familia.sh`, y son exactamente las del caso 4-ter |

El caso 4 (retrocompatibilidad de `BG_DIR` absoluto) sobrevive a las dos
anulaciones: una ruta absoluta vuelve igual de la resolucion. Esa asimetria es
la medicion, no un descuido.
