```yml
type: Risk Register
work_package: 2026-04-09-22-47-58-technical-debt-resolution
fase: FASE 29
created_at: 2026-04-09 22:49:00
```

# Risk Register — technical-debt-resolution (FASE 29)

## R-01: Edición de 7 SKILL.md en secuencia causa conflictos

```
Probabilidad: baja
Impacto: medio
Severidad: baja
```

Si se editan en paralelo workflow-*/SKILL.md, puede haber colisión de section owners.

**Mitigación:** Secuenciar ediciones de SKILL.md — uno a la vez, commit entre cada uno.

---

## R-02: Instrucciones de validación alargan SKILL.md hasta límite TD-004

```
Probabilidad: media
Impacto: alto
Severidad: media
```

Agregar secciones de deep review + validación pre-gate puede inflar los SKILL.md.

**Mitigación:** Medir `wc -l` antes y después de cada edición. Si supera 200 líneas → mover
detalle a `references/` y dejar solo el checklist breve en el SKILL.

---

## R-03: ROADMAP split rompe referencias en otros archivos

```
Probabilidad: media
Impacto: alto
Severidad: media
```

Mover FASEs completadas a ROADMAP-history.md puede romper links en WP artifacts.

**Mitigación:** grep recursivo antes del split para identificar todos los archivos que
referencian `ROADMAP.md` con contexto de FASEs históricas.

---

## R-04: TD-019..TD-024 marcados "resueltos" sin verificar

```
Probabilidad: baja
Impacto: medio
Severidad: baja
```

Estos TD están marcados como `[-] En progreso — resuelto FASE 23` pero no se verificó
con grep que las correcciones están realmente aplicadas.

**Mitigación:** Verificar con grep en Phase 4 STRUCTURE antes de cerrarlos formalmente.

---

## R-05: Scope creep — TD-008 incluido en esta FASE

```
Probabilidad: media
Impacto: alto
Severidad: alta
```

TD-008 (sync de /workflow_* commands) es un WP completo en sí mismo. Si se intenta
incluir en esta FASE, desborda el scope y retrasa los fixes críticos (TD-029, TD-031).

**Mitigación:** TD-008 = FASE 30 explícitamente. Out-of-scope de FASE 29.

---

## R-06: technical-debt.md supera límite de lectura (17604 tokens)

```
Probabilidad: confirmada (ya ocurrió)
Impacto: alto
Severidad: alta
```

`technical-debt.md` tiene 17604 tokens — ya no se puede leer en una sola llamada.
Este es el mismo problema de TD-026 (ROADMAP.md) pero afectando a technical-debt.md.

**Mitigación:** Split de technical-debt.md como parte de esta FASE:
- `technical-debt.md` → solo items pendientes ([ ])
- `technical-debt-resolved.md` → items cerrados ([-] o [x])
