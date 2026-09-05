```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis (Phase 1: ANALYZE)
Tema: Cómo spec-kit organiza el trabajo — respuestas a ERR-023
```

# Análisis: Cómo spec-kit resuelve lo que THYROX tiene confuso

## La respuesta de spec-kit a cada pregunta de ERR-023

### ¿Concepto de "sesión" o "work-log"?

**spec-kit NO tiene work-logs.** No tiene concepto de sesión. El progreso se trackea con checkboxes en tasks.md: `- [ ]` → `- [X]`. Eso es todo.

### ¿Dónde vive TODO el trabajo de una feature?

**UN directorio por feature:**

```
specs/001-feature-name/
├── spec.md              ← QUÉ (requirements)
├── plan.md              ← CÓMO (arquitectura + research)
├── research.md          ← Investigación de unknowns
├── data-model.md        ← Entidades
├── contracts/           ← Interfaces
├── tasks.md             ← Tasks con checkboxes
├── quickstart.md        ← Escenarios clave
└── checklists/          ← Quality validation
    ├── requirements.md
    ├── ux.md
    └── security.md
```

**No hay separation entre "analysis" y "epic".** Todo está en UN lugar. La spec ES el análisis. El plan ES la strategy. Las tasks SON el decompose. No hay duplicación.

### ¿Qué es compartido (repo-wide) vs feature-specific?

- **`/memory/constitution.md`** → Compartido. UNO por repo. Principios que aplican a TODAS las features.
- **`specs/{feature}/`** → Todo lo demás. UNO por feature.

### ¿Cómo evita archivos dispersos?

Cada comando (specify, plan, tasks, implement) trabaja dentro de `specs/{feature}/`. El path se resuelve UNA vez y se pasa a todos los scripts. No hay análisis en un lado y tasks en otro.

### ¿Hay circularidad?

**NO.** spec-kit no se mejora a sí mismo. Constitution se amenda manualmente. El producto y el proceso de mejora son cosas separadas.

---

## Lo que THYROX hace diferente (y mal)

| Aspecto | spec-kit | THYROX | Problema |
|---------|----------|--------|----------|
| **Work por feature** | `specs/{feature}/` — todo junto | `analysis/` suelto + `epics/` separado | Archivos dispersos, difícil seguir |
| **Análisis** | Dentro de `specs/{feature}/research.md` | En `context/analysis/` (18 archivos sueltos) | No hay link feature → análisis |
| **Tasks** | Dentro de `specs/{feature}/tasks.md` | En `context/analysis/spec-kit-adoption-tasks.md` | Tasks fuera de su feature |
| **Progreso** | Checkboxes en tasks.md `[ ]→[X]` | ROADMAP.md + work-logs + commits | 3 lugares para lo mismo |
| **Constitution** | `/memory/constitution.md` (1 archivo) | 5 lugares dispersos + template sin instanciar | No hay fuente canónica |
| **Sessions** | No existen (innecesarias) | Work-logs obligatorios (ADR-012) | Overhead sin valor claro |
| **Circularidad** | No existe | El SKILL se gestiona con el SKILL | Confusión ERR-023 |

---

## Lo que esto significa para THYROX

### 1. Simplificar: UN directorio por trabajo

En vez de `context/analysis/` + `context/epics/` separados, cada trabajo debería tener UN directorio como spec-kit:

```
context/epics/2026-03-28-covariance/
├── analysis.md          ← Phase 1 output (antes: context/analysis/covariance-analysis.md)
├── strategy.md          ← Phase 2 output (antes: context/analysis/covariance-solution-strategy.md)
├── structure.md         ← Phase 4 output (antes: context/analysis/covariance-structure.md)
├── tasks.md             ← Phase 5 output (antes: context/analysis/covariance-tasks.md)
└── (implementación trackeada con checkboxes en tasks.md)
```

### 2. Work-logs: reconsiderar

spec-kit no los necesita porque tasks.md trackea progreso con checkboxes. ¿THYROX realmente los necesita?

Si tasks.md tiene `- [ ] [T-001] Description → - [x] [T-001] Description`, eso ES el tracking de progreso. Un work-log separado es duplicación.

**Posible solución:** Work-log solo al CERRAR una sesión (resumen), no como tracking continuo. O eliminarlo y usar solo tasks.md checkboxes + git log.

### 3. Constitution: UN lugar

Copiar concepto de spec-kit: `/memory/constitution.md` (o en nuestro caso `context/constitution.md`). UNO por proyecto. Los "Key Principles" de SKILL.md se eliminan y se linkea a constitution.md.

### 4. Resolver circularidad

El SKILL.md de THYROX es el PRODUCTO. Cuando lo mejoramos, estamos en paso 6 (Iterate) del Skill Creation Process de Anthropic. No debemos usar las 7 fases del SKILL para mejorar el SKILL — eso es circular.

**Regla:** Las 7 fases de SKILL.md son para gestionar PROYECTOS de usuarios. La mejora del SKILL mismo sigue el proceso de Anthropic (6 pasos: understand → plan → init → edit → package → iterate).

---

## Acciones propuestas

1. **Instanciar constitution.md** en `context/constitution.md`
2. **SKILL.md "Key Principles" → link a constitution.md** (no duplicar)
3. **Reconsiderar work-logs** — ¿eliminar o simplificar a solo cierre de sesión?
4. **Definir regla:** mejora del SKILL = paso 6 iterate (no las 7 fases)
5. **Para trabajo futuro:** un directorio por epic con todos los artefactos juntos

---

**Última actualización:** 2026-03-28
