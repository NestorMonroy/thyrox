# claude-code 2.1.266 — corpus extraído

**Extraída el 2026-09-09T18:13:03** con `@thyrox/binary`, tres builds después de la última
que lo estaba (`2.1.263`). Trae `bunfs-root/` con **1827 archivos** y su
`MANIFEST.tsv`, más el `claude_strings.txt`.

## Qué la disparó

Una pregunta del ejecutor —«¿tenemos los últimos de claude-code-bin?»— y la
respuesta del propio mecanismo, que ya estaba escrita:

```
$ bun src/packages/binary/bin/binary.ts freshness
el corpus llega a 2.1.263 y el ejecutable declara 2.1.266; extraer 2.1.266
```

Y su control, que **falló nombrando la build**, que es lo que ese registro
exige por escrito:

```
Received: "build 2.1.266 sin medir — anadir su fila a MEASURED tras extraerla"
```

## La extracción

| Eje | Valor |
|---|---|
| Instante | `2026-09-09T18:13:03` |
| Archivos | 1827 |
| Bytes de contenido | 37 733 274 |
| Entradas de la tabla | 1827 de 1827 |
| Paso de la tabla | 52 B |
| Tabla | 95 004 B |
| Sección `.bun` | offset 87 474 176, 128 405 889 B |

Por tipo: `.js` 1646 · `.zst` 103 · `.md` 60 · `.txt` 12 · `.node` 2 ·
`.mjs` 2 · sin extensión 1 · `.asset` 1.

## Cómo se decidió la versión

**Por el payload, no por `claude --version`.** `deriveVersion` la lee de la
sección `.bun`, que es el contenedor que Bun escribió al compilar: no puede
discrepar del código que se está midiendo.

El discriminador por frecuencia sobre el volcado de cadenas —el que las builds
sólo-volcado usan— **coincide**, con margen decisivo:

```
   1908 2.1.266
    132 127.0.0
```

14× sobre el segundo. Que las dos vías coincidan no es redundante: la segunda es
la única disponible cuando una build no se extrae, y verla acertar donde la
primera es autoritativa es lo que permite seguir confiando en ella.

*Métrica:* la versión que el payload declara, contrastada con las ocurrencias
de un literal `N.N.N` en el volcado.
*Ciega a:* un payload cuya versión declarada difiera de la del ejecutable que lo
contiene — no observado, y no habría con qué detectarlo desde dentro.

## Delta contra 2.1.263

Medido, no estimado: **+9 entradas** (1818 → 1827) y **+468 B** de tabla
(94 536 → 95 004, coherente con el paso de 52 B invariante). El contenido, en
cambio, **baja 1 000 237 B** (38 733 511 → 37 733 274).

Es la primera vez que este corpus observa la tabla creciendo con el payload
encogiendo. No es contradictorio —son dos ejes: cuántos módulos hay y cuánto
pesan— pero sí es la primera muestra, así que no se le atribuye causa. Por tipo,
`.js` sube de 1635 a 1646 y `.node` baja de 3 a 2.
