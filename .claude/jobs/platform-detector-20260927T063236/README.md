# platform-detector

## Qué se lanzó

```
bash -c 
bash bin/check_package_typecheck config app-host storage agent provider; 
(cd src/packages/config && bun test) 2>&1 | tail -3;
(cd src/packages/storage && bun test) 2>&1 | tail -3;
(cd src/packages/agent && bun test) 2>&1 | tail -3;
(cd src/packages/app-host && bun test) 2>&1 | tail -3;
(cd src/packages/provider && bun test) 2>&1 | tail -3
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
