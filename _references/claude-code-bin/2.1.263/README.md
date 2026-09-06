# claude-code 2.1.263 — corpus extraído

**Extraída el 2026-09-06T06:31:36** con `@thyrox/binary`, dos builds después de la última
que lo estaba (`2.1.261`). Trae `bunfs-root/` con **1818 archivos** y su
`MANIFEST.tsv`, más el `claude_strings.txt`.

## Qué la disparó

No una revisión de rutina: el control de `@thyrox/binary` **falló y con razón**.

```
Received: "build 2.1.263 sin medir — anadir su fila a MEASURED tras extraerla"
```

Ese caso está escrito para que una build desconocida **caiga**, no para saltarse:
*«el salto seria un verde que no discrimina "coincide" de "no lo mire" — y es
justo la senal de frescura que falto tres builds seguidas (2.1.250, 2.1.251,
2.1.258)»*. Funcionó: el ejecutable se actualizó bajo la sesión y el control lo
dijo en el mismo turno.

## La extracción

| Eje | Valor |
|---|---|
| Instante | `2026-09-06T06:31:36` |
| Archivos | 1818 |
| Bytes de contenido | 38 733 511 |
| Entradas de la tabla | 1818 de 1818 |
| Paso de la tabla | 52 B |
| Tabla | 94 536 B |
| Sección `.bun` | offset 87 474 176, 128 127 528 B |

Por tipo: `.js` 1635 · `.zst` 103 · `.md` 61 · `.txt` 12 · `.node` 3 ·
`.mjs` 2 · sin extensión 1 · `.asset` 1.

## Cómo se decidió la versión

**Por el contenido, no por `claude --version`.** El literal `N.N.N` más
frecuente del volcado gana, y aquí lo hace con margen decisivo:

```
   1897 2.1.263
    133 127.0.0
    103 1.2.840
```

14× sobre el segundo. La regla existe porque ya estuvo a punto de fallar: el
volcado de `2.1.246` se tomó en una sesión cuyo `claude --version` respondía
**2.1.247**, porque el contenedor actualizó el ejecutable a media sesión
(:ref:`h-docs-455`). Un volcado archivado bajo la build equivocada es peor que
ninguno: sus cifras se leen como propias de un ejecutable que nunca las produjo.

```bash
grep -oE '[0-9]+\.[0-9]+\.[0-9]+' claude_strings.txt | sort | uniq -c | sort -rn | head -5
```

*Métrica:* ocurrencias de un literal `N.N.N` en el volcado de cadenas, agrupadas.
*Ciega a:* una build cuya versión no aparezca como literal —no observado—, y al
empate, que aquí no ocurre por 14× pero no está garantizado. Si el primero y el
segundo quedan cerca, la versión **no** está decidida y hay que buscar otro
discriminador antes de archivar.

## Delta contra 2.1.258

Medido, no estimado: **+16 entradas** (1802 → 1818), **+832 B** de tabla
(93 704 → 94 536, coherente con el paso de 52 B invariante) y **+269 827 B** de
contenido. Su fila entró en `MEASURED` de `bunfs.test.ts` **medida con
`binary info` sobre la build viva**, no copiada de la anterior — que es lo que
ese registro exige por escrito.
