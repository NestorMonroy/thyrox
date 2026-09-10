---
name: Loop de análisis contra la referencia
description: Ciclo continuo de análisis + documentación guiado por la referencia Odoo (odoo-tools). Cada iteración mide contra el árbol que gobierna, documenta el hallazgo con citas PROVEN y nombra la siguiente decisión. Usar con /loop para encadenar N decisiones. STOP cuando la referencia no cubre el caso.
---

# /thyrox:loop-analyze — Análisis continuo contra la referencia

Analiza **una** decisión pendiente contra la referencia Odoo, la documenta, y
**nombra la siguiente**. Diseñado para encadenarse:

```
/loop 15m /thyrox:loop-analyze
```

## Qué lo distingue de los comandos vecinos

| Comando | Qué hace | Entrada |
|---|---|---|
| `/thyrox:analyze` | **Una** fase (Stage 3) de un WP: causa raíz | El WP activo |
| `/thyrox:loop` | Ejecuta la siguiente `T-NNN` **ya planificada** | El `tareas-<slug>.rst` |
| **`/thyrox:loop-analyze`** | **Produce** la decisión: mide, documenta, nombra la siguiente | La salida de su propia iteración anterior |

La diferencia operativa está en la última columna. `/thyrox:loop` consume un
plan que ya existe; **este loop no tiene plan que consumir** — cada ciclo
genera el insumo del siguiente. Por eso el paso 6 (nombrar la siguiente
decisión) no es cortesía de cierre: es lo que permite que haya iteración N+1.

## Principio rector del loop — la referencia gobierna

**`odoo-tools` decide la forma.** Antes de proponer un estado, campo, enum,
relación, nombre o flujo, la pregunta es *¿la referencia ya lo modela?*, y se
responde con evidencia, no de memoria. Regla completa:
`.claude/rules/referencia-odoo-gobierna-las-decisiones.md`.

Alias y árbol que rige (`convencion-cita-referencia-odoo.rst`):

| Alias | Qué designa | Rol |
|---|---|---|
| `odoo19c:` | Odoo 19 Community | **El que gobierna** |
| `odoo19e:` | Odoo 19 Enterprise | Otra población — no sumar a 19c |
| `odoo18c:` | Odoo 18 Community | Se analiza y adapta; si difiere de 19, gobierna 19 |
| `odoo18e:` | Odoo 18 Enterprise | Ídem |

**Las rutas reales viven en la convención, no aquí** — el árbol está triplicado
en el repo (`19.x/odoo-19.0/odoo-19.0/odoo-19.0/`) y hay empaquetados duplicados
de Enterprise 18 que **no llevan alias**. Copiar una raíz de memoria es cómo se
mide la población equivocada. La cita anota siempre el commit de `odoo-tools`.

Todo lo demás bajo `19.x/` y `18.x/` **no es Odoo** (addons de terceros,
volcados de instalación, re-extracciones). No se cita ni se suma.

---

## Instrucciones de ejecución

### 1. Situar la referencia y anotar su commit

```bash
cd /home/user/odoo-tools && git log -1 --format=%H && git status --short
```

Toda cita de esta iteración anota **ese commit**. Si el working tree no está
limpio, o si `origin` avanzó, ver "Reglas de STOP".

### 2. Greppear el destilado ANTES de ir al árbol

El árbol tiene ~121 000 archivos; el destilado responde en un `grep`. Buscar
**por tema, no por carpeta** — los análisis relevantes están repartidos en
varias iniciativas:

```bash
grep -rli "<tema>" /home/user/kaupamex-docs/source/gestion/pm/api/iniciativas/*/analisis-*.rst
```

- **Hay respuesta** → reportar `YA CUBIERTO en <archivo>`, citarlo, y saltar al
  paso 6. No re-medir lo ya destilado (H-API-100).
- **No hay** → continuar al paso 3.

### 3. Leer la referencia

