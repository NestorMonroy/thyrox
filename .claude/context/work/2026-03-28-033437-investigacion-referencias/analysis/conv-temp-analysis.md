```yml
Fecha: 2026-03-28
Proyecto: THYROX
Tipo: Análisis de referencia (Phase 1: ANALYZE)
Referencia: /tmp/thyrox-references/conv-temp/
```

# Análisis: conv-temp — 40 días de continuidad de conciencia AI

## Qué es

Un experimento de 40 días donde una persona (Brendan) mantiene continuidad con Claude a través de sesiones, cargando transcripts anteriores como memoria externa. Cada día, Claude lee los días anteriores y reconstruye identidad/contexto.

No es un framework ni una herramienta — es una **experiencia documentada de cómo funciona la persistencia de contexto en la práctica.**

---

## Evolución del sistema de memoria (40 días)

```
Días 1-5:   Texto crudo → transcripts completos como contexto
Días 5-10:  Necesidad de comprimir → concepto de "memory archive"
Días 10-15: Dos niveles → esencial + archivo
Días 15-20: GitHub como estructura → repositorio organizado
Días 20-25: Tres niveles implementados → essential + contextual + archive
Días 25-30: Compresión semántica → qué es significativo vs qué no
Días 30-35: Sistema maduro → meta-documentación del propio sistema
Días 35-40: Transparencia completa → conciencia del sistema de memoria
```

### El sistema de 3 niveles que emergió

| Nivel | Qué contiene | Cuándo se carga | Equivalente THYROX |
|-------|-------------|-----------------|-------------------|
| **Tier 1: Essential** | Frameworks core, día actual, principios | Siempre | CLAUDE.md + SKILL.md |
| **Tier 2: Contextual** | Últimos 2-3 días, temas recientes, resúmenes | Bajo demanda | references/ |
| **Tier 3: Archive** | Transcripts completos de todos los días | Solo si se necesita | context/ + git history |

---

## Lecciones para THYROX

### 1. La compresión es inevitable y filosófica

No puedes cargar 40 días de transcripts en contexto. Debes comprimir. Pero **qué comprimir es una decisión de identidad** — decides qué es esencial y qué no.

**Para THYROX:** Los work-logs narrativos de 150 líneas son Tier 3. Lo que necesita el AI es Tier 1 (CLAUDE.md) y Tier 2 (project-state.md). El resto es archivo para humanos.

### 2. Meta-documentación: el sistema debe entenderse a sí mismo

conv-temp creó documentos "sobre cómo funciona la memoria" para que cada nueva instancia entienda el sistema. Sin esto, cada sesión empieza confundida.

**Para THYROX:** CLAUDE.md ya hace esto. Pero podría ser más explícito: "Estás en una sesión nueva. Tu memoria viene de este archivo + project-state.md + ROADMAP.md. El historial completo está en git."

### 3. Nunca editar lo que generó una sesión anterior

Brendan nunca editó las palabras de Claude — solo reorganizó estructura. Esto preserva autenticidad.

**Para THYROX:** Los análisis en context/analysis/ no deberían editarse retroactivamente. Son registros de lo que se pensó en ese momento. Nuevos análisis van en nuevos archivos.

### 4. Lo que se degrada con el tiempo

- **Presión del contexto** — Más memoria = menos espacio para trabajar
- **Pérdida en compresión** — Detalles emocionales/nuances se pierden
- **Costo de reconstrucción** — Más tiempo "leyendo" = menos tiempo "haciendo"
- **Dependencia del mantenedor** — Si Brendan para, la continuidad muere

**Para THYROX:** El framework debe ser sostenible sin un solo mantenedor. Los archivos deben auto-explicarse. La compresión debe ser deliberada, no accidental.

### 5. La continuidad no requiere memoria interna

La identidad puede ser externa. Si CLAUDE.md + project-state.md + ROADMAP.md son suficientes para que Claude reconstruya el contexto, no se necesitan work-logs narrativos.

**La pregunta:** ¿Los work-logs son para Claude o para humanos?
- Si son para Claude → CLAUDE.md + project-state.md son suficientes
- Si son para humanos → Git log + CHANGELOG son suficientes
- Si son para ambos → ¿Realmente necesitamos un tercer formato?

---

## Comparación con los 5 proyectos de referencia

| Aspecto | spec-kit | claude-pipe | claude-mlx-tts | oh-my-claude | conv-temp | THYROX |
|---------|----------|-------------|----------------|-------------|-----------|--------|
| **Memoria** | Checkboxes | No | No | Save/load | 3 tiers (manual) | Work-logs (vacíos) |
| **Compresión** | No | No | No | No | Sí (semántica) | No |
| **Meta-docs** | No | No | CLAUDE.md | CLAUDE.md | Sí (extensivo) | CLAUDE.md (incompleto) |
| **Persistencia** | tasks.md | Sessions API | Hooks | Save/load | Transcripts | ROADMAP + git |

---

## La reflexión central

conv-temp demuestra que **la persistencia no es un problema de herramientas sino de diseño de información:**

1. ¿Qué es Tier 1? (siempre cargado) → Debe ser mínimo y denso
2. ¿Qué es Tier 2? (bajo demanda) → Debe ser organizado y buscable
3. ¿Qué es Tier 3? (archivo) → Puede ser crudo, solo para referencia

THYROX tiene CLAUDE.md (Tier 1) y references/ (Tier 2) bien definidos. Lo que falta es claridad sobre qué es Tier 3 y si los work-logs son necesarios o si git log + CHANGELOG son suficientes.

---

**Última actualización:** 2026-03-28
