```yml
name: frontend-react
description: "Skill de tecnología para proyectos React. Usar cuando se trabaje en componentes, hooks, estado, routing, o testing de frontend React en el proyecto thyrox. Invocar durante Phase 4 STRUCTURE para especificar requisitos de UI, durante Phase 6 EXECUTE para implementar componentes, y durante Phase 7 TRACK para revisar calidad del código React."
layer: frontend
framework: react
project: thyrox
```

# Frontend React — SKILL

Guía fase-por-fase para implementar en React dentro del proyecto thyrox.

---

## Phase 1: ANALYZE — Qué investigar en proyectos React

Al analizar un feature de frontend, cubrir:
- Árbol de componentes afectados — ¿cuáles existen, cuáles hay que crear?
- Gestión de estado — ¿local (useState), contexto (useContext), o global (zustand/redux)?
- Rutas involucradas — ¿qué páginas/layouts se modifican?
- Dependencias de API — ¿qué endpoints consume este feature?
- Requisitos de accesibilidad — ¿ARIA labels, navegación por teclado?

## Phase 4: STRUCTURE — Qué especificar para features React

En `requirements-spec.md`, incluir por cada componente:
- Props: nombre, tipo, si es requerido, valor default
- Estado interno: variables de estado con su tipo
- Eventos: qué dispara el componente hacia arriba (callbacks)
- Criterio visual: descripción del comportamiento esperado en UI

## Phase 6: EXECUTE — Convenciones de implementación

Ver sección INSTRUCTIONS para reglas específicas.

Orden de implementación recomendado:
1. Tipos/interfaces primero (si usa TypeScript)
2. Componente base sin lógica
3. Hooks y lógica de negocio
4. Conexión a estado/API
5. Tests unitarios
6. Integración en página/layout

## Phase 7: TRACK — Qué revisar al cerrar

- Todos los componentes nuevos tienen tests con React Testing Library
- No hay `console.log` ni código comentado
- Props tienen PropTypes o tipos TypeScript
- Componentes > 200 líneas considerados para split
- No hay imports no usados (`eslint no-unused-vars`)
