# `hbooks` — procedencia y derechos

Creado: 2026-08-20T15:10:19
Origen: directiva del ejecutor 2026-08-20 — *"todos los que no tengan `LICENSE`
se van con [la declaración de derechos]"*.

## Este directorio NO declara licencia, y la ausencia es del upstream

No es un descuido de la vendorización: **no hay nada que copiar**. Es el mismo
caso que `ccb` —ninguna licencia en ninguna parte de la cadena— y por tanto
recibe el mismo tratamiento.

## Lo que se sabe de la cadena de procedencia

- El material llegó como **archivo comprimido subido a la sesión**
  (`harness-books-main.zip`, 2026-08-20), correspondiente al sitio
  `harness-books.agentway.dev` que el `README.md` declara.
- El repositorio de origen **no declara** ningún archivo `LICENSE`, `COPYING`
  ni `NOTICE`: **0 archivos** con esos nombres en todo el árbol.
- **Ningún JSON del árbol declara una clave `license`**: 0 archivos. Lo único
  que sus 8 `book.json` declaran sobre autoría es
  `"author": "OpenAI Codex"` — un nombre de herramienta, no un titular
  identificable con quien se pueda aclarar nada.
- **Ni el `README.md` ni el `AGENTS.md` mencionan licencia o copyright**: 0
  ocurrencias en cada uno.
- Los dos únicos textos que hablan de copyright lo hacen **sobre material
  ajeno, no sobre el suyo** — `book1/preface.md:33` y
  `book1/appendix-c-source-map.md:7` declaran que los libros **no** reproducen
  código fuente de Claude Code «por fronteras de copyright». El autor es
  consciente del asunto y aun así **no licencia su propio texto**.

*Métrica:* nombres de archivo de licencia, claves `license` en JSON, y
menciones de licencia/copyright en la raíz del árbol descomprimido y en los 31
archivos vendorizados.
*Ciega a:* una declaración de licencia que viva **sólo en el sitio web**
(`harness-books.agentway.dev`) y no en el árbol. No se consultó el sitio; el
cero acota lo que declara **el material que tenemos**, no lo que exista fuera.

## Qué se vendorizó, y qué no

Los **31 archivos en inglés** de los dos libros (`locales/en/`), **202 550 B**:
`book1/` (Claude Code — 9 capítulos, prefacio, 3 apéndices) y `book2/`
(comparación con Codex — 8 capítulos, prefacio, 2 apéndices). Fuera quedan la
raíz en chino, `assets/`, `tools/` y la maquinaria de sitio: no aportan a la
lectura y sí a la masa.

## Consecuencia operativa

**Tratar la redistribución y todo reuso aguas abajo como sujetos a revisión
manual de derechos**, hasta que —y sólo si— se añada una licencia clara.

Aquí el corpus se usa como **referencia de lectura dentro del repositorio**: se
cita con el alias `hbooks:` para fundar decisiones de diseño, igual que se cita
`odoo19c:`. Eso no es redistribución, pero tampoco es un permiso: si alguna vez
este material sale del repo, la revisión va **antes**.

Y una cautela propia de esta fuente: es **análisis independiente de terceros**
sobre el runtime de otro, no documentación del fabricante. Su rango como fuente
es el de `hccw` —análisis externo—, por debajo del binario medido y de la
documentación oficial (`ccdoc:`). Una afirmación suya sobre **nuestro** cliente
no se cita sin re-medirla aquí.

## La premisa que hay que desmontar

**Visibilidad pública no es concesión de derechos de reuso.** La guía de
licenciamiento de GitHub lo dice explícitamente: un repositorio sin licencia
queda bajo las **reglas de copyright por defecto**, que son restrictivas — no
permisivas. Que el material se publique como sitio web abierto no cambia nada
de eso.

## Alcance de este documento

Este archivo **registra procedencia y riesgo**. No es asesoría legal ni
sustituye la revisión de un profesional calificado.
