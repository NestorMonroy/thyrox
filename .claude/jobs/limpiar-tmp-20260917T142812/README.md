# limpiar-tmp

## Qué se lanzó

```
bash -c find /tmp -maxdepth 1 -type d -regextype posix-extended -regex '.*/(wb|sub|rec|ses|hev|rw|bin|cli|loop|todo|attr|store|hook|skills|impact|presion|taskrem|harness|censo|census-open-tasks|marker-wait|pyqa-media|tmp)[-.].*' -mmin +60 -print0 2>/dev/null | xargs -0 -r -P4 -n200 rm -rf; echo BORRADO
```

## Qué se preguntaba

<!-- la clave `question` del manifiesto -->

## Qué se recogió

*Metrica:*
*Ciega a:*
