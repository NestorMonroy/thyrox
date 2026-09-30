# emit-mitm-repoint

## Qué se lanzó

```
bash -c bash bin/emit_declarations --repoint mitm 2>&1 | tail -5; git diff --stat -- src/packages/mitm/package.json; bash bin/check-cli-typecheck --strict 2>&1 | tail -12
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
