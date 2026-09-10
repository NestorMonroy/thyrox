```yml
work_package_id: 2026-04-14-09-13-51-context-migration
closed_at: 2026-04-14 22:38:05
project: THYROX
source_phase: Phase 7 — TRACK
total_lessons: 5
```

# Lessons Learned: context-migration (FASE 35)

## Propósito

Capturar los aprendizajes de la migración `.claude/context/` → `.thyrox/context/`
y las actividades relacionadas de la sesión (nomenclatura, knowledge base, hooks).

---

## Lecciones

### script-sin-registrar — Script creado sin registrar en settings.json

**Qué pasó**
`validate-session-close.sh` existía y funcionaba en aislamiento pero no ejecutaba
al cerrar sesión. El Stop hook solo llamaba a `stop-hook-git-check.sh`.

**Raíz**
El ciclo de trabajo fue: crear/mejorar script → asumir que estaba wired. Sin verificación.

**Fix aplicado**
Agregar `validate-session-close.sh` al Stop hook en `settings.json`.

**Regla**
Crear un script y registrarlo son dos pasos obligatorios. Un script sin `settings.json`
no existe para el sistema. → Patrón P-001: Validate-Wire-Test.

---

### referencias-abstractas — Bulk-sed contaminó docs de plataforma con paths del proyecto

**Qué pasó**
El sed de migración se aplicó a `.claude/references/` que son docs de plataforma abstractos.
Resultaron con paths THYROX-específicos en lugar de genéricos.

**Raíz**
El scope del sed fue todo el repo, sin distinguir semántica de archivo (config del proyecto
vs docs de plataforma).

**Fix aplicado**
Revertir paths en 8 archivos de `.claude/references/`.

**Regla**
Antes de bulk-sed, clasificar archivos por semántica, no por contenido. `.claude/references/`
es documentación de plataforma abstracta — nunca actualizar con paths del proyecto.

---

### env-var-sesion-activa — settings.json env vars no propagan a subagentes de sesión activa

**Qué pasó**
`CLAUDE_STREAM_IDLE_TIMEOUT_MS` aumentado de 120 000 a 420 000 ms en sesión activa.
Los subagentes lanzados en la misma sesión heredaron el valor viejo.

**Raíz**
Los subagentes heredan variables de entorno del proceso padre al momento de inicio de sesión,
no de `settings.json` en tiempo de ejecución.

**Fix aplicado**
El cambio toma efecto en la siguiente sesión nueva. En sesión activa no hay solución.

**Regla**
Cambios a `env` en `settings.json` requieren una nueva sesión para propagarse.
No son hot-reloadable.

---

### bound-agente-timeout — Instrucciones de agente sin scope causan stream idle timeout

**Qué pasó**
Agente deep-review `hook-authoring.md` falló con stream idle timeout (~296 s) siendo el
único de 13 agentes en paralelo que falló. Instrucción: "leer TODOS los scripts" → 45 tool_uses.

**Raíz**
Sin bound, el agente aplicó la instrucción literalmente acumulando contexto hasta que
la generación final causó idle > 120 000 ms.

**Fix aplicado**
Aumentar timeout + crear `bound-detector.py` como PreToolUse hook. Ver ADR `adr-bound-detector-preToolUse.md`.

**Regla**
Toda instrucción de agente con "todos", "cada", "cualquier" necesita un bound explícito.

---

### guidelines-no-cargadas — .instructions.md en .claude/guidelines/ no auto-cargadas

**Qué pasó**
CLAUDE.md dice "guidelines/ ← Directivas siempre cargadas" pero ningún hook, script
ni mecanismo Claude Code las carga. El session-start hook lee `.claude/skills/`, no `guidelines/`.

**Raíz**
El sistema fue diseñado como "siempre cargadas" pero nunca se implementó el mecanismo
de carga. Los archivos existen pero no tienen efecto en las sesiones.

**Fix aplicado**
Pendiente — se documenta en FASE 36 como TD.

**Regla**
"Siempre cargadas" requiere un mecanismo explícito: `@path` imports en CLAUDE.md,
hook de sesión que los inyecte, o moverlos a `.claude/rules/`.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Validate-Wire-Test | script-sin-registrar | Checklist al crear scripts: create → register → verify |
| Bound explícito | bound-agente-timeout | bound-detector.py como PreToolUse hook activo |

---

## Qué replicar

- **Migración con git mv**: Preservar historial es crítico en migraciones de repositorio.
  Siempre `git mv` sobre `mv`. Ver patrón `git-mv-migracion.md`.

- **Knowledge base estructurada**: `lessons/` + `patterns/` + `errors/` como sistema formal
  para que el conocimiento persista entre sesiones. FASE 35 lo creó retroactivamente — en
  futuros WPs se crea desde el inicio (Phase 7 TRACK lo popula).

- **Análisis Ishikawa persistido**: El análisis del timeout se generó en sesión anterior
  pero no se guardó. Con el nuevo Paso 8 en `diagrama-ishikawa.md`, esto no vuelve a ocurrir.

---

## Deuda pendiente

| ID | Descripción | Prioridad | WP sugerido |
|----|-------------|-----------|-------------|
| TD-037 | `agents/*.yml` tienen `model:` prohibido per README del registry | media | registry-cleanup |
| TD-038 | `webpack-expert` no tiene .yml en registry (sí en .claude/agents/) | media | registry-cleanup |
| TD-039 | No existe mecanismo de sync entre Flow A (agents) y Flow B (templates) | baja | registry-evolution |
| TD-040 | `.instructions.md` no cargadas por ningún mecanismo — "siempre cargadas" es aspiracional | alta | guidelines-loading |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
