# suite-baseline

## Qué se lanzó

```
bash tests/run.sh
```

Lanzado con `bg.sh` y registrado en el ledger, para no bloquear el primer plano
durante los 29 minutos que dura.

## Qué se preguntaba

Cuál es el estado de partida de las tres mitades de la suite —Python, TypeScript
y shell— al arrancar el pase, **antes de tocar nada**. El flujo de sesión de
`CLAUDE.md` lo exige: el estado de partida se mide, no se asume.

## Qué se recogió

Exit code 1 en 1738 s. **12 suites `-- ROJO` sobre 189 recorridas**: 10 de Python
(los 9 de la familia `TASK-THYROX-0214` más `test_generate_bin.py`) y 2 de shell
(`test-script-naming.sh`, `test_package_root_resolution.sh`).

*Métrica:* código de salida del corredor y las líneas `-- ROJO` de su log,
contra el total de líneas `-- ` (una por suite recorrida).
*Ciega a:* un rojo intermitente — una sola corrida; y a qué rojo es regresión y
cuál es deuda heredada, que lo separa el control de anulación del subconjunto
derivado, no una corrida entera.

## La ventana — CORREGIDO 2026-09-19 (TASK-THYROX-0218)

Yo mismo había puesto un caveat sobre este baseline —«los commits de 04:36 y
04:51 aterrizaron dentro de su ventana»— y estaba mal. Corregirlo es lo que lo
vuelve **autoritativo** para la mitad Python:

| Hecho | Medido |
|---|---|
| el log deja de escribirse | **04:42:18** (`mtime` de `outputs/salida.log`) |
| único commit dentro de la ventana | `3ceff589` (04:36) — el porte de `dynamicCert`, que toca **0** archivos `.py` |
| `c3346cdb`, la reparación de la familia `TASK-THYROX-0214` | **04:51:29** — nueve minutos *después* del último byte del log |

Así que este baseline es una instantánea **limpia pre-reparación** para las 189
suites que recorrió: sus 12 rojos son atribuibles al árbol, no a un árbol en
movimiento.

**Y la línea `destination` original de su manifiesto es falsa.** Decía que «los
rojos atribuibles se cerraron bajo `TASK-THYROX-0216` y `TASK-THYROX-0217`». Los
9 rojos de Python distintos de `test_generate_bin.py` son la familia
`TASK-THYROX-0214`, que cerró `c3346cdb`. Ver la fila `correction` del manifiesto.