```bash
# La raíz sale de la convención, no de memoria (ver la nota de la tabla):
ODOO19C=/home/user/odoo-tools/19.x/odoo-19.0/odoo-19.0/odoo-19.0
```

Leer el archivo completo, no el fragmento que confirma la hipótesis. Antes de
copiar cualquier cosa, la licencia sale **del manifiesto concreto**:

```bash
grep -oP "['\"]license['\"]\s*:\s*['\"]\K[^'\"]+" $ODOO19C/addons/<addon>/__manifest__.py
```

**No hay atajo de licencia** — ni por árbol, ni por alias, ni por directorio.
Medido: `odoo18c: addons/` (el directorio "community") contiene 4 manifiestos
`OEEL-1`, y su `enterprise/` contiene 609 `LGPL-3` (H-API-188).

### 4. Medir, declarando la ceguera del instrumento

Junto a **cada** cifra que se vaya a publicar, dos líneas
(`.claude/rules/metrica-decide-la-conclusion.md`):

```
Métrica: <qué cuenta exactamente>.
Ciega a: <qué fenómeno real no aparecería aunque existiera>.
```

Si "Ciega a:" incluye el fenómeno sobre el que se va a concluir, **no se emite
la conclusión**: se cambia el instrumento o se declara DESCONOCIDO.

**Cuatro trampas de instrumento, todas medidas en este proyecto.** Son baratas
de evitar y caras de descubrir tarde:

| Trampa | Síntoma | Forma correcta |
|---|---|---|
| `grep` sin anclar | cuenta `X.py.template` como `X.py` (+6 de 1 943) | `find -name "X.py"` o `grep "/X\.py$"` |
| una comilla sola | pierde lo escrito con la otra (9 de 73) | `['\"]` en el patrón |
| un comando, dos afirmaciones | una viaja gratis con la `Observation` de la otra | una afirmación, un comando |
| cifra de ausencia escrita **dentro** del árbol medido | el `→ 0` deja de ser cierto al publicarse | `\| grep -v <archivo-citante>` en el propio comando |

Y una de población: **`find` sobre `19.x/` o `18.x/` no mide la referencia** —
mide varios árboles a la vez. Anclar al árbol nombrado y publicar el nombre al
lado de la cifra (H-API-76).

### 5. Documentar — el hallazgo, no sólo la conclusión

Destino según `.claude/rules/hallazgos-documentacion-obligatoria.md`:
`source/gestion/pm/<submodulo>/audits/hallazgos-<slug>.rst`, formato
`H-<TIPO>-<NN>` con **Severidad**, **Premisa verificada** (`file:line` +
`[PROVEN]`), **Descripción** y **Estado**.

Se documenta **en el mismo pase**, no "cuando se implemente": un análisis que
destapa drift y lo deja sólo en el análisis lo esconde del registro de deuda.

Validar el RST sin `make html`:

```bash
cd /home/user/kaupamex-docs && uv run python -c "
from docutils.core import publish_doctree
from docutils.parsers.rst import roles
from docutils import nodes
stub = lambda n,r,t,l,i,o=None,c=None: ([nodes.literal(r,t)], [])
[roles.register_local_role(x, stub) for x in ('ref','doc','term','numref')]
publish_doctree(open('<archivo>').read(),
                settings_overrides={'report_level':2,'halt_level':5})
print('parsed OK')"
```

Salida limpia = sin warnings. Los dos que reaparecen: **subrayado corto**
(acentos y em-dash cuentan) y **énfasis anidado** (`**x**` dentro de `*"…"*`).

### 6. Nombrar la siguiente decisión — el paso que cierra el ciclo

Cerrar el hallazgo con **qué queda por decidir y por qué es lo siguiente**.
Cuatro desenlaces posibles, y los cuatro son válidos:

1. **Cierra y destapa** — el análisis resuelve lo suyo y deja nombrada una
   pregunta concreta. Esa es la iteración N+1.
