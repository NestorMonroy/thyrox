/**
 * El sello de procedencia de una regla emitida — la mitad TypeScript.
 *
 * Existe por un defecto MEDIDO del clasificador, no por completitud: dos
 * copias byte a byte no se subsumen la una a la otra (el filtro `holders` de
 * `check_rule_divergence.classify` exige que la otra aporte alguna linea
 * propia), asi que caen en `divergente (0 linea(s))`. Emitir la misma regla a
 * tres consumidores sin sello convertiria tres SUBSUMIDAS en tres DIVERGENTES
 * nuevas y pondria rojo el gate estricto — el emisor empeoraria la cifra que
 * existe para justificarlo.
 *
 * El sello tambien es lo unico que le dice a quien abre el archivo que su
 * edicion se va a perder en la siguiente emision.
 *
 * La mitad Python (`src/rules/provenance.py`) declara las mismas constantes;
 * `tests/rules/test_provenance_parity.py` las ata para que no deriven.
 */

/**
 * La subcadena estable que el clasificador busca, en minusculas.
 *
 * Se compara en minusculas y como SUBCADENA, igual que los marcadores de
 * cheat-sheet: asi el sello puede ganar palabras sin romper al lector.
 */
export const EMITTED_MARKER = 'emitida por thyrox'

/** El directorio de definiciones, relativo a la raiz del proveedor. */
export const DEFINITIONS_SEGMENT = 'src/rules/definitions'

/**
 * La linea completa que se estampa. Es un comentario de Markdown: el cliente
 * carga el archivo como prosa, y un sello que se renderizara seria ruido en
 * el piso siempre-cargado que la regla ocupa.
 */
export function emittedMarker(name: string): string {
  return (
    `<!-- Emitida por THYROX desde ${DEFINITIONS_SEGMENT}/${name}.ts — ` +
    `no editar aqui: el cambio se hace en la definicion y se vuelve a emitir. -->`
  )
}
