# verify-integrated-extra

## Qué se lanzó

```
bash -c cd src/packages/cli && bun test __tests__/providersTestVerbs.test.ts; a=$?; cd ../provider && bun test src/__tests__/credentialProxy.test.ts; b=$?; echo "exits cli=$a provider=$b"; exit $(( a || b ))
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
