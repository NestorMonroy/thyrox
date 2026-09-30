# extract-2-1-275

## Qué se lanzó

```
bash -c 
set -uo pipefail
cd /home/user/thyrox
B=$(readlink -f "$(command -v claude)")
echo "binario: $B"
bun src/packages/binary/bin/binary.ts extract
D=_references/claude-code-bin/2.1.275
echo "--- strings, que el extractor NO emite ---"
strings -n 4 "$B" > "$D/claude_strings.txt"
wc -l < "$D/claude_strings.txt"
du -sh "$D"

```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
