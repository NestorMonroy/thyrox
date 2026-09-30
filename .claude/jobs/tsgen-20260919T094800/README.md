# tsgen

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

Segundo intento del desenlace A de `TASK-THYROX-0229`. Si lo que rompe el
`import` estático es que `SettingsChangeTarget` está fijo en la firma
(`tsapphost`), ¿lo resuelve **parametrizarla**? Se hizo genérica:

```ts
export function applySettingsChange<Target extends SettingsChangeTarget>(
  source: SettingSource,
  setAppState: (f: (prev: Target) => Target) => void,
): void
```

## Qué se recogió

**5684 / 5682** — idéntico a `tsapphost`, **misma ubicación y mismo código**:
`AppState.tsx(223,33) TS2345`. El genérico no compra nada.

La causa es la **inferencia**: el único sitio donde `Target` aparece es la
posición de parámetro de una función, así que TypeScript no tiene de dónde
inferirlo y cae al **constraint** — `Target = SettingsChangeTarget`, que es
exactamente la firma de partida. El cambio es inerte, no parcial.

*Metrica:* ídem `tsapphost`; el delta se atribuye por `comm` sobre las
ubicaciones ordenadas de las dos corridas.
*Ciega a:* la misma ceguera de covarianza — que el error sea *idéntico* prueba
que la inferencia no se movió, no que el genérico sea inexpresable en general.
