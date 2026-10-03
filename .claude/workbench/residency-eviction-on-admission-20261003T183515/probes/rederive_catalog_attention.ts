#!/usr/bin/env bun
/**
 * Recalcula la entrada instalada de un modelo con la misma autoridad que la
 * declaró (`catalogEntryFromGguf`) tras corregir `attentionShapeOf`
 * (H-THYROX-448). Sólo guarda si todos los campos salvo `attention` coinciden
 * con la entrada vigente: el único cambio posible es la forma corregida.
 * Uso: rederive_catalog_attention.ts <nombre> <ruta-gguf>
 */
import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'

const [name, path] = process.argv.slice(2)
const catalogPath = localModelHome(process.env, process.env.THYROX_ROOT ?? process.cwd()).catalog
const catalog = await loadModelCatalog(catalogPath)
const current = catalog.entries().find(entry => entry.name === name)
if (!current) { console.error(`sin entrada ${name} en ${catalogPath}`); process.exit(2) }
const rederived = await catalogEntryFromGguf({
  path: path!, repository: current.repository, source: current.source, revision: current.revision,
  quantization: current.quantization, sha256: current.artifact.sha256, capabilities: current.capabilities,
  declaredAt: current.declaredAt, defaultKvCacheType: current.defaultKvCacheType,
})
const withoutAttention = (entry: object) => JSON.stringify({ ...entry, attention: undefined }, Object.keys({ ...entry }).sort())
if (withoutAttention(rederived) !== withoutAttention(current)) {
  console.error(`la entrada recalculada difiere en algo más que attention:\n${withoutAttention(current)}\n${withoutAttention(rederived)}`)
  process.exit(3)
}
console.log(`attention: ${JSON.stringify(current.attention)} → ${JSON.stringify(rederived.attention)}`)
await saveModelCatalog(catalogPath, catalog.withRederived(rederived))
