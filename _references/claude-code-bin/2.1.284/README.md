# claude-code 2.1.284 — corpus extraído

Extraído con `@thyrox/binary` (`bun src/packages/binary/bin/binary.ts extract`).
Este README se **deriva** del `MANIFEST.tsv` y del historial, no se transcribe:
la cifra que vive en un artefacto que crece no se copia a prosa
(`calibration-verified-numbers.md`).

| Eje | Valor |
|---|---|
| Archivos en `bunfs-root/` | 2380 |
| Bytes de contenido | 45267563 |
| Primer commit del MANIFEST | (sin registrar) |

`claude_strings.txt` — 845872 líneas.

Para re-derivar estas cifras sin leer este archivo:

```bash
gawk 'NR>1' _references/claude-code-bin/2.1.284/MANIFEST.tsv | wc -l
gawk 'NR>1 {s+=$2} END{print s}' _references/claude-code-bin/2.1.284/MANIFEST.tsv
git log --diff-filter=A --format=%cI -1 -- _references/claude-code-bin/2.1.284/MANIFEST.tsv
```
