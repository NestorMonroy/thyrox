# Que archivos de ccnmt NO tenemos — censo por ruta, todas las extensiones

Directiva del ejecutor 2026-09-19: *«identifica que archivos no tenemos, igual
para los test, y copialos a thyrox»*. El censo responde la primera mitad, y su
respuesta cambia la segunda.

## El instrumento se verifico POR CONDUCTA antes de correrlo

`operaciones-de-archivo-con-bash.md` prescribe un `grep` de literales para la
pregunta «¿este guion escribe?». Ese grep mide el significante. Aqui se midio
el significado, con `bin/assert_no_writes`, que corre el comando bajo `strace`
y lee lo que el nucleo vio:

    assert_no_writes: OK — 0 escrituras
      (alcance medido: 1967 linea(s) de traza, 4 proceso(s); subject_exit=0)

## El resultado: `packages/` y `tests/` NO tienen nada ausente

| Raiz de ccnmt | referencia | nuestro | AUSENTES |
|---|---|---|---|
| `packages/` (solo `.ts`/`.tsx`) | 3293 | 3980 | **0** |
| `packages/` (**toda** extension) | 3424 | 4191 | **0** |
| `tests/` | 117 | 448 | **0** |
| `scripts/` | 127 | 1 | **127** |
| `assets/` | 3 | 0 | **3** |
| `docs/` | 161 | 0 | **161** |
| `bun-demincer/` | 37 | 0 | **37** |

El primer censo se corrio solo sobre `.ts`/`.tsx` y dio 0. Eso no bastaba para
concluir: «archivos» no es «modulos de TypeScript», y un 0 sobre la extension
equivocada es el sub-patron A. Se re-midio sobre **toda** extension —3424
archivos, sin filtro— y sigue dando 0. Ese segundo censo es el que sostiene la
conclusion.

## Consecuencia: la premisa de TASK-THYROX-0168 esta superada

Esa tarea dice *«Copiar los 1061 ausentes de los 12 paquetes»*. Medido hoy, los
ausentes de `packages/` son **0**. La cifra era correcta cuando se escribio y
las olas de porte posteriores la cerraron. No queda nada que copiar ahi.

Lo que queda ausente esta **fuera** de `packages/` y `tests/`, y es
exactamente el sujeto de TASK-THYROX-0174 (*«Decidir el desenlace de scripts/,
tests/ y bun-demincer de ccnmt, fuera del alcance packages/»*). Su
`tests/` ya esta resuelto —0 ausentes—; los otros tres siguen siendo una
decision, no una copia mecanica:

- **`docs/` (161)** es prosa sobre ccnmt, que es **otro producto**. `.claude/
  CLAUDE.md` fija que el material de referencia vive en `_references/`, no
  dentro del arbol; copiarlo a thyrox importaria la documentacion de un
  producto ajeno como si fuera propia.
- **`scripts/` (127)** es el `doctor:arch` de ~80 reglas, que es el analogo de
  nuestro `src/verify/`. Es el candidato con valor claro, y por eso mismo
  exige triaje regla a regla: varias miden premisas de ccnmt que aqui no
  aplican.
- **`bun-demincer/` (37)** es el descompilador. Herramienta de construccion,
  no producto.

*Metrica:* `comm -23` entre dos `find -type f` ordenados, por ruta relativa a
la raiz comparada, excluyendo `node_modules`.
*Ciega a:* un archivo presente con el mismo nombre y **contenido divergente**
—el censo mide presencia, no igualdad— y a un archivo que en este arbol vive
bajo otra ruta que la de la referencia.

## CORRECCION — el commit `10d833ca` cita dos ids FABRICADOS

Ese commit, ya publicado, escribe `TASK-THYROX-0477` y `TASK-THYROX-0483`.
**Ninguno de los dos existe en el store.** Salieron de rellenar a cuatro
digitos los ordinales de board `#477` y `#483`, que es exactamente la forma
que `.claude/CLAUDE.md` prohibe: el `NNNN` de la cita durable es la secuencia
del **store**, no el ordinal del board, asi que rellenarlo fabrica una cita
que **parece** durable y no resuelve.

Lo detecto el gate `detect_ephemeral_citation` en el propio `git commit`. Aviso
—no bloquea, por la razon que sus hermanos declaran— asi que el commit aterrizo
con la cita rota.

Las citas reales, resueltas por **sujeto** y no por numero:

| Ordinal de board | Cita FABRICADA (en `10d833ca`) | Cita REAL |
|---|---|---|
| `#477` | ~~TASK-THYROX-0477~~ | **TASK-THYROX-0168** |
| `#483` | ~~TASK-THYROX-0483~~ | **TASK-THYROX-0174** |

**No se enmienda `10d833ca`**: esta publicado, y `git.md` prohibe reescribir
historia publicada. La correccion va hacia adelante — este archivo, que es el
`--source-ref` del hallazgo H-THYROX-106, lleva las citas correctas, y esta
seccion deja el rastro de cual fue el defecto para que el commit roto siga
siendo legible.
