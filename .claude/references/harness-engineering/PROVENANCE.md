# `heng` — procedencia y derechos

Creado: 2026-08-20T21:53:13
Origen: archivo comprimido subido a la sesión
(`harnessengineeringfromcctoaicodingmain.zip`, 2026-08-20) por directiva del
ejecutor — *"te voy a pasar otro libro para que lo analices e integres en
`/.claude/references`"*.

## La licencia SÍ está declarada, y se deriva del archivo

A diferencia de `ccb` y `hbooks`, este árbol **sí** trae su licencia. No se
afirma de memoria — se lee (DEC-KX-03):

```
LICENSE:1  MIT License
LICENSE:3  Copyright (c) 2026 Alex
```

**MIT** permite copiar, modificar y redistribuir **con atribución**: el aviso de
copyright y el texto de la licencia deben acompañar a toda copia. Por eso
`LICENSE` se vendoriza **junto al material**, no aparte, y esta procedencia lo
nombra en su primera línea.

*Métrica:* archivos `LICENSE*`/`COPYING*`/`NOTICE*` a profundidad 2 del árbol
descomprimido — **1**, y es el `LICENSE` citado arriba.
*Ciega a:* una licencia distinta declarada sólo en el sitio o en el paquete
publicado. El uno acota lo que declara **el material que tenemos**.

## Qué es

*Harness Engineering: From Claude Code Source to AI Coding Best Practices*
(《驾驭工程》), 48 capítulos en siete partes más siete apéndices. El README
declara su base: material derivado del **paquete distribuido públicamente de
Claude Code `v2.1.88`** más reconstrucción por *source map*, convertido en libro
de patrones reusables.

## Corrección medida: el inglés NO es un borrador

El `README.en.md:11` declara que la edición inglesa es *"a scaffolded preview
with the full table of contents, cover, and **placeholder chapter pages**"* y
que la china *"remains the canonical version"*. **Medido, es falso** — o al
menos quedó obsoleto sin que nadie actualizara el README:

| Edición | Archivos `.md` | Líneas |
|---|---|---|
| `book-en/src` (inglés) | 48 | **23 113** |
| `book/src` (chino) | 47 | 23 221 |

Capítulo a capítulo la paridad es exacta o casi: `ch25` **330 / 330**,
`ch01` **498 / 498**, `ch20` **456 / 456**, `ch18` 967 / 963, `ch24` 726 / 728.
Y su contenido es prosa real, no un marcador.

Por eso se vendoriza **la edición inglesa**, no la china: es la que se lee sin
intermediario y la medición dice que no pierde nada.

*Métrica:* `wc -l` sobre los `.md` de cada edición.
*Ciega a:* una divergencia de **contenido** entre ediciones que conserve el
conteo de líneas. La paridad de líneas no prueba paridad de texto; prueba que la
inglesa no es un esqueleto, que es lo que el README afirmaba.

## Qué se vendorizó, y qué no

| Subárbol | Vendorizado | Por qué |
|---|---|---|
| `book-en/src/**.md` | **sí** — 48 archivos | el libro |
| `docs/` | **sí** — 8 archivos | `reverse-engineering-guide.md` y los `version-diffs` entre v2.1.88, .91, .92 y .100: la metodología y el delta entre versiones |
| `scripts/` | **sí** — 3 archivos | `cc-version-diff.sh` y `extract-signals.sh` son **el instrumento** con que el autor mide el binario, que es lo mismo que hacemos con `strings` |
| `book/` (chino) | no | la medición de arriba lo vuelve redundante |
| `book-en/src/assets/cover-en.jpeg` | no | portada; 1.6 MB sin contenido técnico |
| `specs/`, `examples/` | no | plan de escritura del propio libro y un agente de ejemplo — material del proyecto ajeno, no referencia |

Total vendorizado: **61 archivos, 1.6 MB**.

## El eje de la VERSIÓN — etiqueta la cita, no descalifica la fuente

El libro mide **v2.1.88** como base, con actualizaciones hasta **v2.1.100**
(85 menciones a 2.1.91, 66 a 2.1.88, 54 a 2.1.100, 31 a 2.1.92). El ejecutable
de esta sesión declara **2.1.236**.

Esa distancia se trata como el sub-patrón **C** de
`metrica-decide-la-conclusion.md` ya dejó fijado para `hccw`: la versión
**etiqueta la cita**, no la descarta. Lo prohibido es afirmar que **nuestro**
binario hace lo que el libro describe de v2.1.88 sin re-medirlo; lo válido es
adoptar el **encuadre** y el **diseño**, que es para lo que existe una
referencia. *"No lo tenemos"* no es argumento —es palabra por palabra *"no
corremos Odoo"*, que este proyecto rechaza por construcción.

Toda cita a este corpus que afirme algo del binario **actual** re-mide contra
`strings` del ejecutable en curso.

## Relación con los otros tres corpus — no es duplicado

| Corpus | Qué es | Solapamiento |
|---|---|---|
| `claude-code` | documentación **oficial** de Anthropic | describe la superficie pública; éste describe el mecanismo interno |
| `hccw` | destilado de mecanismos por capítulo (v2.1.202) | mismo género, **otra versión y otro autor**; se contrastan, no se funden |
| `hbooks` | dos libros de harness engineering sin licencia declarada | mismo tema, **9 capítulos** frente a 48, y sin trazabilidad a versión ni licencia |
| `ccb` | una implementación paralela del daemon `bg` | código, no prosa |

Cuando dos corpus digan cosas distintas sobre el mismo mecanismo, **se citan los
dos con su versión** — la discrepancia entre versiones es un dato, no un
conflicto que resolver a favor de uno.

## Cómo se cita — alias `heng:`

```
heng: part7/ch25.md:47      →  .claude/references/harness-engineering/book/part7/ch25.md
heng: docs/reverse-engineering-guide.md
heng: scripts/extract-signals.sh
```

La cita lleva **siempre** la versión que el libro mide cuando la afirmación es
sobre el binario: `heng: part5/ch18.md (v2.1.88)`.
