```yml
created_at: 2026-06-03T02:13:59
project: THYROX
work_package: 2026-06-03-02-13-59-cosmic-sizing
phase: Phase 1 — DISCOVER
author: NestorMonroy
status: Borrador
```

# COSMIC — modelo de medición (recolección del método)

> Fuente: COSMIC Measurement Manual v5.0 / **ISO/IEC 19761**. Recolectado para construir
> el skill THYROX de dimensionamiento funcional (capacidad de fase MEASURE/BASELINE).

## Qué mide COSMIC

El **tamaño funcional** del software a partir de sus **Functional User Requirements (FUR)**.
Es independiente de tecnología, lenguaje, esfuerzo o calidad. Unidad: **CFP** (COSMIC
Function Point). Aplica a software de negocio, tiempo real e infraestructura.

## Conceptos (el modelo genérico de software)

| Concepto | Definición |
|----------|-----------|
| **Functional user** | Emisor/receptor de datos hacia/desde el software: persona, dispositivo HW, u **otro software**. |
| **Boundary** | Interfaz conceptual entre el software medido y sus functional users. |
| **Triggering event** | Evento que hace que un functional user envíe datos e inicie un proceso funcional. |
| **Functional process** | Conjunto de movimientos de datos que responde a un triggering event. Unidad elemental de los FUR; independiente y completo. |
| **Object of interest** | Cosa (física o conceptual) sobre la que el software procesa datos. |
| **Data group** | Conjunto distinto y no vacío de atributos que describen UN object of interest. |
| **Persistent storage** | Almacenamiento que permite que los datos persistan entre procesos funcionales. |

## Los 4 movimientos de datos (cada uno = 1 CFP)

```
                       functional user
                          │      ▲
                  Entry(E)│      │Exit(X)        (cruzan la boundary)
                          ▼      │
                  ┌───────────────────────┐
                  │   functional process  │
                  └───────────────────────┘
                          ▲      │
                   Read(R)│      │Write(W)
                          │      ▼
                      persistent storage
```

- **Entry (E):** mueve un data group DESDE un functional user HACIA el proceso (cruza boundary).
- **Exit (X):** mueve un data group DESDE el proceso HACIA un functional user (cruza boundary).
- **Read (R):** mueve un data group DESDE persistent storage HACIA el proceso.
- **Write (W):** mueve un data group DESDE el proceso HACIA persistent storage.

> Manipulación/cálculo de datos NO se cuenta aparte: se asume incluida en los movimientos.

## Reglas de medición

- Tamaño de un **proceso funcional** = nº de sus movimientos de datos (E+X+R+W).
- **Mínimo 2 CFP** por proceso: al menos 1 Entry + (1 Exit o 1 Write).
- Un movimiento de un **tipo dado** sobre un **data group dado** se cuenta **una vez por
  proceso funcional** (movimientos idénticos repetidos no se duplican).
- **Tamaño total** = Σ (tamaños de todos los procesos funcionales) dentro del scope.
- **Cambio** (mantenimiento): se cuenta sumando movimientos **añadidos + modificados + borrados**.

## El procedimiento COSMIC (3 fases)

1. **Measurement Strategy** — definir: propósito de la medición, **scope**, **functional
   users**, nivel de granularidad, y la **boundary**.
2. **Mapping** — derivar de los FUR: los **procesos funcionales**, sus **data groups** y
   sus **movimientos de datos** (E/X/R/W).
3. **Measurement** — contar movimientos y agregar a tamaño por proceso y total.

## Qué hay que recolectar para aplicarlo (checklist)

- [ ] Propósito y **scope** de la medición (qué software/capa, qué versión).
- [ ] **Functional users** y la **boundary** (UI↔API, API↔gateway de pago, etc.).
- [ ] Inventario de **procesos funcionales** (1 por triggering event / caso de uso elemental).
- [ ] Por proceso: **data groups** que entran/salen y los **reads/writes** a storage.
- [ ] Nivel de granularidad consistente (no mezclar épicas con sub-acciones).

## Implicación para el skill THYROX

El skill COSMIC vive en la fase **MEASURE/BASELINE**: toma los FUR/casos de uso producidos
en DISCOVER/DESIGN y emite un **measurement strategy + mapping + conteo CFP**. Encaja con
`workflow-baseline` y complementa `dmaic-measure`/`lean-measure` (que miden proceso, no
tamaño funcional del software).

---

**Última actualización:** 2026-06-03T02:13:59
