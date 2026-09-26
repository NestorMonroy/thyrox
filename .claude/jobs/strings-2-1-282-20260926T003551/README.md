# strings-2-1-282

## Qué se lanzó

```
bash -c strings -n 4 "$(readlink -f "$(command -v claude)")" > _references/claude-code-bin/2.1.282/claude_strings.txt && grep -oE '[0-9]+\.[0-9]+\.[0-9]+' _references/claude-code-bin/2.1.282/claude_strings.txt | sort | uniq -c | sort -rn | head -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
