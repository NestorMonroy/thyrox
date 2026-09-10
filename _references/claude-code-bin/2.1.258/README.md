# claude-code 2.1.258 — corpus extraído

**Extraída el 2026-09-02T17:24:02** con `@kaupamex/binary`, doce builds después de la última
que lo estaba (`2.1.246`). Trae `bunfs-root/` con **1802 archivos** y su
`MANIFEST.tsv`, además del `claude_strings.txt` que ya estaba.

> El texto de abajo, desde «Se vendorizó a petición del ejecutor», es del día en
> que sólo había volcado de cadenas. Se conserva: describe cómo se decidió la
> versión, y esa parte no cambió.

## La extracción

| Eje | Valor |
|---|---|
| Instante | `2026-09-02T17:24:02` |
| Archivos | 1802 |
| Bytes de contenido | 38 463 684 |
| Entradas de la tabla | 1802 de 1802 |
| Paso de la tabla | 52 B |
| sha256 del `MANIFEST.tsv` | `4d3ef8d36a9993a5…` |

Reproducible sin confiar en este texto:

```bash
bun run .claude/packages/binary/bin/binary.ts info       # versión, tabla, tipos
bun run .claude/packages/binary/bin/binary.ts freshness   # exit 0 si el corpus está al día
```

El `MANIFEST.tsv` lleva el SHA-256 de cada archivo: repetir la extracción sobre
el mismo ejecutable y comparar la columna es toda la verificación que hace falta.

### Por qué sueltos y no comprimidos

Medido antes de decidirlo, sobre `bunfs-root/` + `MANIFEST.tsv`:

| Forma | Peso en git | Greppable |
|---|---|---|
| archivos sueltos | **13 631 KiB** (tras `repack --window=250`) | sí |
| `.7z` LZMA2:d256m sólido | 10 374 KiB | no |

La diferencia es de **3.2 MiB**, y el corpus existe para que un `grep` localice
un símbolo en un módulo con nombre. Pagar eso por conservar la búsqueda es el
canje correcto, y coincide con el precedente de `2.1.246`.

**Partición: no hace falta aquí.** El archivo mayor del corpus extraído es
`chunk-vw215j9f.js` con 5.2 MiB — muy por debajo del tope duro de 100 MiB por
archivo y del aviso a los 50 MiB. Partir por partir añadiría un paso de
reensamblado sin comprar nada.

Se vendorizó a petición del ejecutor (2026-09-02: *«¿tenemos la última versión
de los binarios de claude code?»*). No la teníamos: el corpus más reciente era
`2.1.251/` y el ejecutable del contenedor declara **2.1.258** — siete builds
por delante. El evento que lo midió es
`.claude/eventos/volcado-binario-claude-code-20260902T041931/`.

## Qué se midió, y cuándo

| Eje | Valor |
|---|---|
| Instante de la medición | `2026-09-02T04:20:47` |
| `claude_strings.txt` | 46250263 B · 801543 líneas |
| sha256 del volcado | `738c3a68963e0f31…` |
| sha256 del ejecutable | `704f1334ac65d3e8…` |
| Bytes del ejecutable | 215473560 |
| Ruta del ejecutable | `/opt/claude-code/bin/claude` |

Las dos primeras filas son **propiedad de un artefacto congelado**, no de uno
vivo: el archivo no vuelve a cambiar, así que la cifra no envejece.

## La versión la decidió el contenido, no `claude --version`

El literal de tres partes más frecuente del propio volcado, con su margen sobre
el segundo candidato:

| Puesto | Literal (ocurrencias) |
|---|---|
| 1º | **2.1.258 (1891)** |
| 2º | 127.0.0 (129) |

El margen decide: sin él, la versión no estaría decidida y haría falta otro
discriminador antes de archivar (`redaccion-tecnica-es.md`, procedimiento de
la cuarta prueba). `claude --version` coincide — pero es el volcado el que manda,
porque el contenedor puede actualizar el ejecutable a media sesión
(:ref:`h-docs-455`).

## Un dato que NO se explica aquí

El volcado tiene **menos** líneas que el de 2.1.251 (851307) pese a que el
ejecutable pesa más (215473560 contra 214326616 B). Se anota, no se interpreta:
qué se fue y qué entró es una comparación por cadena entre los dos volcados, y
ése es otro instrumento.

*Métrica:* `strings -n 4` sobre el ejecutable, y conteo de literales `N.N.N`.
*Ciega a:* cadenas de menos de 4 bytes, y a todo lo que el bundle guarde
codificado y no como texto.
