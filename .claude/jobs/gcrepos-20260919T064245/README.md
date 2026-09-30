# gcrepos

## Qué se lanzó

```
bash -c for r in thyrox kaupamex-api kaupamex-docs; do echo "== $r"; git -C /home/user/$r gc --prune=now 2>&1 | tail -2; done; echo "== fin"
```

## Qué se preguntaba

Cuánto suelta un `gc --prune=now` sobre los tres repos escritos en esta
sesión, después de que la de-materialización de `16.x` en `odoo-tools`
—el mecanismo que el propio `odoo-tools` documenta en
`docs/git-sparse-clone/sparse-checkout-management.md`— bajara el volumen
de 100 % a 96 %.

El `gc` va en segundo plano porque es un barrido determinista: cuesta
cero tokens como proceso y pagaría una conversación entera como agente
(`trabajo-en-segundo-plano.md`).

## Qué se recogió

`done:0` en 153.7 s. Los tres `gc` salieron limpios y **sin una línea de
salida**: `tail -2` de cada uno quedó vacío, así que el log sólo lleva
los rótulos. El veredicto no sale del log —que es mudo— sino del `du`
por repo antes y después.

| Repo | antes | después |
|---|---|---|
| `thyrox` | 1.7G | **1.5G** |
| `kaupamex-api` | 384M | **368M** |
| `kaupamex-docs` | 1.4G | 1.4G |

Volumen: **1.8G → 1.9G libres**, 96 % → **95 %**.

*Metrica:* `du -sh` por repo y `df -h /`, antes del lanzamiento y tras
recoger la barrera.
*Ciega a:* el delta de `kaupamex-docs`, que a la granularidad de 0.1G de
`du -sh` no se resuelve —pudo soltar hasta ~50 MiB sin que la cifra se
mueva—; y a la atribución del delta de `df`, que corre en sentido
contrario mientras el trabajo avanza: el transcript vivo de esta sesión
crece en `/root/.claude/projects` durante los 153 s, así que el espacio
libre ganado **subestima** lo que el `gc` soltó. El log, por su parte,
no discrimina «no había nada que soltar» de «lo soltó sin decirlo»:
`gc` calla en los dos casos, y por eso el `du` es el instrumento y no él.
