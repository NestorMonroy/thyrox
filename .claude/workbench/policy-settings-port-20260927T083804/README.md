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

## Fase B: la lectura de cada fuente

`config: settings/policySources.ts` lee la remota (`Qq`), la MDM (`Os`) y el
archivo con sus fragmentos (`njr`), y valida cada documento (`HRe`/`Ty`/`gd`).
La forma de sus errores sale del ejecutable (`symbol-UP-level3.txt` y la
extracción de `Gye`, `Cd`, `ugn`, `BUt`): el documento que no es un objeto
JSON lleva `startupFatal`, el ilegible `severity: "fatal"` con
`errorClass: "unreadable"`, y el fallo de esquema no trae gravedad. Un
`ENOENT` es ausencia; cualquier otro error de lectura deja la fuente
`didNotLoad`, para fallar cerrado.

Sus divergencias están en la cabecera del módulo: la validación es el
`SettingsSchema` de este paquete y no el esquema de rescate de 2.1.283 (sin
sustitutos, sin `removed`, sin el suelo `pd`), `Ed` no se porta, y la capa
remota no lee el estado de la sesión remota (aviso de servidores MCP
retenidos, fallos `ruled_empty`, `servedSnapshot`).

Controles: `probes/annul-phase-b.tsv`, salida en `outputs/annul-phase-b.out`.
La primera pasada dejó cinco variantes en pie; cuatro eran huecos de la
prueba (la copia de la caché, el documento JSON que no es objeto, el orden
de los fragmentos con un listado desordenado y el fragmento oculto con una
clave propia) y se cerraron con casos. La quinta —la remota vacía sin el
atajo `Object.keys(...).length === 0`— es equivalente: validar `{}` da el
mismo resultado, y el atajo sólo ahorra la validación. Se retiró del
archivo de variantes y queda declarada aquí.

Las pruebas corren como root en este contenedor, así que un `chmod 000` no
niega nada: el `EACCES` se provoca inyectando el lector (`PolicyFiles`).

## Fase C.1: la fusión por restricción

`config: settings/policyMerge.ts` porta `jy`, `_d`, `ks`, `Wy`, `xd`, `Md`,
`S6` y las listas `Qe` (las claves que restringen, con su valor restrictivo),
`tVo` (lo que sólo aporta el escalón superior), `X2o`, `Td` y `$y`
(`symbol-UP-level4.txt`, `symbol-UP-level5.txt`). Con `S6` completa, la
fusión de fragmentos de la fase B deja de ser provisional: `managedMcpServers`
y `extraKnownMarketplaces` se funden por clave y `modelPicker` se copia.

Pendiente, declarado en la cabecera: la reescritura de `awsPairs` (`Pd`).

Controles: `probes/annul-phase-c1.tsv`, salida en
`outputs/annul-phase-c1.out`. La primera pasada dejó tres variantes mal
formadas o en pie: una rompía la sintaxis y se reescribió; «el superior
afloja una restricción» no tenía caso y se añadió; y el borrado final de
`strictPluginOnlyCustomization` sin listas es equivalente —el bucle de
restricción ya lo retira con la misma condición, igual que en la fuente—, así
que se retiró del archivo y queda declarado aquí. El control de la fase B se
repitió con la fusión nueva (`fragment-merge-default`).

## Fase C.2a: lo que aporta el proceso padre

`config: settings/policyParent.ts` porta `J2o` (la porción del padre), `Hy`,
`Zl` y `J1r`; `Pd` (la supresión de pares AWS) queda en
`settings/policyComposition.ts`, y con ella `xd` completa el reemplazo de
`awsPairs` en `settings/policyMerge.ts`, que deja de ser pendiente. Las tres
claves `*ThyroxAi*` siguen la decisión de nombre de la fase C.1.

Controles: `probes/annul-phase-c2a*.tsv`, salidas en
`outputs/annul-phase-c2a*.out`; caen todas. Una variante se retiró por
equivalente: filtrar `path[0] === "sandbox"` en `Hy` no cambia nada, porque
la función devuelve sólo `kept.sandbox` y las demás rutas se descartan igual.

## Fase C.2b: la composición

`config: settings/policySettings.ts` porta `UP` y sus consumidores `Zy` (el
documento de la fuente `policySettings`), `Jy` (los escalones, con la porción
del padre al final) y `Gy` (qué fuentes aportaron a una fusión), más `BL`
(el asistente de política y su fusión, una vez por sesión, con `Id`, `eVo`,
`Vy` y `Xy`), `lft` (el padre) y `aft` (la rama WSL). Los consumidores salen
de `symbol-UP-consumers.txt`.

