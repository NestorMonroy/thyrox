# TASK-THYROX-0309

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p4-repl-runtime-ports.md`

## La tarea

## [53] TASK-THYROX-0309 — Reemplazar cada sustituto por la implementación original, paquete por paquete

Status on board: in_progress

Un sustituto es una copia local, en internal/pendingCrossPackageDeps.ts de un paquete, de un símbolo que otro paquete @thyrox ya implementa. Donde importar el original no cierra un ciclo de módulos, la copia sobra: se importa el original y se borra la copia. Antes de importar, el original se contrasta con la fuente (binario de referencia) y se corrige si diverge; si el original tiene prueba de fidelidad se reutiliza, si no se escribe. Lo que cerraría un ciclo se queda como sustituto declarado. Ratchet: tests/verify/test_stand_ins_cleared.py (CLEARED). Pendientes: daemon, memory, ide, provider, local-observability, bridge.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- ratchet tests/verify/test_stand_ins_cleared.py: existe, CLEARED = (mcp-runtime, app-host, server, headless-sdk, storage) — `cat tests/verify/test_stand_ins_cleared.py`; traído por c0da1b35a, ampliado hasta 77a1dad57 — `git log --oneline -- tests/verify/test_stand_ins_cleared.py`
- ratchet en verde: «5 paquete(s) limpio(s), 0 símbolo(s) importable(s) sin retirar (alcance medido: 104 importable(s) en todo el árbol)», exit 0 — `python3 tests/verify/test_stand_ins_cleared.py`
- detector src/verify/check_stand_ins.py con su suite: 19 ok, 0 falla(s) — `python3 tests/verify/test_check_stand_ins.py`
- los 104 importables sin ciclo caen exactamente en los seis paquetes que la tarea lista como pendientes: bridge 52, local-observability 20, provider 11, ide 10, daemon 6, memory 5 — script Python sobre `verify.check_stand_ins.shadowed(ROOT/'src')` agrupando por paquete y `s.cycle`
- sustitutos aún presentes en los seis: src/packages/{bridge,local-observability,ide,memory,daemon,provider}/src/internal/pendingCrossPackageDeps.ts (2016/810/987/663/471/273 líneas) — `git ls-files 'src/packages/*/src/internal/pendingCrossPackageDeps.ts'`; `wc -l`
- ningún commit cita la tarea — `git log --oneline --grep='TASK-THYROX-0309'` → 0
- sustitutos pendientes sólo tocados por renombres/comentarios/imports puntuales (f081cc6d0 isEnvTruthy/isBareMode, bdcff445d concurrentSessions en bridge), no por un retiro por paquete — `git log --oneline -3 -- src/packages/<p>/src/internal/pendingCrossPackageDeps.ts`

## Lo que falta — tu alcance

- daemon: importar del original los 6 símbolos sin ciclo de su pendingCrossPackageDeps.ts, borrar las copias, añadir 'daemon' a CLEARED
- memory: ídem con sus 5 importables, añadir 'memory' a CLEARED
- ide: ídem con sus 10 importables, añadir 'ide' a CLEARED
- provider: ídem con sus 11 importables, añadir 'provider' a CLEARED
- local-observability: ídem con sus 20 importables, añadir 'local-observability' a CLEARED
- bridge: ídem con sus 52 importables, añadir 'bridge' a CLEARED
- por cada símbolo importado: contrastar el original contra _references/claude-code-bin/2.1.283 y reutilizar o escribir su prueba de fidelidad; lo que cierre ciclo queda declarado como sustituto (el detector ya los separa: bridge 54, local-observability 29, daemon 14, ide 13, memory 8, provider 4 con ciclo)
- condición de cierre medible: `python3 tests/verify/test_stand_ins_cleared.py` con 11 paquetes en CLEARED y 0 importable(s) en todo el árbol

## Archivos que te pertenecen

- src/packages/daemon/src/internal/pendingCrossPackageDeps.ts
- src/packages/memory/src/internal/pendingCrossPackageDeps.ts
- src/packages/ide/src/internal/pendingCrossPackageDeps.ts
- src/packages/provider/src/internal/pendingCrossPackageDeps.ts
- src/packages/local-observability/src/internal/pendingCrossPackageDeps.ts
- src/packages/bridge/src/internal/pendingCrossPackageDeps.ts
- los módulos de cada paquete que importan de ./internal/pendingCrossPackageDeps (a redirigir al original)
- tests/verify/test_stand_ins_cleared.py (CLEARED)

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- tests/verify/test_stand_ins_cleared.py — medido: 5 limpios, 0 ofensores, 104 importables en el árbol, exit 0
- tests/verify/test_check_stand_ins.py — medido: 19 ok, 0 falla(s)
- por escribir: prueba de fidelidad contra 2.1.283 para cada original sin prueba que se importe; `bun test` del paquete tocado tras cada retiro

## Dependencias

- ninguna tarea; cada paquete es un paso independiente en orden sugerido por tamaño: memory, daemon, ide, provider, local-observability, bridge
