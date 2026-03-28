```yml
Tipo: Documentación Principal
Categoría: Guía de Contribución
Versión: 2.0
Propósito: Cómo contribuir al proyecto THYROX
Fecha actualización: 2026-03-27
```

# CONTRIBUTING — THYROX

## Flujo de Trabajo

THYROX usa una metodología de 7 fases SDLC definida en el [SKILL](.claude/skills/pm-thyrox/SKILL.md):

```
1. ANALYZE           → Entender requisitos
2. SOLUTION_STRATEGY → Decidir arquitectura
3. PLAN              → Definir scope, actualizar ROADMAP.md
4. STRUCTURE         → Crear PRD o specs
5. DECOMPOSE         → Descomponer en tasks
6. EXECUTE           → Implementar + commits
7. TRACK             → Validar + changelog
```

**Siempre empezar por ANALYZE.**

---

## Cómo Contribuir

### 1. Entender el proyecto

```bash
cd thyrox && claude
```

Claude Code lee CLAUDE.md → consulta SKILL.md → identifica fase actual.

### 2. Revisar estado

- Leer `ROADMAP.md` — ¿qué está pendiente?
- Leer `CHANGELOG.md` — ¿qué cambió recientemente?

### 3. Crear branch

```bash
git checkout -b feature/descripcion
# o: bugfix/descripcion, docs/descripcion
```

### 4. Trabajar siguiendo las fases

Consultar [SKILL](.claude/skills/pm-thyrox/SKILL.md) para saber qué fase aplica.

### 5. Commits con Conventional Commits

```
feat(scope): add new feature
fix(scope): fix bug description
docs(scope): update documentation
refactor(scope): restructure code
```

**Reglas:**
- Primera línea < 72 caracteres
- Presente imperativo ("add" no "added")
- Sin punto final
- Sin emojis

### 6. Actualizar ROADMAP.md

```markdown
- [x] Task completada (YYYY-MM-DD)
```

### 7. Push y PR

```bash
git push -u origin feature/descripcion
```

---

## Estructura del Proyecto

```
thyrox/
├── README.md              Presentación
├── ROADMAP.md             Plan maestro (fuente de verdad)
├── CHANGELOG.md           Historial de cambios
├── ARCHITECTURE.md        Decisiones arquitectónicas
├── CONTRIBUTING.md        Este archivo
├── .claude/
│   ├── CLAUDE.md          Contexto persistente
│   ├── context/           Trabajo producido (analysis, epics, work-logs, decisions)
│   └── skills/pm-thyrox/  Skill principal (SKILL.md + references + scripts + assets)
├── docs/                  API.md, BUILD.md
├── api/                   Sub-proyecto API
└── build/                 Sub-proyecto Build
```

---

## Convenciones

### Archivos y carpetas

- Archivos: `kebab-case.md`
- Carpetas: `lowercase/`
- Templates: `nombre.md.template` (en assets/)

### ROADMAP.md

```
- [ ] = Pendiente
- [-] = En Progreso
- [x] = Completado (YYYY-MM-DD)
```

### Markdown

- Links: `[texto](ruta/archivo.md)` (no backticks)
- Texto del link sin extensión: `[SKILL]` no `[SKILL.md]`
- Line breaks en metadata: usar `<br>`

---

## Validación

Antes de hacer PR, ejecutar:

```bash
# Detectar backtick refs sin convertir
bash .claude/skills/pm-thyrox/scripts/detect-missing-md-links.sh

# Detectar links rotos
python3 .claude/skills/pm-thyrox/scripts/detect_broken_references.py

# Validar (exit 0 = OK)
bash .claude/skills/pm-thyrox/scripts/validate-missing-md-links.sh
python3 .claude/skills/pm-thyrox/scripts/validate-broken-references.py
```

---

**Última actualización:** 2026-03-27