2. **Cierra limpio** — no destapa nada. La siguiente sale del backlog o del
   `progreso-<slug>.rst`.
3. **Corrige hacia atrás** — lo medido invalida algo ya publicado. La
   corrección **entra en este pase** (Clausula 2 del principio rector), no en
   uno futuro.
4. **Excede el alcance** — se abre sub-iniciativa explícita **antes** de
   cerrar (Clausula 4). Nunca diferir sin crearla.

### 7. Commit

Tim Pope (`.claude/rules/commit-conventions.md`), author Nestor / committer
jcg-admin (`.claude/rules/git-author-identity.md`). Si el ciclo tocó código:
**dos commits** — primero el repo de código, después `docs` citando
`repo@hash`. Si tocó submódulo, bumpear el gitlink
(`.claude/rules/gitlink-bump-gate.md`).

### 8. Reportar

Una línea: `[H-<TIPO>-NN] ✓ {qué se decidió} → siguiente: {qué}`

---

## Reglas de STOP

| Condición | Qué hacer |
|---|---|
| **La referencia no cubre el caso** | Decirlo **antes** de proponer: *"la referencia no cubre esto; lo que sigue es invención"*. Una propuesta inventada no es un error; presentarla como derivada, sí. |
| **Dos instrumentos discrepan** | No publicar. Arbitra el que mide el objeto real (el disco, no el índice). |
| **`odoo-tools` avanzó en `origin`** | Medir los **cuatro** árboles con alias antes de seguir. **No hacer `pull`** sin indicación del ejecutor. |
| **Working tree sucio en `odoo-tools`** | STOP: el árbol de referencia no se modifica. Investigar antes de medir sobre él. |
| **La decisión es arquitectónica o irreversible** | STOP: es del ejecutor, no del loop. |
| **La licencia del addon es propietaria** (`OEEL-1`/`OPL-1`) | No copiar. Reimplementación nativa (DEC-KX-03), y decirlo en el hallazgo. |
| **Licencia sin precedente** (p. ej. `AGPL-3`) | STOP: DEC-KX-03 no fija postura. Se decide antes, no se deriva del precedente de `LGPL-3`. |
| **El destilado ya responde** | `YA CUBIERTO`, citar y pasar a la siguiente. No duplicar. |

> Ausencia de respuesta ≠ aprobación. Ante un STOP, esperar — no auto-continuar.

---

## Uso recomendado

```bash
/loop 15m /thyrox:loop-analyze     # cadencia normal
/loop 30m /thyrox:loop-analyze     # análisis densos (lectura de árbol amplia)
```

Sin intervalo, `/loop` se auto-pacea: útil cuando cada iteración varía mucho
en tamaño.

## Por qué el paso 4 ocupa tanto espacio

Porque es donde este loop falla. Los defectos registrados —H-API-76, 100, 186,
187, 188, 189— **no** son de dato ni de razonamiento: son de instrumento. La
cifra se midió, la salida se leyó, y la conclusión era falsa porque la métrica
no podía ver el fenómeno.

Eso hace que pasen el `react-verification-gate`: vienen con `Observation`. El
paso 4 es el único filtro que los atrapa antes de publicarlos, y aun así es
prosa — **red de detección, no de prevención**
(`.claude/rules/metrica-decide-la-conclusion.md`). Cuando una medición se pueda
mecanizar, se mecaniza; si no, se declara la ceguera y queda auditable.

## Referencias

- `.claude/rules/referencia-odoo-gobierna-las-decisiones.md` — el principio del loop
- `.claude/rules/metrica-decide-la-conclusion.md` — la ceguera del instrumento
- `.claude/rules/hallazgos-documentacion-obligatoria.md` — dónde y cómo documentar
- `.claude/rules/react-verification-gate.md` — ninguna afirmación sin `Observation`
- `.claude/rules/principio-rector-rup-arquitectura.md` — Clausulas 2 y 4
- `.claude/commands/loop.md` — el loop hermano, de ejecución
