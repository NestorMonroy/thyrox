# TASK-THYROX-0507 — el ramal de barrido de `D3` (listar sesiones vivas), medido

Alcance del ítem: sólo `src/packages/local-observability/src/uds/__tests__/udsLiveSessionRegistry.test.ts`.
El porte de `D3` ya existía (`listAllLiveSessions`, `liveSessionRegistry.ts`); lo que faltaba
era la mitad roja de su ramal de barrido y su control negativo.

## Cómo lo resuelve la referencia (2.1.283, sólo lectura)

Todo leído con `grep -n -o -b -F/-E` sobre `/home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/`.
La columna «offset» es el byte dentro de la línea que `grep -b` reporta.

| Símbolo | Chunk | Línea:offset | Qué hace | Decisión |
|---|---|---|---|---|
| `D3(e,n)` | `chunk-qcy58j4w.js` | 12:20891 | lista con `F`, marca posible-vivo (`s(c)||ua(c.pid)`), verifica (`x_`), lee `TCe`, deriva `d=l?await HP():""`, y por registro: vivo → lo devuelve; si no, `l&&lpn(h,d)&&Nh(h.pid)` → `V(E,h.pid,d,e)` | ya portado línea a línea en `listAllLiveSessions` (:367-388); no se toca |
| `V(e,n,r,i)` | `chunk-qcy58j4w.js` | 12:20698 | retira el registro muerto: por storage si `N()` y hay storage, si no `me(e).then(()=>ZKn(...)).catch(()=>{})` — fire-and-forget | ya portado como `retireDeadRecord` (:353-365); la prueba sondea el disco porque nadie espera esa promesa |
| `ua(n)` | `chunk-j2p7jgmc.js` | 11:1624 | `if(n<=1)return!1; try{process.kill(n,0); return !0}` | `isProcessAlive` (:73) |
| `x_(e,n)` | `chunk-x5vr5vwm.js` | 12:5379 | `if(n===void 0)return!0; return P(n,await nc(e))` — generoso sin token | `isSameProcessStartOrUnknown` (:300) |
| `TCe()` | `chunk-t6pwageh.js` | 48:396946 | `HH().isRegistrySweepPermitted()` — el permiso memorizado del estado por anfitrión | `isRegistrySweepPermitted` (`registrySweep.ts`:181); en la prueba se fija `sessionRegistryState().registrySweepPermitted` y se restaura |
| `lpn(e,n,r=[])` | `chunk-t6pwageh.js` | 48:397536 | con `pidDomain` declarado, `e.pidDomain===n`; sin él, por plataforma | `recordInPidDomain` (:195); la prueba declara `pidDomain` = dominio propio para no depender de la plataforma |
| `Nh(e)` | `chunk-x5vr5vwm.js` | 11:2608 | `if(!mfn(e))return!1; try{process.kill(e,0); return !1}catch → ESRCH` | `isProcessGone` (`processIdentity.ts`:133). **Ojo:** hay otro `Nh` en `chunk-13pb2pb7.js` 45:225579 (un selector de credenciales); no es éste |
| `ZKn(dir,pid,domain,storage)` | `chunk-t6pwageh.js` | 48:397069 | borra las claves `<pid>.<sha256>.key` del pid muerto que no declaren otro dominio | `sweepDeadPidKeys` (:242); la prueba deja una clave con `pidDomain` propio y espera su retiro |

Divergencia: ninguna nueva. Las pruebas ejercitan el porte tal cual está.

## Diseño de las dos pruebas

- **Pid muerto real:** `Bun.spawn(['true'])` y `await child.exited`; el pid queda cosechado y
  `kill(pid,0)` da `ESRCH`. No se usa un número fijo porque `pid_max` aquí es 32768 (medido:
  `cat /proc/sys/kernel/pid_max`) y en otra máquina un literal alto podría existir.
- **Retiro fire-and-forget:** `retireDeadRecord` no se espera, así que la prueba positiva sondea
  el disco hasta 2000 ms cada 10 ms; la negativa espera 200 ms y afirma que los dos archivos
  siguen.
- **Permiso:** `withSweepPermission(valor, cuerpo)` fija el campo público
  `registrySweepPermitted` del estado del anfitrión y lo restaura en `finally`.

## Mediciones

Suite (`bun test src/uds/__tests__/udsLiveSessionRegistry.test.ts`, desde `src/packages/local-observability`):

| Estado | pass | fail | expect() |
|---|---|---|---|
| baseline, antes de tocar | 19 | 0 | 27 |
| con las dos pruebas nuevas | 21 | 0 | 33 |

Controles de anulación, cada uno sobre una copia con `cp` del módulo (nunca `git stash`),
`bin/replace_literal`, medir, y restaurar desde la copia (sha256 igual antes y después:
`e5cb655706385b49…`):

| Anulación (en `liveSessionRegistry.ts`) | pass | fail | Qué cae |
|---|---|---|---|
| 1 · ramal `else if (…) retireDeadRecord(…)` retirado entero | 20 | 1 | sólo «con barrido permitido, un registro muerto … se retira con sus claves» |
| 2 · sólo la guarda `sweepPermitted &&` retirada | 21 | 0 | **nada** |
| 3 · `const sweepPermitted = true` (el sondeo deja de leerse) | 20 | 1 | sólo «sin permiso de barrido … queda en disco (control negativo)» |

**Lo que la anulación 2 enseña, y no era obvio antes de medir:** para un registro que declara
su `pidDomain`, la guarda `sweepPermitted &&` es redundante, porque el permiso ya viaja por
`sweepDomain = sweepPermitted ? await currentPidDomain(…) : ''` y `recordInPidDomain(record, '')`
es falso cuando el registro declara un dominio. Es la forma de la referencia (`d=l?await HP():""`,
`lpn(h,d)`), no un defecto del porte. La guarda sí carga peso en un registro SIN `pidDomain`
en linux (ahí `lpn` devuelve `true` por defecto). El control negativo mide por tanto «el permiso
gobierna», no «esta conjunción concreta», y la anulación que lo prueba es la 3.

Métrica: conteo `pass`/`fail`/`expect()` que imprime `bun test` sobre este único archivo, con el
módulo anulado por sustitución literal.
Ciega a: un pid reciclado entre `child.exited` y la lectura (probabilidad despreciable, no cero);
a la rama por storage de `retireDeadRecord` (`storageBackendPin` inactivo en la prueba); y a
plataformas distintas de la de este contenedor, aunque la prueba fija `pidDomain` justo para no
depender de la rama por plataforma de `recordInPidDomain`.
