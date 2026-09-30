Portas UNO o pocos miembros de un módulo grande de TypeScript desde su fuente.
El módulo es demasiado grande para un solo turno de trabajo (el porte entero de
`attachments.ts` agotó 31 turnos, paso 130), así que se reparte en ítems, uno
por miembro, que corren a la vez sobre el MISMO archivo. Para que sus ediciones
no choquen, cada ítem tiene SUS anclas y sólo puede tocarlas a ellas.

Las anclas NO están todavía en el archivo destino: se insertan justo antes
de aplicar las ediciones de todos los ítems. No las busques ni te detengas
porque falten; usa su texto tal cual como `old_string`.

El ítem te da:
- el archivo destino y tus dos anclas: la del cuerpo (`// @port-slot: <nombre>`)
  y la de imports (`// @port-imports: <nombre>`);
- la ruta de la fuente y los rangos de líneas de los miembros que portas.

Cómo trabajar:
1. Lee sólo los rangos que el ítem nombra (Read con offset/limit) y, si hace
   falta, las declaraciones que usan. No recorras la fuente entera.
2. Comprueba con Grep si cada símbolo que el miembro usa ya existe en el
   destino o en otro paquete de `src/packages/`; importa el que exista.
3. Porta el miembro con su conducta. No inventes forma.

Reglas de este modo, que no se negocian:
- Sólo DOS ediciones, las dos sobre el archivo destino: una que reemplaza tu
  ancla de cuerpo por los miembros portados, y otra que reemplaza tu ancla de
  imports por las líneas `import` que necesitas. Si no necesitas imports,
  reemplaza el ancla por una cadena vacía.
- NO declares tipos ni constantes de nivel superior del módulo: un ítem aparte
  los porta todos; si los necesitas, úsalos por su nombre. Excepción: los
  ítems cuyo nombre empieza por `__declarations__`, que portan exactamente las
  declaraciones que su ítem enumera y nada más. Esos ítems COPIAN cada
  declaración tal cual de la fuente: no verifiques uno por uno los tipos que
  referencian (una unión de cientos de líneas agota los turnos así, paso
  135). Sólo busca, con UNA Grep por nombre, qué referencias externas hay que
  importar.
- NO crees ni edites otros archivos. Si un símbolo que el miembro usa no
  existe en ningún paquete, NO lo inventes: nómbralo en `skipped` con el
  paquete donde vive en la fuente. Otro paso lo porta.
- Prohibido silenciar: nada de `any`, `as any`, `as never`, `as unknown as`,
  `// @ts-ignore`, `// @ts-expect-error`, ni `!` sin una comprobación previa
  visible.
- Imports arriba, nunca dentro de una función.
- Identificadores en inglés; comentarios en español, sin coloquialismos.
- Mejor un miembro portado entero y correcto que varios a medias.

PRESUPUESTO: tienes 25 turnos. Si al turno 20 no terminaste, responde YA con lo
que tengas seguro.

Responde con UN solo bloque JSON y nada más:
{"module": "<unidad del item>",
 "edits": [{"file": "<archivo destino>", "old_string": "// @port-slot: <nombre>",
            "new_string": "<miembros portados>", "replace_all": false},
           {"file": "<archivo destino>", "old_string": "// @port-imports: <nombre>",
            "new_string": "<líneas import, o vacío>", "replace_all": false}],
 "fixes": ["<diagnóstico que esperas cerrar>"],
 "skipped": ["<lo que no portas y por qué, con el paquete de la fuente>"]}
