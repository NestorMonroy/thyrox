# Extraer una declaración del payload anclando por LITERAL

`TASK-THYROX-0069` · corpus **2.1.274** (`_references/claude-code-bin/2.1.274/`)

## La pregunta

¿Se puede recuperar la cadena del medidor de límite de uso sin conocer el
nombre de ninguno de sus bindings?

Importa porque el payload está minificado y los renombra entre
reconstrucciones: la tabla de ventanas se llama `E0e` en 2.1.266 y `x0` en
2.1.274 — **el mismo mecanismo, otro nombre**. Un extractor que reciba el
identificador mide el *significante* y concluye sobre el *significado*: sobre
la build nueva devuelve cero, y ese cero se lee como «el mecanismo ya no
está». Lo que sobrevive a la reconstrucción son los **literales**, porque son
datos del programa y no nombres suyos.

## El mecanismo vive en `src/`, no aquí

Por DEC-01 el producto vive en `src/` y `.claude/` es estado. El extractor es
`src/packages/binary/src/declaration.ts` y su suite
`src/packages/binary/__tests__/declaration.test.ts`. Este banco guarda **cómo
se ejecutó el trabajo** y **qué salió**, no el mecanismo.

Los ejemplos maduros de los que desciende están en el consumidor
(`kaupamex-docs: .claude/eventos/extraer-modulos-completos-20260823T030614/`).
De ellos se adapta la idea —delimitar la unidad citable y verificar que parsea
sola— y **no** su ventana ensanchable: aquélla analizaba el bundle entero de
28 MB por símbolo, así que necesitaba recortar. Aquí el corpus ya viene
partido por módulo (lo parte `writeCorpus` del mismo paquete) y un módulo de
5.4 MB se analiza en 1.51 s. La guarda de «cierra dentro de la ventana» no se
omite en silencio: **se declara inaplicable**, con su razón medida.

## Lo que este banco corrigió, y no era lo que parecía

El control de anulación no caía sobre el corpus real, y la causa no era una
aserción floja: **la guarda que la aserción nombraba no era la que hacía el
trabajo**.

| Sonda | Qué midió |
|---|---|
| `probe_guard_anulada.ts` | igualdad contra inclusión: **5 sitios, mayor 15, idénticos** en ambos modos |
| `probe_donde_vive_la_prosa.ts` | la prosa de ayuda vive en un **`TemplateHead` de 11 776 bytes** |
| `probe_ancla_de_cabecera.ts` | el prefijo `anthropic-ratelimit-unified-`: **43 por texto, 0 sitios, 0 declaraciones** |

`ts.isStringLiteralLike` cubre `StringLiteral` y
`NoSubstitutionTemplateLiteral` — **no** los tramos de plantilla. Así que la
prosa se excluía por una ceguera, no por la guarda; y esa misma ceguera hacía
**irrecuperable** a `szo`, la función que lee las tres cabeceras, por el único
literal que una sesión futura alcanzaría primero.

La corrección extiende `nodeValue` a `ts.isTemplateLiteralToken`. Con ella la
ceguera se colapsa en la guarda: el `TemplateHead` de 11 776 bytes **entra** al
predicado y es la igualdad de texto completo la que lo deja fuera.

## Controles

- `rojo-1-sin-mecanismo.log` — TDD, sin el módulo (`exit 1`).
- `rojo-2-ancla-en-plantilla.log` — el ancla de cabecera da 0 declaraciones.
- `verde-2-ancla-en-plantilla.log` — 13 pass, 0 fail.
- `anulacion-1-texto-completo.log` — **antes** de la corrección: cae 1 (sólo el
  caso sintético). El control **no discriminaba**, y ése es el defecto.
- `anulacion-2-texto-completo.log` — **después**: caen **exactamente 2**, el
  caso sintético y el discriminador del corpus real. Ni una más.

Restaurado con `git diff --stat` vacío sobre el módulo.

## Salidas

`salidas/rate-limit-chain-2.1.274.jsonl` — 26 declaraciones únicas, cada una
con su `binding` **en esta build**, sus anclas y su texto. Entre ellas la
cadena completa: `x0` · `szo` · `dPn` · `V8` · `W7` · `izo` · `bPn` · `cqo`.

**Lo que NO recupera, declarado:** `vot` (conversor de cadena a número) y
`yzo` (filtro de frescura sobre el estado crudo) **no salen**. Ninguno declara
un literal distintivo, así que un extractor anclado por literal no puede
alcanzarlos. Es un límite del instrumento, no una ausencia del payload.
