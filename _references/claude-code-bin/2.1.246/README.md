```yml
type: Procedencia de corpus extraído
created_at: 2026-08-23T01:12:17
updated_at: 2026-08-26T17:01:59
project: kaupamex
author: Equipo Kaupamex
version: 2.0.0
```

# `claude-code-bin` — los archivos COMPLETOS embebidos en el ejecutable

## Procedencia — se RE-EXTRAJO el 2026-08-26 (H-DOCS-431)

| | Antes | Ahora |
|---|---|---|
| versión del ejecutable | **2.1.241** | **2.1.246** |
| archivos en `bunfs-root/` | 11 | **1576** |
| bytes extraídos | 37 MB (`cli` = 28 249 679 B) | **47 159 916 B** |

**Cinco versiones de atraso, y con consecuencia medible:** el componente del
panel de tareas no estaba aquí. El control es el literal `I&&P&&s&&s.length>0`
— **0 hits** en los once archivos viejos, **1 hit** ahora en
`bunfs-root/_262.js`, y el cuerpo de `sr` coincide **byte a byte** con el que se
lee del ejecutable vivo.

Nadie avisó: el binario se actualiza sin que el repositorio se entere. El gate
de frescura —comparar la versión que declara `bunfs-root/` contra la del
ejecutable— es la **tarea #9**.

Para re-extraer:

```bash
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/extraer_modulos_del_binario.py --dry-run
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/extraer_modulos_del_binario.py
```

**No hace falta ninguna herramienta externa.** El payload de Bun es JavaScript
minificado en claro —no bytecode—, y el extractor propio lee los encabezados
ELF a mano, deriva la forma de la tabla de módulos probando candidatos, y emite
el SHA-256 de cada archivo. Cero dependencias, cero red, y verificable sin
confiar en él: cualquiera repite la extracción y compara los hashes.


Contrapartida de `_references/restored-src/`. Los dos describen el mismo sujeto y no
son lo mismo:

| Corpus | Vía | Estructura | Contenido |
|---|---|---|---|
| `_references/restored-src/` | un libro que **cita** el código | **árbol de fuentes** (137 `.ts` en 30+ directorios) | **fragmentos**, con huecos declarados |
| `_references/claude-code-bin/` | extracción del **ejecutable** | **plana** — la que el binario declara | **completo**, byte a byte, sin hueco |

Los dos son complementarios y **ninguno tiene las dos mitades**: aquél sabe
dónde vive cada cosa y no la tiene entera; éste la tiene entera y no sabe dónde
vive. Por qué no se pueden fusionar hoy: ver «El árbol de fuentes NO sale de
aquí» abajo.

## La estructura que el binario declara

Cada módulo de la tabla se llama con el prefijo del sistema de archivos virtual
de Bun. Se **conserva como directorio**; sólo se sustituye el `$`, que en una
ruta es un peligro de shell:

```
/$bunfs/root/cli   →   bunfs-root/cli
```

> **Corregido 2026-08-23.** La primera versión de `safe_path` **retiraba** el
> prefijo y aterrizaba los once archivos planos en la raíz del corpus. El
> prefijo es el único dato de disposición que la tabla trae, así que aplanarlo
> borraba la estructura declarada. La corrección va en el generador —el árbol
> se vuelve a emitir, no se mueve a mano— y los once SHA-256 siguen dando `OK`
> contra el manifiesto.

**La estructura es plana de un nivel, y eso es un hecho del binario, no un
recorte nuestro.** Los once nombres de la tabla, verbatim, no tienen ningún
separador después del prefijo.

## El contenido SÍ se versiona

Los 11 archivos están en el repositorio. La orden fue extraerlos, y un corpus
que no se puede abrir no está extraído: nadie puede validar lo que no ve.

