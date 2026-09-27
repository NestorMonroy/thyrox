# `getPlatform` y la detección de WSL, contra 2.1.283

Qué se preguntó: `@thyrox/storage` usaba un `getPlatform` sustituto que
colapsaba WSL en `linux`. ¿Qué hace la fuente?

## Cómo se extrajo

```bash
bash bin/binary literal /proc/version          # literal-proc-version.txt
bash bin/binary symbol chunk-fmsbxtrp.js MYn DYn S p
bash bin/binary symbol chunk-gpsyc3w1.js Ob
```

`literal` se escribió para esta pregunta: la primera búsqueda con `rg`
listó 4 chunks y el corpus tiene 5; `rg` salta sin avisar un chunk que toma
por binario (`chunk-gpsyc3w1.js` lleva 89 líneas con byte NUL).

## Lo que dice la fuente (2.1.283)

- `S.getPlatform` (`chunk-fmsbxtrp.js`): en Linux, `WSL_DISTRO_NAME` o
  `WSL_INTEROP` en el entorno deciden `wsl` ANTES de leer `/proc/version`; si
  no, `microsoft` o `wsl` en el kernel.
- `Ob` (`chunk-gpsyc3w1.js`): la versión de WSL con `/WSL(\d+)/i`, y `"1"` si
  sólo dice `microsoft` — coincide con `getWslVersion` de `@thyrox/config`.

## Lo que cambió

`@thyrox/config/platform.ts` ganó el paso del entorno
(`__tests__/platformWsl.test.ts`, 4 casos) y `storage` importa ese original.

## Lo que no se porta, declarado

2.1.283 organiza esto como una clase con fuentes inyectadas (`platform`,
`env`, `readProcVersion`) y un `prime()` asíncrono que lee `/proc/version`
antes de usarlo. El porte conserva la función memoizada: la inyección la
cubren `setFsImplementation` y `process.env`, y `prime` no tiene consumidor
en este árbol.

`rename_identifiers.ts` es el renombrador por nodo del AST con que se tradujo
`bin/binary.ts`; su promoción a `bin/` es la tarea del gate de identificadores
TypeScript.

## Flujo, no literal (bin/binary references)

`references chunk-fmsbxtrp.js p` → 5 usos, todos en su propio chunk: los
cinco envoltorios de módulo (`pBo`→`.prime`, `O`→`.getPlatform`,
`c9e`→`.getWslVersion`, `$hn`→`.getLinuxDistroInfo`, `fBo`→`.getMacOSMajorVersion`).
`p()` es el único detector `S` del proceso; lee `/proc/version` UNA vez
(`kernelString`, ya en minúsculas) para getPlatform y getWslVersion.

`references … pBo` → 1 uso: `init()` (`chunk-g8dwzm36.js` `A`) lo corre en
`Promise.all([NRe(),Mne(),pBo(),UUo()])`. `prime()` lee `/proc/version` de
forma asíncrona y anula `platform` y `wslVersion`: la lectura síncrona queda
de respaldo para quien pregunte antes del arranque.

`references … c9e` → 4 usos: el recurso de telemetría (`st`, `wsl.version`
sólo si la plataforma es wsl) y el entorno de diagnóstico (`wD`, `CCe`).
`references … O` → 753 usos en 139 chunks.

Salidas: `references-*.txt`, `symbol-*.js`.
