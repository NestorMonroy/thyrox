```yml
created_at: 2026-04-12 00:00:00
wp: 2026-04-11-23-27-08-technical-debt-audit
fase: FASE 32
```

# Lecciones Aprendidas — technical-debt-audit (FASE 32)

---

## Lo que funcionó bien

### 1. Deep-review sistemático entre fases
Ejecutar el agente `deep-review` al final de cada phase antes de avanzar al gate detectó 11 gaps menores en total (3 en Phase 3→4, 6 en Phase 4→5, 2 en Phase 5→6). Ninguno fue crítico, pero varios habrían causado errores silenciosos en Phase 6 si no se hubieran corregido (ej: fecha 2026-04-11 vs 2026-04-12 en T-001, Write rules no verificadas en T-005).

**Aprendizaje:** El patrón "deep-review antes de cada gate" debe ser parte del flujo estándar de WPs medianos/grandes. Considerar documentarlo en `workflow-*/SKILL.md`.

### 2. Reclasificación de Grupo B a Grupo A en Phase 4
TD-029, TD-031, TD-032, TD-033 fueron planeados como implementaciones (Grupo B) pero Phase 4 verificó que ya estaban implementados. Esto evitó duplicar trabajo existente y redujo el scope de ~24 a ~20 tareas, eliminando 8 tareas de alto riesgo.

**Aprendizaje:** Siempre verificar con grep real en Phase 4 antes de asumir que algo está pendiente. El status en `technical-debt.md` puede estar desactualizado.

### 3. Separación limpia de fecha de auditoría vs fecha de ejecución
El deep-review detectó que T-001 usaba `2026-04-12` (fecha de ejecución) cuando el SPEC decía `2026-04-11` (fecha real de auditoría). La distinción es semánticamente importante para trazabilidad.

**Aprendizaje:** Cuando se audita que algo "ya estaba implementado", usar la fecha del descubrimiento, no la fecha de ejecución del WP.

---

## Lo que no funcionó bien

### 1. Criterio de verificación T-014 mal formulado
El task-plan especificó `grep -c "\[x\]" → 0` pero `technical-debt.md` siempre tendrá 1 hit por la leyenda de Convenciones. El criterio era literalmente incumplible tal como estaba escrito.

**Corrección aplicada:** El criterio correcto es `grep -c "Estado: \[x\]" → 0` o verificar que no existan headers `## TD-NNN` con estado [x].

### 2. Sección secundaria de tool-execution-model.md fuera de scope de T-006
T-006 apuntó específicamente a "líneas 64-82" pero la sección "Configuración Recomendada" (líneas 353-385) tenía el mismo problema y quedó sin actualizar. Fue detectado y corregido en el deep-review Phase 5→6, pero implicó un commit extra.

**Corrección aplicada:** Al definir tareas que actualizan documentos de referencia, especificar "revisar el documento completo en busca de instancias del mismo patrón", no solo las líneas conocidas.

### 3. Technical-debt.md requirió Python para limpieza
La limpieza de 18 secciones fue inviable con edits individuales (habría requerido 18 Edit calls con riesgo de conflictos). Se usó un script Python ad-hoc.

**Corrección aplicada:** Para future WPs que limpien `technical-debt.md`, planificar un script de limpieza en Phase 5 en lugar de edits manuales.

---

## Métricas del WP

| Métrica | Valor |
|---------|-------|
| TDs auditados | 24 |
| TDs confirmados implementados (Grupo A) | 7 |
| TDs implementados en FASE 32 (Grupo B) | 3 |
| TDs diferidos a FASE 33+ (Grupos C/D) | 14 |
| Tareas ejecutadas | 15/15 |
| Tamaño technical-debt.md antes | 70,360 bytes |
| Tamaño technical-debt.md después | 23,733 bytes |
| Reducción | 66% |
| Gaps detectados por deep-reviews | 11 menores, 0 críticos |
| Commits del WP | 8 |

---

## Recomendaciones para próximos WPs

1. **Formalizar deep-review en workflow-*/SKILL.md** — añadir instrucción explícita en `## Validaciones pre-gate` de cada workflow-* skill para ejecutar el agente `deep-review` (ya presente en validaciones pre-gate, pero ahora con `async_suitable: true` en el agente).

2. **Mejorar criterios de verificación en task-plans** — usar patrones grep que no produzcan falsos positivos por leyendas o comentarios. Ej: buscar `Estado:.*\[x\]` en lugar de `\[x\]` en general.

3. **technical-debt.md revisión trimestral** — con 14 TDs activos y REGLA-LONGEV-001 cumplida, el archivo está en estado óptimo. Próxima revisión al acumular 5+ nuevos TDs o al superar 30,000 bytes.