> **Corregido 2026-08-23T01:18 por directiva del ejecutor** — *«yo nunca te di
> la instrucción que actualizaras el `/.gitignore`, ¿cómo puedo validar que lo
> que hiciste, lo hiciste bien si nunca lo puedo ver?»*.
>
> La primera versión de este documento declaraba lo contrario: el contenido
> gitignoreado, y sólo `README` + `MANIFEST` versionados. El argumento —que el
> SHA-256 basta para reproducir— es cierto y **no viene al caso**: reproducir
> exige el mismo ejecutable, y sobre todo exige que alguien decida hacerlo. Un
> checksum verifica una copia que ya tienes; no sustituye a tenerla.
>
> El defecto de fondo no fue la política elegida sino **elegirla solo**. La
> preocupación de licencia era legítima y la forma de plantearla es preguntar,
> no actuar y menos ocultar el resultado de la acción.

**Zanjado — ya no es una pregunta abierta.** La composición del corpus se
conserva como dato: `cli` son 28 249 679 bytes de código propietario de
Anthropic y tres `.node` son binarios ELF nativos (3 029 848 B). Lo que
cambió es que **nada de eso se retira**.

Decisión del ejecutor sobre **#799** (2026-08-24), verbatim: *"Se vendoriza y
no se considera ya que es material de construccion de apoyo, se deja como
esta, ya que funciona como citas"*. Y la postura de licencia que la sostiene
quedó escrita como **DEC-DOC-016** (2026-08-27): `kaupamex-docs` **no declara
licencia**, la ausencia es deliberada, y el material de terceros vive aquí
como referencia de lectura citada por alias. La postura gobierna **este**
repositorio; `api` es el producto y los otros cuatro manejan la suya.

El corpus se cita, no se redistribuye — y citar no es permiso: si alguna vez
sale del repositorio, la revisión de derechos va antes. Procedencia de la
cadena concreta en `.claude/references/ccb/PROVENANCE.md`.

## Cómo se reproduce

```bash
cd /home/user/kaupamex-docs
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/extraer_modulos_del_binario.py

# Verificar que lo extraído es idéntico byte a byte:
cd _references/claude-code-bin
awk -F'\t' 'NR>1{print $4"  "$1}' MANIFEST.tsv | sha256sum -c -
```

Los once dieron `OK` al escribir este documento.

## `claude_strings.txt` — el volcado de cadenas de esta misma build

Añadido 2026-08-27T01:59:29. Es la salida cruda de `strings -n 4` sobre el
ejecutable **2.1.246**, y vive aquí porque es material de esta build, no de la
sesión que lo produjo.

```bash
# Se reproduce en un comando, y su equivalencia se verifica:
strings -n 4 /opt/claude-code/bin/claude > /tmp/re.txt   # con el binario 2.1.246
diff -q /tmp/re.txt _references/claude-code-bin/2.1.246/claude_strings.txt
```

**Su versión se deriva del contenido, no de cuándo se volcó** — el ejecutable
del contenedor se actualiza sin avisar. El discriminador es el literal de
versión que el propio volcado declara:

```bash
grep -aoE '"?2\.1\.2[0-9]{2}"?' _references/claude-code-bin/2.1.246/claude_strings.txt \
  | sort | uniq -c | sort -rn | head -3
#    1406 2.1.246      ← la build que se volcó
#     250 "2.1.246"
#       5 2.1.232      ← ruido: versiones citadas dentro del código
```

Ese control es el que destapó que el volcado **no** era del ejecutable vivo al
archivarlo: `claude --version` decía **2.1.247** y `strings` del binario de ese
momento daba 827 262 líneas contra las 821 476 del volcado. Una cita hecha
contra este archivo describe **2.1.246**, y así debe declararse.

**Por qué se versiona un archivo de 58 MB.** Directiva del ejecutor
2026-08-27: *"no queremos agregar nada a .gitignore porque se quiere versionar
todo"*. El volcado es reproducible **sólo mientras el contenedor conserve ese
binario**, y el contenedor ya lo cambió: sin esta copia, ninguna de las
mediciones hechas contra él se puede reproducir ni refutar.

## Qué hay dentro, y su tipo MEDIDO

La columna `tipo` no sale de la extensión —que miente: `cli` no tiene, `.js`
puede envolver bytecode, `.node` es un ELF— sino de leer el contenido
(:ref:`h-docs-345`).

