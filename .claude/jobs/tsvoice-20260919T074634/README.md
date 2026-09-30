# tsvoice

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bunx tsc --noEmit 2>&1 | grep "src/packages/voice" | sed "s/(.*//" | sort | uniq -c | sort -rn; echo "--- total errores en voice:"; bunx tsc --noEmit 2>&1 | grep -c "^src/packages/voice"
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
