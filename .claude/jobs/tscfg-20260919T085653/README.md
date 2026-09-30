# tscfg — la mitad ROJA

## Qué se lanzó

```
bun run typecheck
```

## Qué se preguntaba

El porte de la mitad de PROYECTO de `@thyrox/config` (`beca2674`) se
cerró con `bun test src/packages/repl` en verde y **sin correr el
typecheck**. La pregunta es si el porte compila.

## Qué se recogió

`__BG_EXIT__=2`, **5710 errores** en el árbol. Cuatro en el sujeto:

```
config.ts(546,5):  TS6133 'lastReadFileStats' is declared but never read  ← PRE-EXISTENTE
config.ts(935,3):  TS2353 'projectOnboardingSeenCount' does not exist in ProjectConfig
config.ts(1040,7): TS2554 Expected 2 arguments, but got 1
config.ts(1075,5): TS2554 Expected 2 arguments, but got 1
```

`src/packages/config/index.ts`: **0**.

Éste es el log contra el que se diffeó la corrida verde (`tscfg2`) para
atribuir el delta. Sin él, el «5710 → 5704» sería una cifra que se mueve
sin explicación de por qué.

*Metrica:* líneas `error TS####` del compilador sobre el árbol completo.
*Ciega a:* cuál de los 5710 pertenece a quién — eso lo resuelve el diff
contra la corrida siguiente, no este log solo.