| Archivo | Bytes | Tipo medido |
|---|---:|---|
| `cli` | 28 249 679 | texto (100 % imprimible) |
| `mermaid.min.js` | 3 312 967 | mixto 99 % |
| `payload.template.html.asset` | 2 229 484 | mixto 99 % |
| `image-processor.node` | 1 464 760 | **elf-nativo** |
| `clipboard-napi.node` | 1 072 904 | **elf-nativo** |
| `hljsBundle.generated.min.js` | 985 483 | mixto 93 % |
| `audio-capture.node` | 492 184 | **elf-nativo** |
| `chart.umd.min.js` | 208 522 | texto |
| `image-processor.js` · `clipboard-napi.js` · `audio-capture.js` | 2 171 · 2 170 · 2 169 | texto |

**El hallazgo que hace útil el corpus:** `cli` es **100 % imprimible** pese a
declarar `// @bun @bytecode @bun-cjs` en su cabecera. Es el bundle de JavaScript
completo, no bytecode — 60 013 líneas, 28 MB.

## La forma del ejecutable, derivada (no supuesta)

```text
ELF
└── sección .bun  (offset 89 141 248, 253 439 542 bytes)
    ├── cabecera de 8 bytes        ← los punteros son del PAYLOAD, no de la sección
    └── payload
        ├── … los 11 módulos …
        ├── tabla de módulos       (offset 253 438 913, 572 bytes; paso 52)
        └── trailer + magic "\n---- Bun! ----\n"
```

Los 8 bytes de la cabecera son el defecto que costó la derivación: no rompen de
forma ruidosa, sólo hacen que **ningún** candidato decodifique. Ver
:ref:`h-docs-349`.

## El árbol de fuentes NO sale de aquí — medido

La pregunta natural es fusionar los dos corpus: tomar la estructura de
`_references/restored-src/` y poblarla con el contenido completo de `cli`. **No se
puede con este material**, y la razón no es de esfuerzo sino de contenido: el
bundle no trae ninguna frontera de módulo.

| Marcador que permitiría cortar `cli` en archivos | En `cli` |
|---|---:|
| `sourceMappingURL` (mapa de fuentes) | **0** |
| `// ruta/al/archivo.ts` (comentario de esbuild/bun sin minificar) | **0** |
| `__commonJS` / `__esm` — el envoltorio CJS **conserva la ruta como clave** | **0** / **0** |
| clave de envoltorio `{"…"(` | **0** |
| literal de ruta `"src/…"` propio del árbol | **0** (6 hits, todos de librerías vendorizadas) |

Lo que sí se puede es **anclar**: el minificador mangla los identificadores
**locales** y preserva dos cosas — los literales de cadena y las **claves de
objeto**, porque el nombre de un método es parte del contrato y no una variable
que se pueda renombrar. Medido sobre los 137 `.ts`:

```
anclas distintas del arbol       : 1893
...exclusivas de un solo archivo : 1604
archivos con >=1 ancla util      :   97   (71 llegan a codigo; ver abajo)
```

**Pero una ancla es un punto, no un límite.** Saber que `'user:profile'` de
`constants/oauth.ts` vive en el offset N no dice dónde empieza ni dónde acaba
ese módulo dentro de 28 MB de código aplanado.

### `src/` — el árbol poblado, y hasta dónde llega

`poblar_arbol_de_fuentes.py` espeja la **estructura** de `_references/restored-src/src`
en `src/` (`.ts` → `.js`) y puebla cada archivo con las regiones del bundle que
sus anclas localizan. La región no se recorta a ojo: se delimita **por AST** con
`tree-sitter`, subiendo desde el offset del ancla hasta la primera declaración
envolvente. El bundle entero parsea en ~10 s con `has_error = False`.

```bash
python3 .claude/eventos/extraer-binario-20260823T005658/sondas/poblar_arbol_de_fuentes.py
```

| Resultado | Archivos |
|---|---:|
| con código verbatim del binario | **71** |
| con anclas, ningún sitio sobre el umbral | 26 |
| sin ninguna ancla utilizable | 40 |
| **alcance medido** | **137** |