La ruta Windows administrada sale de `config: settings/managedPath.ts`
(`WINDOWS_MANAGED_DIRECTORY`) y WSL la lee por su montaje: el literal de la
referencia vive en un solo sitio.

Divergencias, en la cabecera del módulo: `MRe` y `Rz` se inyectan
(`honorsHostMcpServers`, `hostManagesGateway`) en vez de leer el punto de
entrada y el entorno, y la caché de lecturas por sesión no se porta.

Controles: `probes/annul-phase-c2b.tsv`, salida en
`outputs/annul-phase-c2b.out`. La primera pasada dejó siete variantes en pie:
seis eran huecos de la prueba (la comparación sin mayúsculas de `env`, el
asistente como escalón frente al archivo, la porción vacía del padre, el
padre con HKCU, la fuente fundida que sólo trae claves del escalón superior
y las fuentes fundidas sin fusión) y se cerraron con casos. La séptima —qué
fuente se nombra como suplente cuando la remota pierde teniendo valores— no
se alcanza en este porte: la remota perdería sólo con sustitutos, y sin el
esquema de rescate de 2.1.283 no los hay. Se retiró del archivo y queda
declarada aquí; se vuelve alcanzable con esa fase.

## Fase C.3: el cableado

`getSettingsForSource('policySettings')` devuelve ahora el documento de la
composición (`Zy`) con el contexto de la sesión (`defaultPolicyContext`: la
plataforma, la caché remota, la MDM y HKCU cargadas, el archivo administrado
y la salida del asistente), y `loadSettingsFromDisk` funde esa fuente en su
lugar y suma sus errores. La prueba de integración que
`remoteSettingsFirstHitFlush.test.ts` declaraba pendiente es
`config: __tests__/policySettingsWiring.test.ts`.

Controles: `probes/annul-phase-c3.sh` anula en copias del paquete —la prueba
importa `settings.ts` por ruta relativa—; caen las dos variantes
(`outputs/annul-phase-c3.out`).

**Lo que el subconjunto destapó.** Con el cableado, siete pruebas de
permisos fallaban al correr detrás de
`config: plugin/__tests__/ineffectiveDisables.test.ts`, y en `HEAD` no
(`outputs/wiring-subset-fails.txt` contra `wiring-subset-fails-baseline.txt`).
La causa era esa prueba: su `mock.module` de `settings.js` es global en la
ejecución, no se deshace y dejaba un módulo con sólo dos funciones. Ahora el
sustituto conserva las exportaciones reales y, al terminar el archivo, delega
en ellas. Por qué el cableado cambió qué instancia del módulo recibía el
sustituto no está medido.

Pendiente, en `defaultPolicyContext`: de qué fuente se armó el asistente, si
funde su salida y los ajustes del proceso padre.

## El contexto de la sesión

`defaultPolicyContext` lee ahora del entorno `Rz` (`hostManagesGateway`: el
anfitrión administra proveedor y gateway, desde un escritorio o con el linaje
de gateway y su archivo de credenciales) y `MRe`/`ixe`
(`honorsHostMcpServers`), y del anfitrión los ajustes administrados del padre
(`TVr`, el binding opcional `getParentManagedSettings`). El contexto de 2.1.283
es `F` (`symbol-helper-context.txt`).

El asistente de política compone siempre como escalón propio: `nr`/`rr` leen
`armedFromRemote` y `mergesOutput` de su estado, y el asistente de este
paquete sólo se arma desde plist, HKLM o el archivo y no funde su salida.

La porción del padre no entra en `getSettings`: en 2.1.283 llega por los
lectores de escalones (`fu` → `mgn` → `Jy`), que cada comprobación recorre.
`getPolicyTiers` y `getAdminAuthoredPolicy` son esos lectores, sin la caché de
sesión del ejecutable, porque su invalidación no está portada
(`symbol-policy-readers.txt`).

Pendiente: el estado de carga remota (`agn`, `jx`, `S$o`) no existe en
`remote/` de este paquete.

Controles: las variantes de `Rz`/`MRe` y del contexto están en
`probes/annul-phase-c2b.tsv`; las del padre y de los lectores, en
`probes/annul-phase-c3.tsv`, que ahora nombra el archivo de cada variante.
Caen todas.
