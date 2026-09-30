# claude-code 2.1.274 — corpus extraído

Extraído con `@thyrox/binary` (`bun src/packages/binary/bin/binary.ts extract`).
Este README se **deriva** del `MANIFEST.tsv` y del historial, no se transcribe:
la cifra que vive en un artefacto que crece no se copia a prosa
(`calibration-verified-numbers.md`).

| Eje | Valor |
|---|---|
| Archivos en `bunfs-root/` | 2058 |
| Bytes de contenido | 41093696 |
| Primer commit del MANIFEST | 2026-09-17T08:52:27+00:00 |

**`claude_strings.txt` AUSENTE, y no es recuperable.**

Para re-derivar estas cifras sin leer este archivo:

```bash
awk 'NR>1' _references/claude-code-bin/2.1.274/MANIFEST.tsv | wc -l
awk 'NR>1 {s+=$2} END{print s}' _references/claude-code-bin/2.1.274/MANIFEST.tsv
git log --diff-filter=A --format=%cI -1 -- _references/claude-code-bin/2.1.274/MANIFEST.tsv
```

## La ausencia, declarada — no es un «parcial justificado»

El volcado de cadenas sale del ELF con `strings -n 4`, y **ese ELF ya no
está**: el binario vivo del contenedor declara `2.1.275`. No hay de dónde
regenerarlo, así que la ausencia es definitiva y se declara en vez de
disimularse.

Lo que la cubre en parte, medido: los seis literales que este árbol cita del
volcado están todos en el `bunfs-root/` de esta misma build.

```
CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS    3 archivo(s)
advisor_rank                            2
effort_cost_index                       2
tier_10_50_cache_read_0_25              1
claude-fable-5-1                        9
cross-session-message                   7
```

*Métrica:* `grep -rlF <literal> 2.1.274/bunfs-root`.
*Ciega a:* las cadenas del **runtime de bun**, que viven en el ELF y fuera
del bundle embebido. El 6 de 6 dice que lo que citamos está cubierto; no dice
que los dos universos coincidan.

## Por qué nació a medias, y no es un descuido de esta build

`writeCorpus` (`src/packages/binary/src/corpus.ts`) emite `bunfs-root/` y
`MANIFEST.tsv`, y **nada más**. Los otros dos marcadores siempre fueron un
paso manual posterior, así que toda build nace a medias por construcción y
sólo se completa si alguien se acuerda. Ver `H-THYROX-77`.
