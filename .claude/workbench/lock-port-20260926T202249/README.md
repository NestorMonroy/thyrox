# Extracción del lock del ejecutable 2.1.282 — el origen del porte

Fuente: `_references/claude-code-bin/2.1.282/bunfs-root/chunk-bzev8hcq.js`
(MANIFEST: 23 201 bytes, sha256 `99b13193…`). Es `proper-lockfile` empaquetado.

| Archivo | Cómo se obtuvo |
|---|---|
| `symbols-ci-dIo-vm.txt` | `bin/binary symbol chunk-bzev8hcq.js ci dIo vm` — 3 de 3 |
| `symbols-lockfile-module.txt` | `bin/binary symbol chunk-bzev8hcq.js ot Ze Ve ze ct ft lt` — 7 de 7 |
| `chunk-bzev8hcq.reflow.js` | `bin/binary reflow chunk-bzev8hcq.js --root _references/claude-code-bin/2.1.282/bunfs-root --out …` (14 → 643 líneas). `--root` se añadió en este mismo pase: antes `reflow` sólo leía el ejecutable VIVO, cuyos chunks llevan otros nombres |
| `callers-ci.txt` | quién llama a `ci` en todo el corpus, con sus opciones |

## Las funciones, con su línea en `chunk-bzev8hcq.reflow.js`

| Símbolo | Línea | Qué hace | Porte |
|---|---|---|---|
| `ne` | 465 | ruta del lock: `lockfilePath` o `<archivo>.lock` | `lock_path()` |
| `Pe` | 467 | resuelve `realpath` del archivo protegido | `Path.resolve()` |
| `De` | 469 | **adquirir**: `mkdir` atómico; `EEXIST` → si `stale<=0` ELOCKED; si no, `stat`: fresco → ELOCKED, viejo → `nt` y reintenta con `stale:0` (un solo robo) | `_try_acquire()` |
| `rt` | 490 | huérfano ⇔ `mtime < ahora − stale` | `_is_stale()` |
| `nt` | 492 | retira el lock (`rmdir`), `ENOENT` no es error | `_remove()` |
| `pe` | 496 | **latido**: cada `update` hace `stat`; si falta, o la `mtime` no es la que escribió, o pasó `stale` sin renovar → ECOMPROMISED; si no, `utimes` | hilo `_heartbeat()` |
| `Fe` | 514 | comprometido: marca `released`, lo quita del registro, llama `onCompromised` | `Lock.compromised` + aviso |
| `Nt` | 516 | **lock()**: `stale` 10 s por defecto, mínimo 2 s; `update` = `stale/2` acotado a [1 s, `stale/2`]; reintentos con `tt.operation` | `acquire()` |
| `it` | 538 | **unlock()**: ENOTACQUIRED si no es tuyo | `Lock.release()` |
| `Pt` | 546 | **check()**: existe y no es huérfano | `check()` |
| `Dt(...)` | 556 | al salir el proceso retira los locks propios | `atexit` |
| `kt`/`It` (`Ze`) | 446 | precisión de `mtime` (s o ms) del sistema de archivos | se usa `st_mtime_ns` |
| `ze`/`Ve` | — | reintentos: `retries` 10, `factor` 2, `minTimeout` 1000 ms | `retries`, `min_wait_s` |
| `vm` | (símbolo) | al soltar: `ERELEASED`/`ENOTACQUIRED` → aviso «the locked section may have run without exclusivity» | mismo aviso |

Valores que usan los llamadores reales (`callers-ci.txt`): `stale: 60000`,
`update: 5000`. Son los defaults del porte.

## Divergencias declaradas

1. **Dueño en el lock.** El ejecutable deja el directorio vacío y decide la
   vida sólo por el latido. El porte escribe `owner.json` (`run_id`,
   `step_id`, `pid`, `host`, `acquired_at`) dentro: soltar es
   `unlink(owner.json)` + `rmdir`.
2. **No se roba a un dueño vivo.** Ante un lock huérfano por latido cuyo
   dueño es de ESTE host y su pid vive, el ejecutable lo robaría; el porte
   rehúsa con ELOCKED, motivo «dueño vivo sin latido», y adjunta la sonda
   `stdin_probe` de ese pid. Colgado no es muerto: se verifica antes de
   recuperar (directiva del ejecutor 2026-09-26).
3. **`SIGKILL`**: ni el ejecutable ni el porte retiran el lock; lo recupera
   el umbral `stale`.
