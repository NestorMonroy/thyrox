# La composición de policySettings en 2.1.283

`settings/settings.ts` declaraba la resolución de `policySettings` bloqueada
por tres módulos ausentes. Medido: los tres existen hoy
(`remote/syncCacheState.ts`, `settings/mdm/settings.ts`,
`settings/managedPath.ts`). Lo que falta es la composición.

Extraída con `bin/binary` sobre 2.1.283:

- `literal getRemoteManagedSettingsSyncFromCache` → exportado como `Xk`
  desde `chunk-379zyrv7.js`;
- `references chunk-379zyrv7.js Xk` → 13 usos (`references-Xk.txt`); en su
  propio chunk lo consume `Qq`, la capa remota (`symbol-Qq.txt`);
- `references chunk-379zyrv7.js Qq` → `Os` (MDM) y `UP`, la composición
  completa (`symbol-Os-UP.txt`): remoto, MDM, archivo y la ranura del
  asistente de política, con modo de fusión (`managedSourcesBehavior`),
  lecturas que fallan cerrado y avisos por fuente.

`UP` depende de una docena de funciones auxiliares; su porte es una tarea
propia. El control unitario del vaciado en la primera lectura
(`config: __tests__/remoteSettingsFirstHitFlush.test.ts`) no depende de ella.
