```yml
created_at: 2026-04-11 20:41:54
wp: thyrox-commands-namespace
type: Decision Analysis
topic: Nombre del comando Phase 4 — /thyrox:spec vs /thyrox:structure
status: Pendiente decisión de usuario
```

# Decisión: `/thyrox:spec` vs `/thyrox:structure`

## Origen del conflicto

| Fase | Decisión | Fuente |
|------|---------|--------|
| Phase 1 ANALYZE §UC-001 | `/thyrox:spec` | Nota: "El user usa `:spec` (no `:structure`) — más corto y más descriptivo que `:structure`" |
| Phase 3 PLAN In-Scope | `/thyrox:structure` (`commands/structure.md`) | Lista de archivos a crear, aprobada en gate SP-03 |
| Phase 4 STRUCTURE spec | `/thyrox:structure` | Hereda de Phase 3 |

---

## Opción A — `/thyrox:structure` (decisión Phase 3)

**Implementación:** `commands/structure.md` → `/thyrox:structure`

### Argumentos a favor

1. **Consistencia con nombres de fase** — El patrón es 1:1 entre nombre de phase y nombre de comando:

   | Phase | Nombre fase | Comando |
   |-------|------------|---------|
   | 1 | ANALYZE | `/thyrox:analyze` ← igual |
   | 2 | SOLUTION_STRATEGY | `/thyrox:strategy` ← abreviado igual |
   | 3 | PLAN | `/thyrox:plan` ← igual |
   | **4** | **STRUCTURE** | **`/thyrox:structure`** ← igual |
   | 5 | DECOMPOSE | `/thyrox:decompose` ← igual |
   | 6 | EXECUTE | `/thyrox:execute` ← igual |
   | 7 | TRACK | `/thyrox:track` ← igual |

   Romper este patrón en Phase 4 crea una inconsistencia en la interfaz pública.

2. **Ya está en el plan aprobado (SP-03)** — Cambiar requiere modificar el plan aprobado y las SPECs ya escritas.

3. **Semántica de proceso** — "Structure" describe QUÉ HACES en la fase (estructurar / especificar). "Spec" describe el ARTEFACTO que produce (la spec).

4. **Navegabilidad en menú** — Al escribir `/thyrox:s`, aparecen: strategy, structure, track. Si fuera `:spec`, aparecen: spec, strategy, track. Ambos tienen 3 opciones con `s`.

### Argumentos en contra

1. **El usuario lo pidió como `:spec`** — La preferencia explícita fue registrada en Phase 1.
2. **`:structure` es más largo** — 9 caracteres vs 4 caracteres. Más tiempo de escritura.
3. **Ambigüedad conceptual** — "Structure" en Claude Code puede referirse a estructura de directorios, estructura de código, etc. "Spec" es inequívoco en el contexto de SDLC.

---

## Opción B — `/thyrox:spec` (preferencia Phase 1)

**Implementación:** `commands/spec.md` → `/thyrox:spec`

### Argumentos a favor

1. **Preferencia del usuario** — Registrada explícitamente en Phase 1: "más corto y más descriptivo que `:structure`".
2. **Más corto** — 4 chars vs 9 chars.
3. **Claridad semántica** — "spec" en SDLC = "especificación de requisitos" = exactamente lo que produce la Phase 4.
4. **Diferenciación intencional** — La Phase 4 es la única que no sigue el patrón nombre-fase porque produce un artefacto con nombre propio (requirements-spec). Usar `:spec` refleja eso.

### Argumentos en contra

1. **Rompe la consistencia** — El único comando en la interfaz `/thyrox:*` que no deriva del nombre de su fase.
2. **Requiere actualizar el plan aprobado** — Phase 3 SP-03 ya fue aprobado con `:structure`.
3. **Impacto en SPEC-002, SPEC-003, dependencias** — El mapeo de command files necesita actualizarse en spec, checklist, y plan.

---

## Opción C — Alias (ambos)

**Implementación:** `commands/spec.md` Y `commands/structure.md`, ambos invocan el mismo skill.

### Argumentos a favor

1. **Sin conflicto** — Tanto el patrón de consistencia como la preferencia del usuario quedan satisfechos.
2. **Backward compat automática** — Si alguien escribe `:structure` por consistencia mental con el nombre de fase, funciona.

### Argumentos en contra

1. **Duplica archivos** — 2 command files que hacen lo mismo = confusión en el menú `/` (aparecen dos entradas distintas para Phase 4).
2. **Violación de Single Authority** — Dos fuentes de verdad para el mismo comando.
3. **Scope creep** — Agrega un archivo fuera del plan original.

---

## Análisis de impacto por opción

| Factor | Opción A (`:structure`) | Opción B (`:spec`) | Opción C (alias) |
|--------|------------------------|-------------------|-----------------|
| Consistencia del patrón | ✅ Alta | ❌ Rompe patrón | ⚠️ Ambigua |
| Preferencia del usuario | ❌ Ignora Phase 1 | ✅ Satisface | ✅ Satisface |
| Archivos a modificar | 0 cambios adicionales | +1 rename + actualizar spec | +1 archivo extra |
| Impacto en menú `/` | 1 entrada Phase 4 | 1 entrada Phase 4 | 2 entradas Phase 4 |
| Impacto en session-start.sh | _phase_to_command retorna `:structure` | _phase_to_command retorna `:spec` | _phase_to_command retorna uno de los dos |
| Impacto en Phase 3 plan aprobado | Sin impacto | Requiere nota de cambio | Sin impacto |

---

## Recomendación del análisis

**Si el criterio principal es consistencia:** → Opción A (`:structure`)

**Si el criterio principal es preferencia explícita del usuario:** → Opción B (`:spec`)

**Opción C no se recomienda** — duplica sin resolver el conflicto conceptual.

**Sugerencia:** Dado que el patrón 1:1 (nombre-fase → nombre-comando) es la regla que
aplica a los otros 6 comandos, mantener `:structure` evita una excepción que requeriría
documentación adicional. La preferencia de Phase 1 fue registrada antes de que existiera
el contexto completo del patrón de nomenclatura.

---

## Decisión pendiente

- [ ] Usuario decide: **Opción A** (`:structure`) · **Opción B** (`:spec`) · **Opción C** (alias)
- [ ] Si Opción B: actualizar `commands/structure.md` → `commands/spec.md`, SPEC-002, session-start.sh Cambio 1 (`/thyrox:structure` → `/thyrox:spec`)
- [ ] Si Opción A: confirmar, sin cambios adicionales
