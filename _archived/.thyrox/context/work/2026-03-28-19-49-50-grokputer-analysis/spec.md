```yml
Fecha: 2026-03-28
Tipo: Phase 2 (SOLUTION_STRATEGY)
```

# Solution Strategy: 5 Correcciones al SKILL desde errores de grokputer

---

## 1. Key Ideas

```
Idea 1: Graduated Enforcement
  Descripción: Cada corrección tiene un nivel soft (instrucción) + hard (mecanismo) cuando posible
  Impacto: No depende solo de disciplina — hay backup automático

Idea 2: Reglas en el momento justo
  Descripción: Las reglas se leen en la fase donde se necesitan, no al inicio
  Impacto: Evita instruction bloat (L-0002) — las 3 líneas nuevas van en Phase 6 y 7

Idea 3: Prevention > Detection
  Descripción: .gitignore previene el commit de archivos malos; es mejor que detectar después
  Impacto: El error nunca llega al repo, en vez de encontrarlo en code review
```

---

## 1b. Research Step

### Unknown 1: ¿Qué patrones de .gitignore cubren los errores de grokputer?

**Errores a prevenir:**
- G01: `Dict[str` (type annotation como filename), `-a` (output de shell)
- G02: `*.backup`, `*.backup2`
- G04: `.jpg`, `.png`, `.bmp`, `.mp4`, `.msi`, `.rar`, `.pdf`, `.xlsx`, `.lnk`
- G19: `node_modules/`
- G20: `.coverage`

**Investigación — .gitignore patterns comunes:**

| Categoría | Pattern | Previene |
|-----------|---------|---------|
| Node deps | `node_modules/` | G19 |
| Python deps | `__pycache__/`, `*.pyc`, `.venv/`, `env/` | Deps Python |
| Coverage | `.coverage`, `htmlcov/`, `coverage.xml` | G20 |
| Backups | `*.backup`, `*.bak`, `*.swp`, `*.swo`, `*~` | G02 |
| Binarios comunes | `*.exe`, `*.msi`, `*.dll`, `*.so`, `*.dylib` | G04 parcial |
| Media | `*.mp4`, `*.avi`, `*.mov`, `*.rar`, `*.zip`, `*.tar.gz` | G04 parcial |
| Office | `*.xlsx`, `*.docx`, `*.pptx` | G04 parcial |
| Imágenes grandes | `*.bmp`, `*.psd`, `*.tiff` | G04 parcial |
| OS files | `.DS_Store`, `Thumbs.db`, `desktop.ini` | Junk OS |
| IDE | `.idea/`, `.vscode/settings.json`, `*.code-workspace` | Config IDE |
| Logs | `*.log` | Logs efímeros |
| Reports | `*-report.txt` | Archivos generados (como reference-validation-report.txt) |

**Decisión:** Incluir todas las categorías. Un .gitignore robusto es defense-in-depth — previene clases enteras de errores.

**Nota:** No se puede prevenir `Dict[str` ni `-a` con .gitignore (son nombres arbitrarios). Solo la instrucción de Phase 6 cubre eso.

### Unknown 2: ¿Agregar la instrucción de ERR-antes-de-retry aumenta el SKILL demasiado?

**Análisis actual del SKILL Phase 6:**
```
1. Tomar siguiente tarea sin bloqueos
2. Implementar el cambio
3. Commit con Conventional Commits
4. Actualizar ROADMAP.md
5. Repetir
```

**Propuesta — agregar nota en paso 2:**
```
2. Implementar el cambio. Si falla, crear ERR-NNN antes de reintentar con otro approach.
```

Esto es 1 línea, ~15 palabras. No viola L-0002.

**Evidencia de que es necesario:** grokputer tiene 20 fix scripts (`fix_`, `precise_`, `robust_`, `ultimate_`, `final_`, `direct_`) = 6 reintentos del mismo bug sin documentar por qué cada uno falló. Si hubieran creado un ERR al primer fallo, el segundo intento tendría contexto de por qué el primero falló.

**Decisión:** Agregar. 15 palabras con alto impacto de prevención.

### Unknown 3: ¿La regla de cleanup al cerrar work package genera overhead?

**Análisis:** Phase 7 ya tiene 8 bullet points. Agregar "verificar que no quedaron archivos temporales" es el 9no.

**Riesgo:** ¿Claude realmente verificará? Sin enforcement, es otra regla soft.

**Evidencia:** validate-session-close.sh ya checa si focus.md está actualizado. Podría agregar un check de "archivos no-markdown en root" pero sería frágil (proyectos de código TIENEN archivos no-markdown en root).

**Decisión:** Solo instrucción en Phase 7 (soft). No automatizar — el concepto de "temporal" es subjetivo.

### Unknown 4: ¿La regla de "buscar refs antes de borrar" va en conventions.md o en el SKILL?

