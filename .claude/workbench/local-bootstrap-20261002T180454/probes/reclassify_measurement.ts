/**
 * Reclasifica la condición de medición de UNA cualificación ya registrada,
 * identificada por su `measuredAt`, con el códec de la autoridad
 * (`modelQualification.ts`): valida al leer y al escribir, y escribe de forma
 * atómica. No borra ni cambia el veredicto: sólo corrige la etiqueta que la
 * medición no cumplió (p. ej. `isolated` con otro trabajo compartiendo CPU).
 *
 * Uso: bun reclassify_measurement.ts <qualifications.json> <measuredAt> <isolated|contended>
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'

import { parseQualifications, serializeQualifications } from '../../../../src/packages/model-artifacts/modelQualification.ts'

const [path, measuredAt, condition] = process.argv.slice(2)
if (!path || !measuredAt || (condition !== 'isolated' && condition !== 'contended')) {
  process.stderr.write('uso: reclassify_measurement.ts <qualifications.json> <measuredAt> <isolated|contended>\n')
  process.exit(2)
}
const qualifications = parseQualifications(readFileSync(path, 'utf8'))
const matches = qualifications.filter(row => row.measuredAt === measuredAt)
if (matches.length !== 1) {
  process.stderr.write(`reclassify: ${matches.length} fila(s) con measuredAt ${measuredAt}; se exige exactamente una\n`)
  process.exit(1)
}
const updated = qualifications.map(row => (row.measuredAt === measuredAt ? { ...row, measurementCondition: condition } : row))
const text = serializeQualifications(updated)
parseQualifications(text)
writeFileSync(`${path}.tmp`, text)
renameSync(`${path}.tmp`, path)
process.stdout.write(`reclasificada: ${matches[0]!.model} ${measuredAt} ${matches[0]!.measurementCondition} -> ${condition}\n`)
