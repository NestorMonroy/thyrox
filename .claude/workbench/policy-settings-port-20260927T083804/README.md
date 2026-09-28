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

## Fases del porte

La extracción de los auxiliares (`symbol-UP-helpers.txt`, 31 nombres, y
`symbol-UP-level2.txt`, 34) muestra un árbol de tres niveles: las decisiones
puras, la lectura de cada fuente (esquema de política con su caché por
documento, el directorio `managed-settings.d`, el plist o HKLM) y la fusión
por restricción. Se porta por capas, y cada capa entera:

1. **A — las piezas puras** (hecha): `config: settings/policyComposition.ts`,
   con `cft`, `Lt`, `ggn`, `_s`, `mUe`, `bs`, `gUe`, `WUt`, `Yye`, `dft`,
   `uUe`, `h8e`, `Z2o`, `Ee`, `Ve`, `Ky`, `fd`, `B5n` y `By`, más las
   constantes `lt`, `Es`, `Fy`, `mjr` y `Kye`.
2. **B — la lectura de cada fuente**: `HRe`/`Ty`/`gd` (validación de un
   documento de política, con caché por documento), `Qq` (remota), `Os`
   (MDM), `njr`/`aft` (archivo y su directorio de fragmentos) y `lft`
   (el padre).
3. **C — la fusión**: `jy`, `_d`, `ks`, `Wy`, `Hy`, `J2o` y `UP`, y su
   cableado en `getSettingsForSource('policySettings')`.

Controles de la fase A: `probes/annul-phase-a.tsv`, salida en
`outputs/annul-phase-a.out` — caen las 23 variantes.

*Métrica:* aserciones que caen por variante.
*Ciega a:* la composición real, que aún no existe: las piezas se prueban
sueltas, no en el orden en que `UP` las llama.
