# claude-code 2.1.259 — corpus extraído

**Extraída el 2026-09-03T18:43:48** con `@kaupamex/binary`, la build siguiente a
`2.1.258`. Trae `bunfs-root/` con **1819 archivos** y su `MANIFEST.tsv`, más el
`claude_strings.txt` volcado con `strings`.

Se extrajo porque el ejecutable del contenedor se actualizó a media sesión
—`2.1.258` → `2.1.259`— mientras se analizaba el subsistema de tareas
(:ref:`h-docs-455` documenta la clase). Todo análisis del subsistema de TASK que
esta sesión escriba cita **este** corpus.

## La extracción

| Eje | Valor |
|---|---|
| Instante | `2026-09-03T18:43:48` |
| Archivos | 1819 |
| Bytes de contenido | 38 889 863 |
| Entradas de la tabla | 1819 de 1819 |
| Paso de la tabla | 52 B |
| sha256 del `MANIFEST.tsv` | `abb64c19b3472223…` |

Reproducible sin confiar en este texto:

```bash
bun run .claude/packages/binary/bin/binary.ts info        # versión, tabla, tipos
bun run .claude/packages/binary/bin/binary.ts freshness    # exit 0 si el corpus está al día
```

El `MANIFEST.tsv` lleva el SHA-256 de cada archivo: repetir la extracción sobre
el mismo ejecutable y comparar la columna es toda la verificación que hace falta.

**Partición: no hace falta aquí.** Ningún archivo del corpus se acerca al tope
duro de 100 MiB por archivo ni al aviso de 50 MiB; el mayor es un chunk `.js` de
pocos MiB. El `claude_strings.txt` (44 MiB) tampoco lo cruza.

## El volcado de cadenas

| Eje | Valor |
|---|---|
| Instante de la medición | `2026-09-03T18:36` (mtime del volcado) |
| `claude_strings.txt` | 46 622 952 B · 804 628 líneas |
| sha256 del volcado | `2f51002b646f1c63…` |
| sha256 del ejecutable | `f7dd62ae41537801…` |
| Bytes del ejecutable | 216 677 784 |
| Ruta del ejecutable | `/opt/claude-code/bin/claude` |

Las dos primeras filas son **propiedad de un artefacto congelado**, no de uno
vivo: el archivo no vuelve a cambiar, así que la cifra no envejece.

## La versión la decidió el contenido, no `claude --version`

El literal de tres partes más frecuente del propio volcado, con su margen sobre
el segundo candidato:

| Puesto | Literal (ocurrencias) |
|---|---|
| 1º | **2.1.259 (1901)** |
| 2º | 127.0.0 (129) |

El margen —238×— decide: sin él, la versión no estaría decidida y haría falta
otro discriminador antes de archivar (`redaccion-tecnica-es.md`, procedimiento
de la cuarta prueba). `claude --version` coincide (`2.1.259 (Claude Code)`) —
pero es el volcado el que manda, porque el contenedor puede actualizar el
ejecutable a media sesión, que es exactamente lo que pasó aquí
(:ref:`h-docs-455`).

## Un dato que NO se explica aquí

El volcado tiene **más** líneas que el de 2.1.258 (804 628 contra 801 543) y el
ejecutable pesa más (216 677 784 contra 215 473 560 B). Se anota, no se
interpreta: qué se fue y qué entró es una comparación por cadena entre los dos
volcados, y ése es otro instrumento.

*Métrica:* `strings -n 4` sobre el ejecutable, y conteo de literales `N.N.N`.
*Ciega a:* cadenas de menos de 4 bytes, y a todo lo que el bundle guarde
codificado y no como texto.
