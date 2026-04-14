```yml
created_at: 2026-04-14 00:00:00
wp: 2026-04-13-20-17-28-technical-debt-resolution
fase: FASE 34
phase: 7 — TRACK
```

# Lessons Learned — technical-debt-resolution (FASE 34)

## L-001 — `mv` no stagea deletions en git

**Qué pasó:** Al mover templates con `mv` en C5, los archivos originales quedaron como `D` (deleted, unstaged) en git. El commit C5 solo incluyó los nuevos archivos en `legacy/`, no las eliminaciones de los originales. El stop hook detectó los cambios sin commitear al cerrar la sesión.

**Causa:** `mv` es un comando de shell — git no lo intercepta. Para que git registre tanto el origen como el destino, se debe usar `git mv` o stagear manualmente con `git add -u` antes del commit.

**Fix aplicado:** `git add -u` + commit corrector después del stop hook.

**Regla derivada:** Al mover archivos en operaciones de TD, usar siempre `git mv <origen> <destino>` en lugar de `mv`. Si ya se usó `mv`, ejecutar `git add -u` antes del commit para capturar las deletions.

---

## L-002 — deep-review detectó Gap 1 (crítico) antes de ejecutar

**Qué pasó:** T-011 en el task-plan original asumía que los 4 templates huérfanos estaban todos en `workflow-analyze/assets/`. El deep-review pre-ejecución detectó que 3 de los 4 vivían en skills distintos (`workflow-track`, `workflow-decompose`, `workflow-structure`).

**Valor:** Sin el deep-review, la ejecución habría fallado con "archivo no encontrado" al intentar mover desde paths incorrectos.

**Regla derivada:** El deep-review Phase 3→5 es especialmente útil cuando el task-plan referencia paths de archivos. Verificar paths reales con Glob antes de asumir ubicaciones.

---

## L-003 — refactors.md.template tenía referencia activa no evidente

**Qué pasó:** El análisis clasificó `refactors.md.template` como "evaluar — posible uso en Phase 6". El deep-review lo marcó como Gap 2 (sin disposición). Al ejecutar T-012b, se encontró que `workflow-track/SKILL.md` L59 lo referencia activamente.

**Valor:** Antes de mover un template a legacy/, verificar siempre con grep si está referenciado en algún SKILL.md del mismo skill.

**Regla derivada:** Para TD-003 y casos similares: `grep -r "template-name" .claude/skills/` antes de decidir mover a legacy.

---

## L-004 — 7 TDs en un WP pequeño es el límite razonable

**Qué pasó:** FASE 34 resolvió 7 TDs en 8 commits con 18 tareas atómicas. El WP se mantuvo manejable porque cada TD tenía solución identificada y los cambios eran quirúrgicos (sin nueva arquitectura).

**Observación:** Si algún TD hubiera requerido diseño nuevo (ej. nueva interfaz en agent-spec), el WP habría escalado a mediano y Phase 4 STRUCTURE habría sido necesaria.

**Regla derivada:** Un WP de resolución de TDs puede clasificarse como `pequeño` si y solo si: (a) cada TD tiene solución pre-identificada, (b) ningún cambio requiere diseño nuevo, (c) los archivos afectados son < 12.
