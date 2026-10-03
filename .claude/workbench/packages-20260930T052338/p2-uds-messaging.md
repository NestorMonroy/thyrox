# p2-uds-messaging

## [196] TASK-THYROX-0448 — UDS F4 — protocolo y entrega: marcos de mensaje (en), cola de entrada de la sesión y sobre cross-session-message

Status on board: in_progress

Lectura por línea, validación, entrega al turno como <cross-session-message from=...>.

## [209] TASK-THYROX-0460 — UDS F4c-3..5 — acciones de control: peer_message_status, notify_when_idle/peer_idle_notice, yield/unyield artifact replies

Status on board: in_progress

Portar las acciones de control de be registradas por accepts/handle: F4c-3 peer_message_status (WRr, GRr, jRr, R1n, Cko), F4c-4 notify_when_idle y peer_idle_notice (qtr, aEn, Ytr, pqt, Ktr, ibt, Jtr), F4c-5 yield_artifact_replies, unyield_artifact_replies y artifact_replies_yielded (cno, uno, bno, dno, gno, hno, glr).

## [212] TASK-THYROX-0463 — UDS F4d — subsistema de mensajes entrantes (chunk-dv9ctjss.js)

Status on board: in_progress

Portar el resto de chunk-dv9ctjss.js de 2.1.283: mensajes retenidos (held/announced), recibos al par (sendPeerReceipt, kJr), cierre ordenado (R/dbt con plazo de 750 ms), disponibilidad (cbt/k7e), el rechazo C7e y la aceptación fbt que ze consume, y los ganchos onPeerHeld/onPeerHoldDropped/onPeerHoldReleased.

## [226] TASK-THYROX-0477 — UDS F4c-2f-4 — registro de sesiones de 2.1.283 (HH/eD, kv, Cut, eF/Vt, D3) sobre el que corren los flujos de renombre

Status on board: in_progress

Portar el registro de sesiones de 2.1.283 (chunk-t6pwageh.js: HH/eD con registeredName, formerNames, adoptions, restores, setRegisteredName, Cut, eF con Vt/updatePidFile; chunk-qcy58j4w.js: D3 listLive con sus pruebas de vivacidad) y decidir su relación con agent/concurrentSessions.ts, que es un porte anterior más simple. Es la dependencia real que F4c-2f-2 recibe inyectada.

## [256] TASK-THYROX-0507 — UDS F4c-2f-4h-1 — portar D3 (listar sesiones vivas) de chunk-qcy58j4w.js sobre registrySweep

Status on board: in_progress

D3 no está portado (0 definiciones; sólo es dependencia inyectada en renameNotice), aunque F4c-2f-4d lo nombraba. Gkr lo necesita para resolver colisiones de nombre al arrancar. D3(scope, {rejectUnreadable}) lista los registros (F), filtra los vivos por dominio de pid y por identidad del proceso (ua/x_), y borra los muertos si barrer está permitido (TCe, lpn, Nh, V). Portarlo en TDD sobre registrySweep.ts.

## [238] TASK-THYROX-0489 — UDS C — módulo cliente y de recibos de 2.1.283 (chunk-qcy58j4w.js completo: envío a pares, recibos, créditos, D3 listado de pares vivos)

Status on board: in_progress

Portar chunk-qcy58j4w.js completo (Bf, TB, Ako, lsn, WOt, csn, LRr, Cko, NRr, $Rr, GOt, FRr, Rko, URr, zOt, R4e, x4e, A1n, C1n, Mae, I4e, BRr, dsn, MV, cG, jRr, R1n, VOt, WRr, GRr, kee, iat, qOt, zRr, KOt, G3o, YOt, D3, DV, VRr, qRr, XOt). Cubre F4c-3 (peer_message_status: WRr, GRr, jRr, R1n, Cko) y el D3 real del registro (listado de pares con vivacidad), y alimenta F5.

## [197] TASK-THYROX-0449 — UDS F5 — cliente (udsClient.ts): enviar a un par uds:<ruta> con su clave, y descubrimiento de pares (ListAgents)

Status on board: pending

Sustituye el stub udsClient.ts; SendMessage con to: uds:...; lectura de claves publicadas.

## [321] TASK-THYROX-0600 — UDS F5b — ListAgents de 2.1.283 (ListPeers alias): chunk-8xzbdmg9 + chunk-mk0qbzxv + Ws de chunk-fhcnpt13

Status on board: in_progress

getListPeersTool devuelve null (BuiltInToolsProvider.ts:144). Portar la herramienta ListAgents (alias ListPeers, chunk-8xzbdmg9.js), su núcleo listAllPeers/formatForModel/formatForUser/buildSubagentExtras (chunk-mk0qbzxv.js, reexportado por chunk-1csd5fav.js) y la compuerta Ws/Vee/$Mt (chunk-fhcnpt13.js) con THYROX_CODE_HARBOR_KITE. Dependencias sin puerto (chunk-neeyxbak remoto/bridge, 0rzp9bzr IY/eC, a84ya7ak iy) se inyectan y se declaran. Prueba: dos procesos bin/cli reales, uno lista al otro.
