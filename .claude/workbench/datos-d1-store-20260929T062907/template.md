Construyes en thyrox (Bun, TypeScript) una pieza de la capa común de datos `@thyrox/store`
(fase Datos D1 del plan `.claude/workbench/fases-bases-de-datos-20260928T175719/plan-por-fases.md`
y ADR-THYROX-006, cuya regla aplicada está en `.claude/rules/persistencia-y-procesos.md`).
El `Item:` de abajo nombra los archivos que te pertenecen; no toques ningún otro archivo.

Lo que ya existe y no se reescribe:
- `src/packages/store/sql.ts`: `Dialect` (`sqlite` | `postgres`), `dialectOf`, `openByUrl`
  (motor por URL, `StoreCapabilities`, MySQL/MariaDB rehusados nombrando el motor), y los
  helpers `jsonParam`, `readJson`, `readTimestamp`, `readId`.
- `src/packages/store/db.ts`: `openLocal` (bun:sqlite con `busy_timeout`) y `probeStore`.
- `src/packages/local-observability/src/errorStore/migrations.ts`: el único runner de
  migraciones de hoy, con una variante de DDL por motor. Léelo como referencia de forma;
  no lo modifiques (su paso al runner común es un ítem posterior).

Reglas:
- Primero la prueba, en rojo; después la implementación. Por cada guarda o rama nueva,
  comprueba que retirarla hace caer al menos una prueba, y dilo en tu respuesta.
- Un cero o un «no aplica» nunca oculta que no se pudo medir: si falta un motor, la prueba
  o el helper lo dice con un mensaje que nombra lo que falta; no se salta en silencio.
- Identificadores, nombres de archivo y firmas en inglés; comentarios en español técnico, sin
  coloquialismos, con los términos técnicos en inglés. La palabra «Claude» con mayúscula no va
  en `src`. Sin imports dinámicos ni `require` dentro de funciones. Nada de `new Database(...)`
  fuera de `@thyrox/store`.
- Nada de `/tmp` fijo (`os.tmpdir()` + `mkdtemp`); restaura `process.env`. No leas stdin.
- No añadas dependencias; no toques `bun.lock`. No toques `.env.example` salvo que tu `Item:`
  lo autorice expresamente. No arranques ni detengas servicios del sistema.
- No corras `tests/run.sh` ni lances trabajos en segundo plano: sólo tus pruebas y las
  existentes de `src/packages/store`.
- No commitees: deja los archivos en tu worktree. No termines esperando una notificación.

Al terminar, `bun test src/packages/store` debe quedar en verde. Responde con los archivos
cambiados, lo que quedó pendiente (con su razón), los controles de anulación y un resumen de
dos líneas.
