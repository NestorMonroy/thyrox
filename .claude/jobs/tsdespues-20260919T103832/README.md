# tsdespues

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1
```

## Qué se preguntaba

El mismo barrido que `tsbase`, ahora **con** las 44 claves izadas a
`devDependencies` de la raíz, los 9 hermanos `workspace:*` declarados y los 7
specifiers desnudos reapuntados a su nombre con alcance
(`TASK-THYROX-0224`). La pregunta es de atribución: ¿mueve el izado alguna
ubicación de error?

## Qué se recogió

**5624** ubicaciones, idéntico a `tsbase`. Atribuido por `comm` sobre los dos
listados ordenados: **0 desaparecieron, 0 aparecieron**.

Ese cero es el resultado, no un no-resultado: la declaración de una
dependencia que la raíz ya resolvía por ascenso a `node_modules` **no puede**
mover un TS2307, porque el import ya resolvía. Lo que el izado cierra es la
divergencia con la forma de la referencia y la deuda de un manifiesto que
miente sobre lo que su paquete usa — no un rojo del compilador.

Es la medición que sostuvo el `--no-verify` de `0beb5445`: el gate
`check-cli-typecheck` del `pre-commit` da 1871 con el cambio y 1871 en HEAD.

*Metrica:* misma reducción por ubicación que `tsbase`, comparada por conjunto
con `comm -23` / `comm -13`.
*Ciega a:* lo mismo que su par; y a que un conteo idéntico con las dos
direcciones en cero no distingue «nada cambió» de «cambiaron dos cosas que se
compensan» — el `comm` por ubicación es justo lo que lo separa, y por eso se
corre en vez de comparar los totales.
