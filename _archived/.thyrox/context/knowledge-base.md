```yml
type: Índice de Base de Conocimiento
version: 1.0
created_at: 2026-04-14 20:34:23
updated_at: 2026-04-14 20:40:00
```

# Base de Conocimiento — THYROX

Índice del sistema de gestión de conocimiento del proyecto. El conocimiento
generado durante ejecución se captura en estructura formal para que persista
entre sesiones, miembros y proyectos futuros.

---

## El Problema que Resuelve

Cuando se descubre algo importante durante ejecución:
- ¿Alguien lo documenta?
- ¿La próxima sesión (o sesión compactada) lo sabe?
- ¿El próximo WP repite el error?
- ¿En 6 meses, recordaremos el "por qué" de la decisión?

Sin gestión de conocimiento:
- Decisiones técnicas quedan implícitas en commits o en la cabeza
- Errores se repiten entre WPs
- Patrones exitosos no se formalizan
- El contexto se pierde en cada compactación de sesión

---

## Estructura de la Base de Conocimiento

```
.thyrox/context/
├── knowledge-base.md           ← Este archivo (índice maestro)
│
├── decisions/                  ← ADRs: POR QUÉ se tomaron decisiones
│   └── adr-NNN.md              → "Elegimos X sobre Y porque..."
│
├── lessons/                    ← LECCIONES: qué aprendimos de problemas/successes
│   ├── README.md               → Índice de lecciones
│   └── L-NNN-descripcion.md   → Cada lección aprendida
│
├── patterns/                   ← PATRONES: cómo hacer cosas que funcionaron
│   ├── README.md               → Índice de patrones
│   └── P-NNN-nombre.md        → Cada patrón formalizado
│
├── errors/                     ← ERRORES: bugs, incidentes, ERR-NNN
│   └── ERR-NNN-descripcion.md
│
├── research/                   ← INVESTIGACIONES: sandboxes y análisis
│
└── work/                       ← WPs activos/históricos
    └── YYYY-MM-DD-*/
        └── *-lessons-learned.md  ← Lecciones locales del WP (fuente primaria)
```

**Relación entre capas:**
- `decisions/` responde "¿por qué?"
- `lessons/` responde "¿qué aprendimos?"
- `patterns/` responde "¿cómo hacemos X?"
- `errors/` responde "¿qué salió mal?"
- `work/*/lessons-learned.md` es la fuente raw — el `README.md` de `lessons/` es el agregado

---

## Cuándo Documentar Qué

| Evento | Artefacto | Timing |
|--------|-----------|--------|
| Decisión arquitectónica permanente | ADR en `decisions/` | Inmediato, Phase 1-2 |
| Problema resuelto (bug, error, blocker) | `errors/ERR-NNN` + `lessons/L-NNN` | Al resolver |
| Patrón que funcionó (≥2 veces) | `patterns/P-NNN` | Al detectar recurrencia |
| Learnings del WP completo | `work/.../lessons-learned.md` | Phase 7: TRACK |
| Patrón/lección cross-WP (impacto general) | Promover a `lessons/` o `patterns/` | Al cerrar WP |

**Regla:** Los WP lessons-learned son la fuente primaria. Si una lección o patrón
tiene impacto más allá del WP (evitaría errores en futuros WPs), se promueve
al nivel de `lessons/` o `patterns/`.

---

## Proceso de Captura

```
Evento ocurre durante ejecución
        │
        ▼
¿Es una decisión arquitectónica permanente?
  Sí → ADR en decisions/adr-NNN.md
  No  ↓
¿Es un problema resuelto?
  Sí → errors/ERR-NNN + lessons/L-NNN (si tiene impacto cross-WP)
  No  ↓
¿Es un patrón que funcionó bien?
  Sí → patterns/P-NNN (si se repite ≥2 veces o es estratégico)
  No  ↓
¿Es un learning del WP?
  Sí → work/.../lessons-learned.md
  No  → Probablemente no necesita documentación formal
```

---

## Nomenclatura

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| ADR | `adr-{tema}.md` (en `decisions/`) | `adr-plugin-namespace-thyrox.md` |
| Lección | `L-NNN-descripcion-corta.md` | `L-001-script-huerfano.md` |
| Patrón | `P-NNN-nombre-del-patron.md` | `P-001-agent-bound.md` |
| Error | `{descripcion}.md` (en `errors/`) | `stream-timeout-idle.md` |

Los NNN son secuenciales por tipo, independientes entre sí.

---

## Índice Rápido

### Decisiones (ADRs) — `decisions/`
Ver [`decisions.md`](decisions.md) para el índice completo.
Decisiones más importantes: ADR-015 (SKILL vs CLAUDE.md), ADR-019 (plugin namespace), ADR-020 (.thyrox/)

### Lecciones — `lessons/`
Ver [`lessons/README.md`](lessons/README.md) para el índice completo.

### Patrones — `patterns/`
Ver [`patterns/README.md`](patterns/README.md) para el índice completo.

### Errores — `errors/`
16 ERRs documentados. Ver `errors/` directamente.

---

## Métricas de Conocimiento

| Tipo | Cantidad | Última actualización |
|------|----------|---------------------|
| ADRs | 19 | FASE 35 |
| Lecciones | 4 (inicio) | FASE 35 |
| Patrones | 3 (inicio) | FASE 35 |
| ERRs | 16 | FASE 34 |
| WPs con lessons-learned | ~35 de 52 | FASE 35 |