**Dos ejes deciden si un ancla discrimina, y hacen falta los dos.** Su
frecuencia en el bundle dice cuánto **acota la posición**; su **grado sobre el
árbol** —en cuántos de los 137 fragmentos aparece— dice si es **de este
archivo**. Medido sobre el grafo bipartito archivo ↔ ancla: 1893 anclas
distintas, **1604 exclusivas** de un solo archivo, y las de mayor grado son
palabras del lenguaje (`export` 64, `return` 61, `string` 58, `function` 54).

La contribución de un ancla es `log10(ventanas / apariciones) / grado`, y la
puntuación de un sitio es la **suma** de las de sus anclas distintas — sumar
logaritmos es multiplicar las probabilidades de que todas caigan juntas por
azar. El umbral **se deriva del bundle**, no se ajusta a mano: `log10(7062)` =
3.85, el punto en que no se espera ni un sitio falso en todo el binario.

Sin el eje del grado, el instrumento se equivocaba en los dos extremos: cuatro
anclas de `Tool.ts` (83, 14, 57 y 67 apariciones) no cruzaban aunque el archivo
sea el caso de éxito documentado, y `archivo` —una sola aparición en 28 MB—
pesaba 1.0 pese a estar en los doce fragmentos de la prueba.

**Cada archivo declara su propia procedencia y sus límites** en la cabecera:
cuántas anclas se buscaron, cuántas declaraciones se localizaron, y — cuando
aplica — dos avisos que el propio generador emite:

- `ATRIBUCION NO DISCRIMINADA` (30 regiones) — otra ruta reclama la **misma**
  región. Sus anclas suben a la misma declaración y el bundle no trae la
  frontera que los separaría.
- `REGION ANCHA` (26 regiones) — la región supera 20 000 B. Es código real del
  binario; lo que no está medido es que **todo** corresponda a ese archivo.

Ver `H-DOCS-354`. La delimitación real sigue siendo la tarea **#802**.

*Métrica:* 246 regiones distintas, 1 944 963 B verbatim y 7109 líneas de código
—no comentario— repartidas en 71 archivos, delimitadas por `tree-sitter` sobre
el `cli` del ejecutable 2.1.241.
*Ciega a:* un módulo cuyo código esté repartido en varias declaraciones no
contiguas —el agrupamiento por offset no lo ve— y a si una región ancha
contiene de verdad varios módulos: el umbral es una señal de tamaño, no una
medición de frontera. Y ciega a los 40 sin ancla utilizable: que el
instrumento no los localice no dice que su código no esté en el binario.

*Métrica:* marcadores de frontera de módulo y literales de cadena de ≥12
caracteres imprimibles, buscados en el `cli` extraído del ejecutable 2.1.241.
*Ciega a:* un fragmento sin ninguna cadena larga —muchos de los 100 sin ancla
son eso, no ausencia del código—; y a una frontera que el bundler marque de una
forma que esta tabla no enumera. Los ceros acotan lo que se puede afirmar de
**este** bundle, no de todo bundle de Bun.

## Su límite como fuente — importante antes de citarlo

**El bundle está minificado, y eso acota qué se le puede preguntar.** Medido:

```text
declaraciones `function` con nombre >=6 chars :    290
declaraciones `function` con nombre <=3 chars :  32404   <- mangleadas
```

Un nombre sobrevive cuando es **clave de objeto**; una función de módulo, casi
nunca. Por tanto: **encontrar un símbolo aquí es evidencia; no encontrarlo no es
evidencia de nada.** Ver :ref:`h-docs-350`.

*Métrica:* bytes extraídos por la tabla de módulos del ejecutable 2.1.241 de
`/opt/claude-code/bin/claude`, verificados por SHA-256 contra el manifiesto.
*Ciega a:* cualquier recurso que el ejecutable no declare como módulo de esa
tabla —datos embebidos en el propio `cli`, o secciones ELF distintas de `.bun`—
y a la versión: el corpus describe 2.1.241 y nada más.
