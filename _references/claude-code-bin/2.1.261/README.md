# claude-code 2.1.261 — corpus extraído

**Extraída el 2026-09-04T20:45** con `@kaupamex/binary`, la build siguiente a
`2.1.259`. Trae `bunfs-root/` con **1818 archivos** y su `MANIFEST.tsv`, más el
`claude_strings.txt` volcado con `strings`.

Se extrajo porque el ejecutable del contenedor volvió a actualizarse a media
sesión —`2.1.259` → `2.1.261`— mientras se analizaba **cómo segmenta el cliente
sus identificadores** (punto contra guion contra dos puntos). Todo análisis del
esquema de identificadores que esta sesión escriba cita **este** corpus.

## La extracción

| Eje | Valor |
|---|---|
| Instante | `2026-09-04T20:45` |
| Archivos | 1818 |
| Bytes de contenido | 38 729 220 |
| Entradas de la tabla | 1818 |
| Paso de la tabla | 52 B |
| Sección `.bun` | offset 87 474 176, 128 110 436 B |
| Por tipo | `.js` 1635 · `.zst` 103 · `.md` 61 · `.txt` 12 · `.node` 3 · `.mjs` 2 · (sin) 1 · `.asset` 1 |
| sha256 del `MANIFEST.tsv` | `42adc719fc6ab6d2…` |

Reproducible sin confiar en este texto:

```bash
bun run .claude/packages/binary/bin/binary.ts info        # versión, tabla, tipos
bun run .claude/packages/binary/bin/binary.ts freshness    # exit 0 si el corpus está al día
```

El `MANIFEST.tsv` lleva el SHA-256 de cada archivo: repetir la extracción sobre
el mismo ejecutable y comparar la columna es toda la verificación que hace falta.

**Partición: no hace falta aquí.** Ningún archivo del corpus se acerca al tope
duro de 100 MiB por archivo ni al aviso de 50 MiB; el `claude_strings.txt`
(44 MiB) es el mayor y tampoco lo cruza.

## El volcado de cadenas

| Eje | Valor |
|---|---|
| Instante de la medición | `2026-09-04T20:45` (mtime del volcado) |
| `claude_strings.txt` | 46 462 649 B · 804 209 líneas |
| sha256 del volcado | `e467d206fa0f123c…` |
| sha256 del ejecutable | `4ae40dd1784e8575…` |
| Bytes del ejecutable | 215 641 584 |
| Ruta del ejecutable | `/opt/claude-code/bin/claude` |

Las dos primeras filas son **propiedad de un artefacto congelado**, no de uno
vivo: el archivo no vuelve a cambiar, así que la cifra no envejece.

## La versión la decidió el contenido, no `claude --version`

El literal de tres partes más frecuente del propio volcado, con su margen sobre
el segundo candidato:

| Puesto | Literal (ocurrencias) |
|---|---|
| 1º | **2.1.261 (1897)** |
| 2º | 127.0.0 (133) |
| 3º | 1.2.840 (103) |

El margen —14×— decide. `claude --version` coincide (`2.1.261 (Claude Code)`),
pero es el volcado el que manda, porque el contenedor puede actualizar el
ejecutable a media sesión, que es lo que pasó aquí y en `2.1.259`
(:ref:`h-docs-455`).

## Un dato que NO se explica aquí

Contra `2.1.259`: **un archivo menos** (1818 contra 1819), **menos bytes de
contenido** (38 729 220 contra 38 889 863) y un **ejecutable más pequeño**
(215 641 584 contra 216 677 784 B). Se anota, no se interpreta: qué se fue y qué
entró es una comparación por cadena entre los dos volcados, y ése es otro
instrumento.

*Métrica:* `strings -n 4` sobre el ejecutable, y conteo de literales `N.N.N`.
*Ciega a:* cadenas de menos de 4 bytes, y a todo lo que el bundle guarde
codificado y no como texto.
