# TASK-THYROX-0507

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p2-uds-messaging.md`

## La tarea

## [256] TASK-THYROX-0507 — UDS F4c-2f-4h-1 — portar D3 (listar sesiones vivas) de chunk-qcy58j4w.js sobre registrySweep

Status on board: in_progress

D3 no está portado (0 definiciones; sólo es dependencia inyectada en renameNotice), aunque F4c-2f-4d lo nombraba. Gkr lo necesita para resolver colisiones de nombre al arrancar. D3(scope, {rejectUnreadable}) lista los registros (F), filtra los vivos por dominio de pid y por identidad del proceso (ua/x_), y borra los muertos si barrer está permitido (TCe, lpn, Nh, V). Portarlo en TDD sobre registrySweep.ts.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- D3 portado como `listAllLiveSessions(storage?, {rejectUnreadable})`: src/packages/local-observability/src/uds/liveSessionRegistry.ts:367-388 — `git grep -n rejectUnreadable -- src`; cuerpo cotejado línea a línea con `async function D3(e,n)` de /home/user/thyrox/_references/claude-code-bin/2.1.283/bunfs-root/chunk-qcy58j4w.js (línea 12, `grep -n 'async function D3'`)
- F (listar registros) → `readAllRawSessionRecords`: liveSessionRegistry.ts:322-335; we/G3o/YOt → :338-351
- ua → `isProcessAlive` liveSessionRegistry.ts:73; x_ → `isSameProcessStartOrUnknown` :300; Nh → `isProcessGone` processIdentity.ts:133; TCe → `isRegistrySweepPermitted` registrySweep.ts:181; lpn → `recordInPidDomain` registrySweep.ts:195; ZKn → `sweepDeadPidKeys` registrySweep.ts:242 — `grep -n '^export' registrySweep.ts`
- V (retirar muerto, por storage o unlink) → `retireDeadRecord` liveSessionRegistry.ts:353-365
- Ubicación: el porte vive en liveSessionRegistry.ts y se apoya en registrySweep.ts por import (:46), no dentro de registrySweep.ts; la cabecera (:1-5) declara esa partición
- Commit que lo trajo: 8d2d70ab7 'Wire refusal restore, UDS client and shared state' — `git log --oneline -S'listAllLiveSessions' -- liveSessionRegistry.ts`; ningún commit cita TASK-THYROX-0507 ni 0489 — `git log --grep`
- Consumidor al arranque (Gkr): sessionRegistryAtLaunch.ts:136 `listLive: () => listAllLiveSessions()` — commits 7ae1b1dba, 6a4eb13e4, 6f98bd5cc
- Suite: src/packages/local-observability/src/uds/__tests__/udsLiveSessionRegistry.test.ts — `bun test` → 19 pass, 0 fail, 27 expect; `describe('listAllLiveSessions (D3)')` :101-119 con 3 casos (pid vivo sin token, dominio ajeno confiado, sin rejectUnreadable)

## Lo que falta — tu alcance

- Prueba del ramal de barrido de D3 (registro con pid muerto en el dominio propio, barrido permitido → archivo `<pid>.json` retirado y claves barridas via sweepDeadPidKeys): `git grep -n -i 'muert|dead|retire|sweep' -- udsLiveSessionRegistry.test.ts` → 0 líneas; el código existe (retireDeadRecord :353, rama :383-384) pero sin su mitad roja ni control de anulación
- Prueba del control negativo: barrido NO permitido (isRegistrySweepPermitted → false) deja el registro muerto en disco

## Archivos que te pertenecen

- src/packages/local-observability/src/uds/__tests__/udsLiveSessionRegistry.test.ts

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- bun test src/uds/__tests__/udsLiveSessionRegistry.test.ts (desde src/packages/local-observability): 19 pass / 0 fail; faltan 2 casos del ramal de barrido en el describe de D3

## Dependencias

- TASK-THYROX-0477 (registro de sesiones: registrySweep.ts y processIdentity.ts ya presentes, que es lo que D3 consume)
