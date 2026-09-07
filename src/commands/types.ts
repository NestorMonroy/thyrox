/**
 * El objeto que define un comando de barra de Claude Code.
 *
 * Es OTRO mecanismo del cliente que el skill, con OTRA forma de frontmatter,
 * medida sobre los 27 `.md` de `src/commands/` — no heredada de
 * `skills/types.ts`. Las tres diferencias que la medicion destapo:
 *
 *   1. `name` NO es el identificador. En un skill coincide con el nombre de
 *      su directorio; aqui es un TITULO HUMANO (`Loop THYROX`,
 *      `Test-Driven Development (TDD)`, `Loop de analisis contra la
 *      referencia`) y el identificador es el BASENAME del archivo, que es lo
 *      que el cliente usa en `/thyrox:track`. Copiar el tipo del skill habria
 *      puesto el titulo donde va el id.
 *   2. `description` NO se cita. Ninguna de las 26 que la declaran lleva
 *      comillas en disco; el emisor de skills si las pone, porque alli si las
 *      lleva. Citarla aqui rompe la ida y vuelta byte a byte.
 *   3. Casi todo es opcional: `description` 26/27, `name` 25/27,
 *      `argument-hint` 3/27, `allowed-tools` 1/27. Exigir cualquiera de ellas
 *      dejaria fuera archivos que hoy existen y funcionan.
 *
 * *Metrica:* claves de primer nivel del frontmatter, por linea, sobre los 27
 * `.md` de `src/commands/`.
 * *Ciega a:* claves anidadas —ninguno de los 27 declara un bloque anidado, a
 * diferencia del `metadata.triggers` del skill—, y a los comandos que puedan
 * vivir en otros clones sin contraparte aqui.
 */

export type CommandDefinition = {
  /**
   * El identificador: el basename del archivo sin `.md`. Es lo que el cliente
   * escribe tras el namespace (`/thyrox:<id>`), y NO se emite al frontmatter
   * — vive en el nombre del archivo, que es donde el cliente lo lee.
   */
  id: string
  /** `name:` — titulo legible. 25 de 27 lo declaran; dos no, y no se inventa. */
  name?: string
  /** `description:` — 26 de 27. Sin comillas, como en disco. */
  description?: string
  /** `argument-hint:` — 3 de 27. */
  argumentHint?: string
  /**
   * `allowed-tools:` — 1 de 27. Cadena separada por espacio, igual que en el
   * skill (`Bash Read Edit`), no lista YAML.
   */
  allowedTools?: string[]
  /**
   * El cuerpo tras el frontmatter, verbatim — misma razon que
   * `SkillDefinition.prompt`: modelarlo exigiria un parser de Markdown con
   * perdida, y el cuerpo YA es correcto en disco.
   */
  prompt: string
}
