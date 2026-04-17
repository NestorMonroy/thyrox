```yml
created_at: 2026-04-17 22:15:00
project: THYROX
work_package: 2026-04-17-17-58-13-goto-problem-fix
phase: Phase 3 — ANALYZE
author: NestorMonroy
status: Borrador
version: 1.0.0
```

# Análisis: Agregar /thyrox:audit al Catálogo de Fases en SKILL.md

---

## Contexto

El skill `workflow-audit` fue creado en esta ÉPICA como skill transversal (no es una Phase
del ciclo THYROX — no tiene Stage number asignado). El catálogo de fases en `thyrox/SKILL.md`
lista las 12 fases del ciclo THYROX como herramientas secuenciales.

La pregunta es: **¿cómo y dónde aparece `/thyrox:audit` en el catálogo?**

---

## El problema de posicionamiento

`workflow-audit` no encaja directamente en el catálogo de las 12 fases porque:

1. **No es una Phase del ciclo THYROX** — el ciclo es DISCOVER → STANDARDIZE, lineal. Audit
   no es un paso del ciclo sino una verificación que puede ocurrir en múltiples momentos.
2. **Es transversal** — puede auditarse Stage 10 sin haber llegado a Stage 11. Se puede
   auditar parcialmente a mitad de un WP para verificar calidad antes de continuar.
3. **No tiene Stage directory propio** — sus artefactos van en `track/` (Stage 11) porque
   es el más cercano semánticamente, pero el skill puede invocarse desde Stage 10 o Stage 12.

---

## Opciones de posicionamiento

### Opción A — Agregarlo como fila extra en la tabla del catálogo, fuera del orden

```markdown
| Phase 11: TRACK/EVALUATE | `/thyrox:track` | ... |
| Phase 12: STANDARDIZE    | `/thyrox:standardize` | ... |
| **AUDIT** (transversal)  | `/thyrox:audit` | Auditar calidad del WP — antes de Stage 12 o cuando el ejecutor lo solicite. |
```

**Ventaja:** visible en el catálogo. **Problema:** rompe la estructura "Phase N: NOMBRE" —
una fila sin número de Phase es visual y semánticamente extraña.

### Opción B — Sección separada "Herramientas transversales"

Agregar una nueva sección después del catálogo de las 12 fases:

```markdown
## Herramientas transversales

Skills que no son parte del ciclo de 12 fases pero se invocan según necesidad.

| Herramienta | Skill | Cuándo usar |
|------------|-------|-------------|
| **AUDIT** | `/thyrox:audit` | Antes de Stage 12, o cuando el ejecutor quiere verificar calidad del WP. |
```

**Ventaja:** no contamina el catálogo de fases, es extensible (otras herramientas transversales
podrían agregarse aquí). **Problema:** menor visibilidad que estar en el catálogo principal.

### Opción C — Nota en Stage 11 y Stage 12

Agregar una línea en las entradas de Phase 11 y Phase 12 del catálogo:

```markdown
| Phase 11: TRACK/EVALUATE | `/thyrox:track` | Evaluar resultados. Usar `/thyrox:audit` antes para verificar calidad. |
| Phase 12: STANDARDIZE    | `/thyrox:standardize` | Documentar patrones. Requiere audit previo aprobado. |
```

**Ventaja:** no requiere nueva sección, contextualiza el momento de uso. **Problema:** audit
queda como referencia cruzada, no como ciudadano de primera clase.

### Opción D — Integrar al mermaid y al catálogo como Phase 11.5 conceptual

Documentar AUDIT entre Phase 11 y Phase 12 con notación especial:

```markdown
| Phase 11: TRACK/EVALUATE | `/thyrox:track` | ... |
| ↳ *Gate 11→12*           | `/thyrox:audit` | Gate de calidad opcional — verifica WP antes de STANDARDIZE. Produce audit-report.md. |
| Phase 12: STANDARDIZE    | `/thyrox:standardize` | ... |
```

**Ventaja:** posicionamiento claro como gate, no rompe la numeración. El símbolo `↳` y
la cursiva lo distinguen visualmente de las fases. **Problema:** el mermaid no lo incluiría
naturalmente — habría que agregar un nodo `AUDIT?` opcional.

---

## Recomendación: Opción B + referencia en Opción C

**Estructura propuesta para `thyrox/SKILL.md`:**

1. En el catálogo de fases (Phase 11 entry), agregar nota:
   ```
   | Phase 11: TRACK/EVALUATE | `/thyrox:track` | Evaluar resultados. Usar `/thyrox:audit` antes de STANDARDIZE para gate de calidad. |
   ```

2. Agregar sección nueva "Herramientas de calidad" después del catálogo:
   ```markdown
   ## Herramientas de calidad

   | Herramienta | Skill | Cuándo usar |
   |------------|-------|-------------|
   | **AUDIT** | `/thyrox:audit` | Antes de Stage 12 STANDARDIZE, o cuando el ejecutor quiere verificar calidad de un WP. Produce `track/{wp}-audit-report.md` con score PASS/FAIL/PARTIAL y action plan. |
   ```

---

## Implicaciones del cambio en SKILL.md

### Lo que cambia

| Aspecto | Antes | Después |
|---------|-------|---------|
| Visibilidad de `/thyrox:audit` | Solo existe como comando, no documentado en catálogo | Aparece en "Herramientas de calidad" y referenciado en Phase 11 |
| Modelo mental del catálogo | 12 fases lineales | 12 fases + herramientas transversales (extensible) |
| `thyrox/SKILL.md` tamaño | ~200 líneas | +8 líneas |

### Lo que NO cambia

- El ciclo de 12 fases permanece intacto — audit no es Phase 13
- El mermaid del ciclo no necesita modificarse (audit es opcional/transversal)
- `workflow-audit/SKILL.md` no necesita campo `phase:` porque es transversal

### Impacto en auto-invocación

El trigger de `workflow-audit` ya está bien definido en su `description`:
```
"Use when verifying that ALL work in a WP was completed correctly..."
```
Aparecer en el catálogo de `thyrox/SKILL.md` aumenta la probabilidad de invocación
correcta porque Claude lo encontrará al leer el SKILL principal.

---

## ¿Es AUDIT el único transversal?

Mirando el framework actual, hay otros candidatos para esta sección futura:

| Herramienta | Existe | Transversal |
|------------|--------|------------|
| `/thyrox:audit` | ✅ Sí | ✅ Sí — gate de calidad |
| `/thyrox:deep-review` | ✅ Sí (agente) | ✅ Sí — análisis de cobertura |
| `/thyrox:loop` | ✅ Sí | Parcial — solo para Phase 10 |
| Validación de referencias | ❌ No existe como skill | Potencial futuro |

La sección "Herramientas de calidad" o "Herramientas transversales" sería extensible para estos
casos futuros — lo que justifica crearla como sección propia en lugar de una nota inline.

---

## Decisión recomendada

**Implementar en esta sesión:**
- Modificar `Phase 11: TRACK/EVALUATE` en el catálogo para referenciar `/thyrox:audit`
- Agregar sección "Herramientas de calidad" después del catálogo de fases con entrada de AUDIT

**Requiere modificar:** `.claude/skills/thyrox/SKILL.md` (archivo con `updated_at` en frontmatter → actualizar timestamp).
