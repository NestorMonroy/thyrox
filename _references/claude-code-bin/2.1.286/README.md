# claude-code 2.1.286 — corpus extraído

Extraído con `@thyrox/binary` (`bun src/packages/binary/bin/binary.ts extract`).
Este README se **deriva** del `MANIFEST.tsv` y del historial, no se transcribe:
la cifra que vive en un artefacto que crece no se copia a prosa
(`calibration-verified-numbers.md`).

| Eje | Valor |
|---|---|
| Archivos en `bunfs-root/` | 2352 |
| Bytes de contenido | 45010991 |
| Primer commit del MANIFEST | (sin registrar) |

`claude_strings.txt` — 849537 líneas.

Para re-derivar estas cifras sin leer este archivo:

```bash
gawk 'NR>1' _references/claude-code-bin/2.1.286/MANIFEST.tsv | wc -l
gawk 'NR>1 {s+=$2} END{print s}' _references/claude-code-bin/2.1.286/MANIFEST.tsv
git log --diff-filter=A --format=%cI -1 -- _references/claude-code-bin/2.1.286/MANIFEST.tsv
```
