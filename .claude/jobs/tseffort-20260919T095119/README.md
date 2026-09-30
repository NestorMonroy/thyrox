# tseffort

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

El diagnóstico de `tsgen2` (regla de tipo débil) destapó que `SettingsChangeTarget`
declara `settings: { effortLevel?: unknown }` mientras **nuestro** esquema de
settings no tiene `effortLevel` — que es exactamente la divergencia que
`applySettingsChange.ts` ya declaraba por escrito. Se portó la clave desde
`ccnmt: packages/config/settings/types.ts:744`:

```ts
effortLevel: z.enum(['none','low','medium','high','xhigh','max'])
  .optional().catch(undefined)
```

**con el `import` estático todavía en su sitio**, para medir si la clave era el
bloqueo.

## Qué se recogió

**5684 / 5682** — y la ubicación extra es la **misma** `AppState.tsx(223,33)
TS2345` de `tsapphost`. La clave del esquema **no era el bloqueo**: el puente
sigue rompiéndose por covarianza del retorno, que es independiente de qué
declare `settings`.

El valor del porte es otro y no es cero: cierra la divergencia declarada en la
cabecera de `applySettingsChange.ts` y permite retirar el `as Record<string,
unknown>` que la compensaba (`tsdiv`).

*Metrica:* ídem `tsapphost`.
*Ciega a:* si el enum portado admite los mismos seis valores que el disco
escribe en la práctica — eso lo mide el runtime, no el typecheck.
