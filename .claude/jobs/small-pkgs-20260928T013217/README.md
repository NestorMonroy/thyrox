# small-pkgs

## Qué se lanzó

```
bash -c for p in storage local-observability shell bridge; do (cd src/packages/$p && echo "== $p" && bun test 2>&1 | grep -E " (pass|fail)$"; bunx tsc --noEmit -p tsconfig.build.json 2>&1 | tail -n 3); done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
