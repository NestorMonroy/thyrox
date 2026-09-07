# Evidencia ROJA — los dos fallos que la suite en serie destapó

Medido: 2026-09-07T05:06:08

## 1. treeRoot — el test NO es hermético respecto del `.env` del repo

```text
153 |     expect(treeRoot()).toBe('/arbol/dos')
                             ^
error: expect(received).toBe(expected)

Expected: "/arbol/dos"
Received: "/home/user"

      at <anonymous> (/home/user/thyrox/tests/paths/reach.test.ts:153:24)
(fail) el tramo del árbol de clones — completa el porte parcial > treeRoot: gana la primera grafía declarada [0.45ms]

 24 pass
 1 fail
 30 expect() calls
Ran 25 tests across 1 file. [116.00ms]
```

Causa: `.env` de la raíz —generado por `src/session/write-env.sh` a las 01:24:04 de hoy—
declara `THYROX_REACH_ROOT=/home/user`. El test borra esa variable del proceso y espera
que gane la segunda grafía; `envValue` cae al `.env` y devuelve la PRIMERA otra vez.

```text
# Generado por src/session/write-env.sh — 2026-09-07T01:24:04
# El contrato y el significado de cada clave: .env.example
THYROX_ROOT=/home/user/thyrox
THYROX_REACH_ROOT=/home/user
THYROX_LOCATOR=src/paths/reach.py
THYROX_LIB_REACH=src/lib/reach.sh
```

El mecanismo es correcto: el proceso gana al archivo, y el archivo es fuente legítima.
Lo que está mal es la premisa del control: supone que sólo lo que él declara está declarado.

Por qué sólo cae ESE test de los cuatro de `treeRoot`: los otros tres pasan un `start`
bajo un directorio temporal, así que `envFilePath` asciende desde ahí y nunca alcanza el
`.env` del repo. El que cae es el único que invoca `treeRoot()` sin `start`.
