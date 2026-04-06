# SKILL — React Frontend — {{PROJECT_NAME}}

```yml
Tipo: Tech Skill
Tecnología: React
Proyecto: {{PROJECT_NAME}}
Versión: 1.0
```

## Convenciones de Componentes

### Estructura básica

```tsx
import React from 'react'

interface Props {
  // declarar todas las props con tipos explícitos
}

const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  return (
    <div>
      {/* JSX */}
    </div>
  )
}

export default MyComponent
```

### Reglas

- Functional components con TypeScript — NUNCA class components
- Un componente por archivo
- Nombre del archivo = nombre del componente (PascalCase)
- Exportar como `export default`
- Props interface declarada encima del componente

## Convenciones de Hooks

### useEffect

```tsx
// CORRECTO — dependencias explícitas
useEffect(() => {
  fetchData(userId)
}, [userId])

// INCORRECTO — deps vacío sin comentario justificado
useEffect(() => {
  init()
}, []) // ← necesita comentario: "// mount-only: init no cambia"
```

### Custom hooks

- Ubicar en `src/hooks/`
- Prefijo `use`: `useAuth.ts`, `useDebounce.ts`
- Retornar objeto nombrado (no array) cuando hay > 2 valores

### Estado

| Caso | Hook |
|------|------|
| Estado local simple | `useState` |
| Estado complejo / múltiples sub-valores | `useReducer` |
| Estado global simple | Zustand |
| Estado del servidor (fetch/cache) | React Query |
| Theming / i18n | Context API |

## Estructura de Archivos

```
src/
├── components/     # Componentes reutilizables
├── pages/          # Page-level components
├── hooks/          # Custom hooks (use*.ts)
├── utils/          # Funciones puras
└── types/          # TypeScript interfaces/types
```

## Testing

### Framework: Vitest + React Testing Library

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop1="value" />)
    expect(screen.getByText('value')).toBeInTheDocument()
  })

  it('handles click', () => {
    const onClick = vi.fn()
    render(<MyComponent onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

### Commands

```bash
# Correr tests
yarn test

# Con coverage
yarn test --coverage

# Watch mode
yarn test --watch
```

### Naming

- Archivo: `ComponentName.test.tsx`
- Ubicar junto al componente: `src/components/Button/Button.test.tsx`
- Prioridad: render → interacción → assertion

## Patrones a Evitar

- `any` en TypeScript — usar `unknown` si el tipo es desconocido
- Mutación directa de estado — siempre retornar nuevo valor
- `useEffect` para sincronización derivada — usar `useMemo`/`useCallback`
- Lógica de negocio en componentes — mover a custom hooks o servicios
