```yml
type: Reference (lazy-load on-demand)
applies_when: Bulk edits scriptables (>10 archivos, regla expresable como regex/AST transform)
created_at: 2026-04-29 05:51:27
status: Aprobado
version: 1.0.0
```

# Mechanical Bulk Edits — Micro-cycle

> **Adaptacion kaupamex (2026-05-19):** Las menciones a "sesion IACT-docs"
> y a paths `.thyrox/context/work/<WP>/` son del template original. El
> patron micro-cycle aplica igual en kaupamex; cuando se referencia un
> work package historico de IACT-docs, en kaupamex el equivalente seria
> `docs/source/gestion/pm/<submodulo>/iniciativas/<slug>/`. La leccion
> metodologica (small batches, verify, commit) no cambia.

Cargar esta reference cuando el trabajo califica como **edit mecanico
masivo**: regla aplicable a >10 archivos, expresable como regex/AST
transform, con ground truth verificable (build, tests, linter).

## Cuando NO usar el ciclo THYROX completo de 12 fases

El ciclo de 12 fases es **defensivo** — apropiado cuando:
- Stakes altos (decisiones arquitectonicas, cambios irreversibles).
- Ambiguedad alta (problema mal definido, stakeholders multiples).
- Trabajo compartido (varios contributors, hand-offs).

Para trabajo mecanico repetitivo con feedback loop barato (`make`,
linter, test suite que corre en <60s), las 12 fases son overhead.

## Micro-ciclo de 5 pasos

### 1. Diagnose

- Tomar 1-2 samples concretos del bug.
- Escribir la regla en una linea.
- Estimar volumen total (`grep -c <pattern>` sobre el corpus).

### 2. Pilot

- Aplicar el fix a **1 archivo aislado** (no el archivo mas representativo,
  preferentemente el mas raro — si funciona ahi, funciona en el resto).
- `make`/`tests`/`lint` antes y despues.
- Verificar delta esperado: `-N issues` en este archivo.
- **Verificar NO daño nuevo:** ningun warning/error que no existia antes.

### 3. Measure baseline

- Contar issues totales **antes** de aplicar global.
- Snapshot del estado: `make 2>&1 | grep -c WARNING`, etc.

### 4. Apply + Measure

- Aplicar global.
- Contar issues totales **despues**.
- Comparar: delta debe ser ≥ baseline_archivo × n_archivos_modificados (orden de magnitud).

### 5. Regression check antes de commit

- Si delta es **negativo o cero** -> revert, refinar regla, volver a 2.
- Si delta es **positivo pero pequeño** (<<n_archivos) -> investigar
  por que solo algunos casos se arreglaron; refinar.
- Si delta es **positivo y proporcional** -> commit con `Refs: <WP-id>`.

## Anti-patron documentado

Sesion IACT-docs 2026-04-29 (saneamiento md->rst): 3 scripts de fix
aplicados global **sin PILOT**. Cada uno produjo regresion:

- `fix_bullet_wrap.py` v1 (heuristica estricta): 374 -> 13838 warnings.
  Revertido. Sample en 1 archivo habria detectado en 30s.
- `fix_subbullet.py` v1 (stack-based agresivo): 374 -> 13838 warnings.
  Revertido.
- `plantuml_syntax_error_image=True` flag: alteraba semantica del
  build sin medir frecuencia real de fallos. Revertido.

Costo: ~20 min revertir + re-escribir cada uno. PILOT en 1 archivo
(30s c/u) habria detectado los 3 antes de tocar el resto del corpus.

Ver: `.thyrox/context/work/2026-04-29-05-35-11-md-to-rst-saneamiento/
discover/scripts-reference.md`.

## Trampa de orden: una cadena corta que es prefijo de otra larga

Sesión kaupamex 2026-08-07 (repunte de las reglas heredadas del template).
Distinto del anti-patrón de arriba: **aquí sí había gate** —cada sustitución
llevaba su `assert a in t`— y el gate atrapó el fallo sin escribir nada. El
defecto no fue de proceso sino de **orden**.

La lista de sustituciones era, en ese orden:

```python
sub = [
  ('.thyrox/context/work/{wp}/', 'docs/build-logs/{slug}/'),          # ← corta
  ('sphinx-build ... > .thyrox/context/work/{wp}/discover/build-logs/…'),  # ← larga
]
```

La corta es **prefijo** de la larga. Al aplicarse primero reescribió su
fragmento **dentro** de la línea de la larga, y la larga dejó de encontrar su
ancla: `AssertionError`. El script abortó antes de `write_text`, así que el
archivo quedó intacto — el fallo fue **visible en vez de silencioso**, que es
justo lo que el `assert` compra.

**Técnica:** ordenar las sustituciones **de la cadena más larga a la más
corta**. Cuando dos anclas comparten prefijo, la específica va primero.

```python
# Los asserts NO bastan si el orden está mal: el primero muta el texto
# que el segundo busca. Ordenar por longitud descendente lo cierra.
for a, b in sorted(sub, key=lambda p: -len(p[0])):
    assert a in t, a[:60]
    t = t.replace(a, b)
```

**Segundo tropiezo del mismo pase, y es el más caro:** renombrar una variable
(`WP=` → `LOGDIR=`) **sin** renombrar sus usos (`$WP/{stage-dir}/…`). El
`assert` no lo ve —la sustitución que pidió existía y se aplicó— y el
resultado es un bloque **medio portado** que parece corregido. Sólo lo destapó
releer el diff.

**Regla que se desprende:** tras una edición mecánica, **greppear el símbolo
viejo, no sólo la cadena sustituida**. Un `assert` verifica que la sustitución
ocurrió; no verifica que el archivo quedó coherente.

## Casos donde aplica

- Migraciones de sintaxis (md->rst, ES5->ES6, Python 2->3).
- Saneamiento de estilo (renames, indentacion, formato).
- Bulk de imports/exports.
- Reemplazos de API deprecada.

## Casos donde NO aplica (usar 12-phase)

- Refactor con cambios semanticos (no syntax).
- Fix con multiples soluciones posibles (require ANALYZE).
- Cambios que tocan contratos publicos (require DESIGN/SPECIFY).
- Bug fixes individuales (no son bulk).

## Por que vive en references/, no en .claude/rules/

Esta guia es **prescriptiva de proceso para un subdominio** (trabajo
mecanico bulk), no prohibitiva ni estructural. `.claude/rules/` carga
siempre (I-009); el costo permanente no se justifica para una guia
aplicable a una fraccion del trabajo total.

Decision documentada en WP
`2026-04-29-05-51-27-methodology-recalibration/plan/correction-plan.md`
(accion A3).
