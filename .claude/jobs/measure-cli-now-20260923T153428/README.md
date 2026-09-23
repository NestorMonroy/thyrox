# measure-cli-now

## Qué se lanzó

```
bash -c cd src/packages/cli && for p in tsconfig.json tsconfig.tests.json; do printf "%s %s\n" "$p" "$(bunx tsc --noEmit -p "$p" </dev/null 2>&1 | grep -c "error TS")"; done
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
