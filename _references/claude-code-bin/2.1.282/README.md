# claude-code 2.1.282 — corpus extraído

Extraído con `@thyrox/binary` (`bun src/packages/binary/bin/binary.ts extract`).
Este README se **deriva** del `MANIFEST.tsv` y del historial, no se transcribe:
la cifra que vive en un artefacto que crece no se copia a prosa
(`calibration-verified-numbers.md`).

| Eje | Valor |
|---|---|
| Archivos en `bunfs-root/` | 2282 |
| Bytes de contenido | 44505459 |
| Primer commit del MANIFEST | (sin registrar) |

`claude_strings.txt` — 844963 líneas.

Para re-derivar estas cifras sin leer este archivo:

```bash
gawk 'NR>1' _references/claude-code-bin/2.1.282/MANIFEST.tsv | wc -l
gawk 'NR>1 {s+=$2} END{print s}' _references/claude-code-bin/2.1.282/MANIFEST.tsv
git log --diff-filter=A --format=%cI -1 -- _references/claude-code-bin/2.1.282/MANIFEST.tsv
```
