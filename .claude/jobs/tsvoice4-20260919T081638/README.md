# tsvoice4

## Qué se lanzó

```
bash -c bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E 'src/packages/voice' | sort; echo '---fin'
```

## Qué se preguntaba

Cuantos errores de typecheck quedan en `voice` tras declarar
`@types/ws`. Se esperan 0: los dos `TS7006` de `:495` son `any`
implicito PORQUE el tipo de `ws.on` no se conocia, asi que deberian
caer con el mismo cambio que el `TS2307`.

## Qué se recogió

**Cero.** La salida es solo el marcador `---fin`. Los tres caen con
una linea de `devDependencies`.

*Metrica:* `bunx tsc --noEmit -p tsconfig.json` filtrado a
`src/packages/voice`.
*Ciega a:* lo que un esquema con `.passthrough()` admite sin
declararlo — H-THYROX-119. Un 0 aqui dice que el compilador no tiene
mas que decir con los tipos que ve, no que el paquete este completo.
