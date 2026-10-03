# verify-daemon-parity

## Qué se lanzó

```
bash -c cd src/packages/daemon && bun test 2>&1 | tail -6; cd /home/user/thyrox && python3 src/verify/check_package_typecheck.py daemon cli 2>&1 | tail -6
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
