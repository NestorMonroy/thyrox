```yml
name: sphinx
description: "Tech skill para documentación con Sphinx. Usar cuando el proyecto necesite configurar Sphinx, crear estructura doc/, escribir RST/Markdown para docs, o generar documentación HTML. Complementa pm-thyrox: mientras pm-thyrox gestiona el proceso, sphinx define cómo se estructura y publica la documentación."
status: stub
implementado: false
pendiente_wp: sphinx-implementation
```

# SPHINX: Documentación con Sphinx

Tech skill para proyectos que usan Sphinx como generador de documentación.
Complementa pm-thyrox: pm-thyrox gestiona el proceso de trabajo (fases SDLC),
sphinx define cómo estructurar y publicar la documentación del proyecto.

---

## Estructura doc/ [PENDIENTE — WP sphinx-implementation]

Convención de directorios para proyectos que usan este skill.

```
doc/
├── index.rst              ← Entry point de Sphinx
├── architecture/
│   └── decisions/         ← ADRs del proyecto (adr_path default)
├── guides/
│   ├── getting-started.md
│   └── contributing.md
└── conf.py                ← Configuración Sphinx
```

---

## Configuración Sphinx (conf.py) [PENDIENTE — WP sphinx-implementation]

Parámetros mínimos recomendados, extensiones, tema.

---

## Convenciones RST / Markdown [PENDIENTE — WP sphinx-implementation]

Cuándo usar `.rst` vs `.md`, estructura de headings, links entre docs.

---

## Integración con pm-thyrox [PENDIENTE — WP sphinx-implementation]

Cómo los ADRs de pm-thyrox se convierten en páginas de Sphinx.
Dónde referencia CLAUDE.md el `adr_path` para que Sphinx los indexe.

---

## Build y publicación [PENDIENTE — WP sphinx-implementation]

Comandos para build local, CI/CD, publicación en ReadTheDocs o GitHub Pages.

---

*Stub creado en WP doc-structure (2026-04-04). Implementación completa pendiente.*