**Análisis:** Este error (G06) ocurre cuando se borran archivos sin actualizar las referencias. Es un caso edge — no ocurre en cada sesión, solo cuando se reorganiza.

**Evidencia en THYROX:** reference-validation.md ya existe como reference. Los scripts detect_broken_references.py y validate-broken-references.py ya existen.

**Decisión:** conventions.md como regla + referenciar los scripts existentes. No agregar al SKILL (sería instrucción para caso edge — L-0002 dice no agregar lo que no se usa frecuentemente).

---

## 2. Fundamental Decisions

```
Decision 1: .gitignore como enforcement principal
  Alternatives: Hook pre-commit que rechaza binarios, instrucción solo en SKILL
  Justification: .gitignore es el mecanismo más robusto — funciona sin que Claude
    lo lea, sin hooks, sin CI. Es invisible y siempre activo.
  Implications: No cubre archivos con nombres arbitrarios (Dict[str]). Para eso
    necesitamos la instrucción soft en Phase 6.

Decision 2: Regla de ERR-antes-de-retry en Phase 6, no en Phase 7
  Alternatives: Phase 7 (tracking), conventions.md, CLAUDE.md locked decision
  Justification: El momento de prevenir el fix-cycling es DURANTE la ejecución
    (Phase 6), no al final (Phase 7). Si está en Phase 7, Claude ya reintentó
    6 veces sin documentar.
  Implications: Phase 6 gana 1 línea. Aceptable.

Decision 3: No automatizar el cleanup check
  Alternatives: Script que lista archivos no-markdown en root
  Justification: Un proyecto de código TIENE archivos no-markdown (package.json,
    Dockerfile, etc.). Un script no puede distinguir "temporal" de "necesario".
    Solo el humano sabe.
  Implications: Depende de disciplina — aceptable porque es caso edge.

Decision 4: conventions.md para la regla de refs, no SKILL
  Alternatives: SKILL Phase 7, CLAUDE.md
  Justification: Borrar archivos y actualizar refs es mantenimiento, no una fase
    del workflow. Es infrecuente. L-0002 dice no agregar instrucciones infrecuentes
    al SKILL.
  Implications: Claude no la leerá a menos que consulte conventions. OK porque
    los scripts de validación detectan refs rotas post-facto.
```

---

## 3. Technology Stack

```
Enforcement    → .gitignore (git native, zero dependencies)
Validation     → Scripts existentes (detect_broken_references.py, validate-*)
Documentation  → SKILL.md + conventions.md (markdown, no tooling)
```

No se necesita tech stack adicional. Todo usa herramientas existentes.

---

## 4. Patterns

```
Structural: Graduated enforcement (hard .gitignore + soft instrucciones)
Behavioral: Prevention at execution time (reglas en Phase 6, no Phase 7)
Architectural: Defense in depth (.gitignore + instrucción + scripts de validación)
```

---

## 5. Quality Goals → Solution

```
Quality Goal: Prevenir 57% de errores de grokputer que dependen de disciplina
  Approach: Graduated enforcement + reglas en momento justo
  Mechanisms: .gitignore (hard), Phase 6 instrucciones (soft), conventions (reference)
  Medición: Cobertura sube de 39% (9/23) a 96% (22/23)

Quality Goal: No instruction bloat
  Approach: Solo 3 líneas nuevas en SKILL.md
  Mechanisms: Reglas que no se usan frecuentemente van a conventions.md, no al SKILL
  Medición: SKILL.md: 198 → 201 líneas (bajo 500)
```

---

## Pre-design check: ¿Decisiones respetan principios?

| Principio | ¿Respetado? | Cómo |
|-----------|------------|------|
| ANALYZE first | ✅ | Se analizaron 23 errores de grokputer antes de decidir |
| Anatomía oficial | ✅ | No se agregan archivos fuera de la anatomía |
| Git as persistence | ✅ | .gitignore refuerza esta decisión |
| Markdown only | ✅ | .gitignore previene binarios |
| Single skill | ✅ | Todo va al mismo pm-thyrox |
| Work packages with timestamp | ✅ | Este análisis está en work package timestamped |
| Conventional commits | ✅ | Se seguirá en implementación |

## Post-design re-check: ¿Decisiones siguen respetando principios?

| Decisión | Principio que podría violar | ¿Viola? |
|----------|---------------------------|---------|
| .gitignore robusto | Markdown only (es un archivo de config, no markdown) | No — .gitignore ya existe, solo se mejora |
| 3 líneas en SKILL | L-0002 (instruction bloat) | No — 3 líneas, SKILL queda en 201 |
| conventions.md regla | Single source of truth | No — es una convención, no duplica SKILL |
| No automatizar cleanup | Enforcement > discipline | Aceptable — "temporal" es subjetivo |

**Resultado:** Todas las decisiones pasan ambos checks.

---

## Siguiente

→ Phase 3+5: PLAN + DECOMPOSE — definir tareas
