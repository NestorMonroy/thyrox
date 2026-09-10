```yml
Fecha: 2026-04-03-00-49-34
WP: voltfactory-adaptation
Fase: 2 - SOLUTION_STRATEGY
Estado: En progreso
```

# Solution Strategy — Meta-Framework Generativo

## Key Ideas

Basadas en los hallazgos H-001 a H-020 del analysis.

**KI-1: Dos ejes ortogonales, no un monolito**
pm-thyrox es el eje de GESTION (que hacer, cuando, como documentarlo).
Los tech skills son el eje de TECNOLOGIA (como hacerlo en esa tech especifica).
Nunca mezclar los dos: pm-thyrox no sabe de React, react-frontend no sabe de fases SDLC.

**KI-2: Bootstrap once, use forever**
La deteccion de tech y generacion de skills ocurre una sola vez por proyecto.
El resultado se commitea a git. Las sesiones siguientes leen lo que ya existe.
Esto alinea con ADR-008 (Git as persistence): el filesystem es la memoria.

**KI-3: Registry como fuente de verdad**
Los tech skills no se escriben a mano para cada proyecto.
Se instancian desde templates en un registry centralizado.
Agregar soporte para una nueva tecnologia = agregar un template al registry.

**KI-4: session-start.sh como activador de contexto**
El hook ya conoce el WP activo. Tambien debe listar los tech skills activos.
Asi Claude sabe desde el primer mensaje que convenciones aplicar sin que el usuario las pida.

**KI-5: ADR-004 evoluciona, no se viola**
"Un solo skill" se referia a no fragmentar la gestion en 15 skills.
Los tech skills son una categoria nueva (tecnologia, no gestion).
La regla se refina: un skill de gestion + N skills de tecnologia (generados, no manuales).

---

## Research

### Unknown U-1: Como maneja Claude Code multiples skills activos simultaneamente?

**Investigacion:**
Claude Code carga todos los archivos `.instructions.md` de `.claude/guidelines/` automaticamente.
Los SKILL files se invocan con el Skill tool bajo demanda.
El frontmatter `description` con `<example>` tags permite que Claude Code sugiera el skill correcto automaticamente.

**Conclusion:**
- `.instructions.md` → siempre activos (zero invocacion manual), ideales para convenciones
- `SKILL.md` → se invocan cuando Claude detecta que aplica (via description)
- Para tech skills: usar AMBOS. El `.instructions.md` enforcea las reglas; el `SKILL.md` da guia fase-por-fase

**Decision:** tech skill = SKILL.md (fase-por-fase) + `.instructions.md` (reglas siempre-on)

---

### Unknown U-2: Granularidad del registry — broad vs specific?

**Alternativa A — Muy especifico:** `react-18`, `react-17`, `nextjs-14`, `nextjs-13`
- Pro: guidance muy preciso
- Contra: explosion combinatoria, dificil de mantener, duplicacion masiva

**Alternativa B — Muy generico:** `javascript-frontend`, `python-backend`
- Pro: minimo mantenimiento
- Contra: guidance superficial, no sabe si es React o Vue, Express o Django

**Alternativa C — Por framework, no por version:** `react`, `nextjs`, `vue`, `nodejs`, `django`
- Pro: balance entre precision y mantenimiento
- Contra: puede ignorar diferencias de version importantes

**Alternativa D — Por capa + framework:** `frontend-react`, `backend-nodejs`, `db-postgresql`
- Pro: el prefijo de capa ayuda a Claude a saber cuando aplicarlo (Phase 4: frontend vs backend)
- Contra: un poco mas verbose en naming

**Decision: Alternativa D**
Razon: el prefijo de capa (`frontend-`, `backend-`, `db-`, `infra-`) permite que pm-thyrox
sepa exactamente que skills invocar en cada fase sin ambiguedad.
Ejemplo: en Phase 6 trabajando en el backend → invocar `backend-nodejs`, no `frontend-react`.

---

### Unknown U-3: Donde vive el registry?

**Alternativa A — Dentro de thyrox:** `.claude/registry/`
- Pro: un solo repo, todo junto, facil de mantener
- Contra: mezcla el framework con los templates de tecnologia

**Alternativa B — Repo separado:** `github.com/user/pm-thyrox-registry`
- Pro: registry reutilizable entre proyectos, versionado independiente
- Contra: dependencia externa, mas complejidad de setup

**Alternativa C — Dentro de thyrox pero separado:** `.claude/registry/` como carpeta dedicada
- Pro: todo en un repo, logicamente separado, facil de mover a repo propio despues
- Contra: thyrox crece de tamanio

**Decision: Alternativa C (por ahora)**
Razon: principio de simplicidad. Empezar con `.claude/registry/` en thyrox.
Cuando el registry tenga 10+ templates, evaluar mover a repo separado.
La separacion logica ahora facilita esa migracion futura sin reescribir nada.

---

### Unknown U-4: Como pasa session-start.sh el contexto de tech skills a Claude?

**Alternativa A — Solo mencionarlo en el startup message**
```bash
echo "Tech skills activos: frontend-react, backend-nodejs, db-postgresql"
```
- Pro: minimo, no interfiere con el flujo
- Contra: Claude puede ignorarlo si hay mucho output

**Alternativa B — Generar un archivo `context/tech-stack.md` dinamico**
- Pro: persistente, Claude puede leerlo en cualquier momento
- Contra: archivo generado automaticamente puede confundir si queda desactualizado

**Alternativa C — El CLAUDE.md del proyecto lista los tech skills activos**
- Pro: siempre visible al inicio de sesion (se carga automaticamente)
- Contra: CLAUDE.md no deberia cambiar frecuentemente

