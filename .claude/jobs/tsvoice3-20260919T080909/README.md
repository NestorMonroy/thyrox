# tsvoice3

## Qué se lanzó

```
bash -c bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -E 'src/packages/voice' | sort
```

## Qué se preguntaba

Cuantos errores de typecheck quedan en el paquete `voice` tras
declarar `@thyrox/audio-capture-napi` y restaurar el import de
`isRunningOnHomespace`. El numero que se espera mover es 4 -> 3: el
de `audio-capture-napi` desaparece y los tres de `voiceStreamSTT.ts`
no, porque son pre-existentes.

## Qué se recogió

**3 errores**, los tres en `voiceStreamSTT.ts`: `@types/ws` sin
declarar (`:22`) y dos parametros `any` implicitos (`:495`). El de
`voice.ts(64,33)` que el job hermano de las 07:53 registraba ya no
aparece.

*Metrica:* `bunx tsc --noEmit -p tsconfig.json` filtrado a
`src/packages/voice`, contra el mismo comando en
`.claude/jobs/tsvoice3-20260919T075333/outputs/salida.log`.
*Ciega a:* un error que `tsc` no reporte porque el esquema lo admite
por `.passthrough()` — es exactamente el caso de `voiceEnabled`
(H-THYROX-119), que typechequea sin estar declarada.
