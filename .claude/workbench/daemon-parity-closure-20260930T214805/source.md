# Fuente de verdad — cierre de paridad del daemon contra 2.1.283

## Qué ya existe (P0 de esta serie, medido 2026-09-30)

- Las tareas D1–D18 (TASK-THYROX-0512 … 0529) están cerradas, pero la tabla
  `/home/user/thyrox/.claude/workbench/pool-group6-daemon-parity/parity-map.tsv`
  (commit `333db3a0c`, 108 símbolos) da 58 `paridad`, 36 `parcial`, 11
  `ausente` y 3 `no-aplica`. Su columna `pendiente` es el único registro de lo
  que falta: léela completa, filtrando por el `pool_id` de tu ítem
  (`gawk -F'\t' '$1=="D7"'`).
- Posterior a la tabla: `2c4264fd5` ya cableó el log del supervisor (D6) y
  `PodmanWorkerManager` en `bgDaemon.ts`. No lo rehagas.
- La referencia: `/home/user/thyrox/_references/claude-code-bin/2.1.283/`
  (`chunk-92tvramn.js`, `chunk-ygx717jg.js`), y cada declaración ya extraída
  en `/home/user/thyrox/.claude/workbench/daemon-inventory-20260929T065202/refs/<chunk>/<símbolo>.js`.
  En esos chunks `d` es `logError`. Léelos con `sed -n`/`rg`; no ejecutes
  `bin/binary extract`.
- Regla de construcción: lo que existe y está completo se reutiliza; lo que
  está a medias se extiende sólo con lo que falta; lo que está en el dueño
  equivocado se corrige antes de duplicar. Ningún mecanismo paralelo.

## Por ítem

**config-gating — TASK-THYROX-0685 (D7 + D18).** `daemonConfig.ts` está
portado y probado y **nadie lo importa** (`git grep -l "from './daemonConfig"`
= 0). `runSupervisor` (`main.ts`) lanza una lista fija de un worker
(`remoteControl`). Cablear: tipos y número de instancias desde `daemon.json`
(Mr), feature gate de `remoteControl` (Ct), hot reload y sus umbrales (Tt).
D18: `main.ts` usa los sets de gating ya portados para bloquear
`list`/`status`, como la referencia (atención: en el binario `pV()` es un stub
que siempre da false; porta la conducta observable, y dilo).

**startup — TASK-THYROX-0686 (D5).** Falta: handshake yield→toma de control
(sólo existe el lado que responde), diferir el upgrade con workers ocupados,
los tres umbrales `Lr` (60000 ms configurable), `Nr`
(`upgradeBusyDeferCapMs`) y `Vr` (gracia extra al arrancar) en vez del
`graceMs` único, polling de desplazamiento, y el intento activo de
`daemon stop` que produce el outcome `timed-out` de `acquireDaemonLock`.

**workers — TASK-THYROX-0687 (D9 + D12).** Falta: `launchMode='exec'` y el
rastreo de `dispatch.source` en `WorkerSpawnConfig` (g7); las ramas de
clasificación de fase que `Ze` no porta; `Oe` como función propia (hoy inline
en `main.ts`: **no toques `main.ts`**; expón la función y di dónde se llamaría);
`Dt`; y los timers de la referencia sin equivalente nombrado (6 de 23).

**adoption — TASK-THYROX-0688 (D10 + D11 + D16 Je).** Falta: el barrido
archivo→roster de sockets huérfanos sin entrada (`adoptRunningPtyRecords` sólo
recorre roster→pid vivo); aplicar `sanitizeCliVersion` (existe en
`upgradeProbe.ts`) a lo que `roster.ts` persiste y expone; y la comparación de
versión stale como función propia en vez de inline.

**spare — TASK-THYROX-0689 (D15).** No existe el modo `--bg-spare` (AVo): el
hijo que espera el frame de claim autenticado y corre la instancia; sin él el
refill (I9n) sólo prewarmea `bg-pty-host`. Confirma y prueba que las variables
de entorno del claim se limpian tras leerlas (xt). La rama nueva de
`cli.tsx` sigue el patrón de las demás (import dinámico dentro de la rama) y
no debe activar nada en el arranque: la prueba
`src/packages/cli/__tests__/startupActivation.test.ts` tiene que seguir verde.

## Para todos

- Por cada símbolo que cierres, di qué fila de la tabla pasa a qué estado. Lo
  que decidas no portar se declara con su razón (divergencia, bloqueado por
  algo nombrado, o DESCONOCIDO con condición de cierre); nunca en silencio.
- Cada `catch` nuevo se clasifica como en la referencia (manejo esperado, log
  con nivel, `logError` o silencio intencional).
