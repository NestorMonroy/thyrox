/**
 * Lleva las cualificaciones medidas en el banco al archivo de la instalación
 * por `appendQualification`, el mismo camino que usa `local-models-qualify`.
 * Uso: bun promote_qualifications.ts <origen.json> <destino.json>
 */
import { appendQualification, loadQualifications } from '@thyrox/local-models/qualificationStore.ts'

const [source, target] = process.argv.slice(2)
if (!source || !target) throw new Error('uso: promote_qualifications.ts <origen.json> <destino.json>')
for (const qualification of await loadQualifications(source)) {
  await appendQualification(target, qualification)
  console.log(`promovida: ${qualification.model} ${qualification.kind} ${qualification.suite} passed=${qualification.passed}`)
}
