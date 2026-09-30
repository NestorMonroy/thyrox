# Izar las dependencias a la raíz, como la referencia

`TASK-THYROX-0224` (board #532), que absorbe **#448** — son la misma obra vista
desde dos ángulos: aquélla pregunta *qué paquetes no declaran lo que importan*,
ésta *dónde va la línea*. La respuesta a la segunda decide la forma de la
primera, así que no se podía cerrar una sin la otra.

## La pregunta, y por qué su respuesta NO se elige

El censo heredado (`deps-sin-declarar-repl-20260919T082130`) dejó **90**
dependencias sin declarar en 19 paquetes. La tentación era escribir 90 líneas,
una por manifiesto. La forma **se lee de la referencia**, y la referencia dice
lo contrario:

| | claves en `devDependencies` |
|---|---|
| `ccnmt: package.json` (RAÍZ) | **136** |
| `ccnmt: packages/agent/package.json` | 1 (`zod`) |
| `ccnmt: packages/cli/package.json` | 1 |
| `config` · `tool-registry` · `output` · `command-runtime` | **0** |

La referencia **iza**: declara en la raíz del workspace y deja los paquetes
casi vacíos. Nuestra raíz tenía **8** claves. Escribir 90 líneas por paquete
habría divergido de la fuente y habría creado el trabajo que #448 luego
deshace.

## El instrumento heredado era una COTA INFERIOR — tres cegueras medidas

`probes/classify_undeclared_deps.py` sucede al censo con tres cierres, cada uno
medido antes de escribirlo:

| # | Ceguera | Medición |
|---|---|---|
| 1 | **`import()` dinámico** invisible: su patrón era `(?:from\|import\|require\()\s*['"]` y entre `import` y la comilla hay un paréntesis | **19** nombres de paquete llegan **sólo** por `import()` (383 specifiers externos): `@aws-sdk/*`, `@azure/identity`, `@smithy/*`, `@anthropic-ai/*-sdk`, los tres `@thyrox/*-napi`, `cacache`, `cli-highlight`, `fflate`, `plist`, `selfsigned`, `sharp`, `turndown` — que el censo de 90 nunca nombró. Los publica `probes/remeasure_dynamic_imports.py` |
| 2 | **Autorreferencia**: un paquete con `exports` puede importarse por su propio nombre | PROVEN por conducta desde `src/packages/agent`: `await import('@thyrox/agent/idTypes')` → `OK — exports: asAgentId,asSessionId,toAgentId`. Son **3** (`agent`, `cli`, `tool-registry`) y no son deuda |
| 3 | **El izado**: su docstring afirmaba *«sin esa línea el import no resuelve»* | Falso en un workspace. `react` lo importan 8 paquetes sin declararlo y da **0** TS2307, porque la raíz sí lo declara |

> **Corregido 2026-09-19T10:54:49 (:ref:`h-thyrox-129`).** Esta fila decía
> *«**1693** llamadas `import(...)` en `src/packages`»*, y la cifra llegó sin el
> comando que la produce. No reproduce: `probes/remeasure_dynamic_imports.py`
> enumera **doce** lecturas del enunciado y ninguna da 1693 — la más próxima es
> **1697**, la familia *llamada*, que cuenta todo `import(` incluido el de
> argumento variable y el de posición de tipo. Esa familia no puede sostener
> nada sobre dependencias: una llamada sin specifier literal no se reduce a
> nombre de paquete. Lo que sostiene *«el censo de 90 era una cota inferior»*
> son **19 nombres**, y la conclusión sobrevive entera — sólo su magnitud era
> otra. Sub-patrón A con el propio hallazgo que cierra una ceguera como sujeto.

Por la 3, este instrumento **mide la resolución por conducta** (`bun -e "await
import(X)"` desde el directorio del paquete), no la infiere del manifiesto. Su
control: un paquete que no puede existir da exit 1; `react` da exit 0.

Corregido, el censo es **122**, no 90 — y se parte en **107 que no resuelven**
contra **15 que ya resuelven** (los 15 son `react`, `typescript`, `ws`,
`undici`: root-declarados o alcanzables por ascenso).

## El discriminador que separa dependencia de texto

El filtro de forma npm deja pasar palabras sueltas (`hola`, `abc`, `two`,
`github.com`, `src`, `list`). No hacía falta una lista negra: **la columna
`ref:`** —dónde lo declara la referencia— los separa sola. Los 49 nombres
reales son `ref:raiz` o `ref:paquete`; **todo** el ruido es `ref:ninguno`.

## Las cinco clases, y qué se hizo con cada una

| Clase | Qué es | Cuántas | Acción |
|---|---|---|---|
| **A** | la referencia lo declara en su raíz, paquete de registro | **42** | a nuestra raíz, con la versión **verbatim** de ccnmt |
| **B** | miembro de NUESTRO workspace | **2** (`@ant/computer-use-mcp`, `@anthropic/ink`) | a la raíz como `workspace:*` |
| **C** | el renombre de alcance dejó el specifier desnudo | **7** archivos | reapuntado a `@thyrox/<name>` |
| **D** | hermano de workspace sin declarar en su importador | **9** pares | `workspace:*` en el manifiesto del importador |
| **E** | texto con forma de paquete | el resto | no es dependencia; el `ref:` lo discrimina |

### La clase C es un residuo del renombre de alcance (#185)

`src/packages/@ant/…` y los napi se renombraron a `@thyrox/*` en el **`name`**
del manifiesto; sus **importadores** no. Medido por paquete:

```
modifiers-napi:       desnudo=2  con-alcance=0
stdin-napi:           desnudo=4  con-alcance=0
image-processor-napi: desnudo=1  con-alcance=1   <- partido
color-diff-napi:      desnudo=0  con-alcance=1
ripgrep-napi:         desnudo=0  con-alcance=1
audio-capture-napi:   desnudo=0  con-alcance=1
url-handler-napi:     desnudo=0  con-alcance=1
```

Tres de siete quedaron atrás, y uno **partido entre las dos formas** — que es
la firma de un barrido incompleto, no de una decisión.

**Y por eso esos tres NO van a la raíz**, aunque la referencia los declare
`workspace:*` ahí: allí el miembro se llama `modifiers-napi`; aquí se llama
`@thyrox/modifiers-napi`. Una clave de raíz con el nombre desnudo no resolvería
a nuestro miembro — bun buscaría un paquete de registro que no existe. El
instrumento lo enruta a C+D, y su primera versión no: lo mandaba a la raíz.

## Los resultados

| Eje | Antes | Después |
|---|---|---|
| claves en nuestra raíz | 8 | **52** |
| sin declarar (censo corregido) | 122 | ver `outputs/despues.txt` |
| specifiers desnudos de un paquete renombrado | 7 | **0** |
| hermanos de workspace sin declarar en su importador | 9 | **0** |

*Métrica:* specifiers de `from`/`import`/`require(`/`import(` en los `.ts`/`.tsx`
de cada paquete, reducidos a nombre de paquete, menos los del manifiesto propio,
menos el nombre propio, menos los builtin; cruzados con `ccnmt: package.json` y
con la resolución real de `bun -e`.
*Ciega a:* un specifier compuesto en tiempo de ejecución (concatenación); si el
paquete declarado está **instalado** —declarar no instala, y ése es otro eje,
medido aparte abajo.

## Lo que este banco NO cierra

- **La instalación, y el bloqueo está MEDIDO, no supuesto.** Declarar cierra el
  hueco de manifiesto; el TS2307 sólo cae cuando el paquete está en
  `node_modules`. `bun install --dry-run` resuelve en 4.73 s y publica **1551
  paquetes**. El disco no los admite: el propio dry-run bajó el libre de
  **1.7 G a 1.1 G** al poblar la caché de bun (897 M), y lo único reclamable
  del árbol son 52 M de logs de job más esa misma caché —que es justo lo que la
  instalación necesita—. `odoo-tools` (18 G) y `nestormonroy/` (2.3 G) son
  referencia de **sólo lectura**. Vaciar la caché deja 2.0 G y obliga a volver
  a descargar, así que tampoco alcanza. Medición completa en
  `outputs/instalacion-no-cabe.txt`. **No es una decisión de posponer: es un
  bloqueo del contenedor**, y el manifiesto queda correcto para donde sí quepa.
- **`@anthropic/ink` vive en `src/packages/@ant/ink/`** — su `name` no coincide
  con su directorio. Es **#518**, no se tocó aquí.