**Alternativa D — Los `.instructions.md` se activan automaticamente por su presencia**
En Claude Code, todos los archivos `.instructions.md` en `.claude/guidelines/` se aplican
automaticamente. No necesitan ser "pasados" por session-start.sh.

**Decision: Alternativa D como mecanismo principal + Alternativa A como display**
Razon: las `.instructions.md` ya hacen el trabajo de aplicar convenciones automaticamente.
session-start.sh solo las menciona en el display para que el usuario sepa que están activas.
No hay que "pasar" nada: el mecanismo de Claude Code ya lo hace.

---

### Unknown U-5: Que tan completo debe ser un tech skill template?

Volt Factory tiene `al-naming-conventions.instructions.md` con 200 lineas, 7 reglas,
ejemplos buenos/malos por regla. Es el nivel de detalle correcto.

**Estructura minima viable de un template:**
```
registry/frontend/react.template.md
├── frontmatter (name, description, layer)
├── SKILL.md content:
│   ├── Phase 1 — que investigar en proyectos React
│   ├── Phase 4 — que incluir en requirements-spec
│   ├── Phase 6 — convenciones de implementacion
│   └── Phase 7 — que revisar al cerrar
└── instructions.md content:
    ├── Rule 1: Component naming (PascalCase)
    ├── Rule 2: File organization (feature-based)
    ├── Rule 3: State management approach
    ├── Rule 4: Testing conventions
    └── Rule 5: No inline styles
```

**Criterio de calidad (R-006 mitigacion):**
Cada regla en `.instructions.md` debe ser:
- Especifica: "Usa PascalCase para componentes" no "usa buenas practicas"
- Verificable: se puede revisar si se cumple o no
- Con ejemplo: codigo bueno y malo concretos

---

## Pre-design Check

Verificar contra principios del proyecto (ADRs y CLAUDE.md):

**ADR-008 (Git as persistence):** CUMPLE. Tech skills son archivos commiteados.
**ADR-001 (Markdown only):** CUMPLE. Registry templates son .md, skills son .md.
**ADR-004 (Single skill):** NECESITA ACTUALIZACION. Redefinir: "un skill de gestion +
N tech skills generados desde registry". La intencion original (no fragmentar la
metodologia en 15 skills de gestion) se preserva.
**ADR-003 (Conventional Commits):** CUMPLE. Bootstrap de skills genera commits convencionales.
**ADR-010 (ANALYZE first):** CUMPLE. Tech detection es parte de Phase 1 ANALYZE.

---

## Decisions

**D-001: Arquitectura de dos capas**
pm-thyrox = skill de gestion (existe, no cambia su proposito).
tech skills = skills de tecnologia (nuevos, generados, opcionales).
Los tech skills NO reemplazan ni extienden pm-thyrox. Son complementarios.

**D-002: Naming de tech skills**
Formato: `{capa}-{framework}` → `frontend-react`, `backend-nodejs`, `db-postgresql`, `infra-docker`.
Capas validas: `frontend`, `backend`, `db`, `infra`, `mobile`, `testing`.

**D-003: Estructura de cada tech skill en el proyecto**
```
.claude/skills/{capa}-{framework}/
├── SKILL.md              ← Guia fase-por-fase para esa tech
└── references/           ← Patterns y convenciones detalladas (opcional)

.claude/guidelines/
└── {capa}-{framework}.instructions.md   ← Reglas always-on
```

**D-004: Registry en `.claude/registry/`**
```
.claude/registry/
├── _generator.sh         ← Script que instancia templates
├── frontend/
│   ├── react.template.md
│   ├── vue.template.md
│   └── nextjs.template.md
├── backend/
│   ├── nodejs.template.md
│   └── django.template.md
└── db/
    ├── postgresql.template.md
    └── mongodb.template.md
```

**D-005: Mecanismo de bootstrap**
Comando: `/workflow_init` o paso nuevo en Phase 1 cuando no hay tech skills.
Proceso: scan proyecto → match con registry → instanciar templates → git commit.
El `/workflow_init` es el equivalente de nuestro primer `/workflow_analyze` con
la diferencia de que ademas genera los tech skills si no existen.

**D-006: Activacion en sesiones normales**
`.instructions.md` → se aplican automaticamente (mecanismo nativo de Claude Code).
SKILL.md de tech → se invoca cuando Claude detecta que aplica (via description con examples).
session-start.sh → lista tech skills activos en el display (informativo, no funcional).

**D-007: ADR-004 se refina**
Nueva formulacion: "Un skill de gestion (pm-thyrox), N tech skills generados desde registry.
Los tech skills son artefactos del proyecto, no del framework de gestion."
Crear ADR-012 que documenta esta decision y su relacion con ADR-004.

---

## Post-design Check

**Coherencia interna:**
- D-001 (dos capas) + D-002 (naming por capa) son coherentes.
- D-003 (estructura) + D-006 (activacion) son coherentes con como funciona Claude Code.
- D-004 (registry en .claude/) + D-005 (bootstrap) son coherentes con ADR-008.
- D-007 (refinar ADR-004) resuelve el conflicto identificado en H-020.

**Pendiente para Phase 3 PLAN:**
- Definir scope del MVP del meta-framework (cuantos templates iniciales)
- Decidir si bootstrap es un nuevo comando o parte de Phase 1 ANALYZE
- Estimar esfuerzo para: registry inicial (5 templates) + generator script + session-start update

**Unknowns no resueltos (aceptados):**
- Como manejar conflictos entre reglas de dos tech skills del mismo proyecto
  (ej: `frontend-react` y `frontend-vue` en un monorepo)
  → Decision: fuera de scope del MVP. El MVP asume un framework por capa.
