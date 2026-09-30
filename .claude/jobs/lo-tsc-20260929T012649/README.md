# lo-tsc

## Qué se lanzó

```
bash -c cd src/packages/local-observability && bunx tsc --noEmit -p tsconfig.test.json 2>&1 | grep -E "launchRegistration|udsLaunchRegistration|error TS" | head -20; echo "tsc-exit=${PIPESTATUS[0]}"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
