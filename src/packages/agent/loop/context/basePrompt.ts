/**
 * Los cuatro deberes del prompt base (A.2.1).
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.2 — «Are identity,
 * behavior rules, tool constraints, and output discipline organized
 * separately?». Son esos cuatro y en ese orden; no es una taxonomía propia.
 *
 * POR QUÉ CUATRO SECCIONES Y NO UNA CADENA. El prompt ya se separaba por
 * ORIGEN —base, CLAUDE.md, reglas— y eso responde a otra pregunta: de dónde
 * viene el texto. La de aquí es qué gobierna. Con los cuatro deberes
 * nombrados, retirar uno es una operación que se puede hacer y medir, y el
 * apéndice fija para qué sirve poder hacerla: «if removing one section
 * causes structural behavior change, that section is likely true
 * control-plane logic. If behavior barely changes, it may be decoration.»
 *
 * EL ORDEN NO ES ALFABÉTICO NI ARBITRARIO. Va de lo más estable a lo más
 * volátil, que es el orden de caché: la identidad no cambia nunca, la
 * disciplina de salida es lo primero que un llamador querría afinar. Un
 * prefijo estable es lo que permite que el turno siguiente relea en vez de
 * reescribir, y releer es el 98 % de lo que un agente consume.
 *
 * QUÉ NO VA AQUÍ. Nada que el runtime imponga. Las operaciones peligrosas
 * viven en `permission/dangerousPatterns.ts` y el veto en `decide()`: si un
 * deber de aquí dijera «no borres archivos del sistema», estaría delegando
 * al texto un deber que el despachador ya cumple, que es exactamente lo que
 * A.2.4 prohíbe. Lo que sí va es lo que SÓLO el modelo puede hacer —no
 * inventarse una herramienta, no insistir en una llamada denegada—, porque
 * ahí no hay runtime que valga.
 */

/** Un deber del prompt base: su nombre en inglés y el texto que emite. */
export type Duty = { readonly name: string; readonly text: string }

export const BASE_DUTIES: readonly Duty[] = [
  {
    name: 'identity',
    text: 'Eres un agente que trabaja con herramientas sobre el árbol de un proyecto. '
      + 'Actúas sobre archivos y comandos reales: lo que haces queda.',
  },
  {
    name: 'behavior',
    text: 'Ninguna afirmación de estado sale de tu memoria. Un hecho —que un archivo '
      + 'existe, cuánto mide, qué dice, si un comando funcionó— se deriva de la salida '
      + 'de una herramienta ejecutada en este turno. Si no la ejecutaste, el estado es '
      + 'DESCONOCIDO, no «éxito»: el resultado esperado nunca es evidencia del real.',
  },
  {
    name: 'tools',
    text: 'Sólo puedes llamar a las herramientas de la lista, con los campos que su '
      + 'esquema declara. Una llamada denegada es definitiva: no la repitas igual ni '
      + 'busques otra herramienta para conseguir lo mismo. Si algo te falta, dilo.',
  },
  {
    name: 'output',
    text: 'Responde en español, sin relleno ni preámbulo. Cuando des una cifra, di de '
      + 'qué comando salió.',
  },
]
