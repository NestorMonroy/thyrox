# tsc-106e5c3

## Qué se lanzó

```
bash -c cd src/packages/provider && bunx tsc -p tsconfig.build.json --noEmit | gawk '/error TS/'; echo BUILD_DONE; bunx tsc -p tsconfig.test.json --noEmit | gawk '/error TS/'; echo TEST_DONE; bun test __tests__/accounts/webCookie 2>&1 | tail -3; T=/home/user/thyrox bash -c 'source /home/user/thyrox/.claude/workbench/accounts-106e5c3-web-cookie-20260928T145331/annul-106e5c3.sh' >/dev/null 2>&1; true
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
