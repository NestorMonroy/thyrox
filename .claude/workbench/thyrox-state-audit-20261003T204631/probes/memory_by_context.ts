/**
 * EXPERIMENTAL — medición exploratoria de auditoría: no es autoridad ni evidencia de aceptación.
 * La memoria que `estimateServingMemoryFromShape` calcula hoy para la entrada instalada de
 * Qwen3-4B en los contextos que se usaron, leída del catálogo real. No escribe nada.
 */
import { readFileSync } from 'node:fs'
import { estimateServingMemoryFromShape } from '@thyrox/model-artifacts/memoryEstimate.ts'

const catalog = JSON.parse(readFileSync('.thyrox/models/catalog.json', 'utf8')) as {
  entries: { name: string, artifact: { bytes: number }, attention: { blockCount: number, kvHeadCount: number, headDimension: number }, defaultKvCacheType: 'f16' }[]
}
const MIB = 1024 * 1024
for (const entry of catalog.entries) {
  for (const contextLength of [8192, 16384, 24576, 32768, 40960]) {
    const estimate = estimateServingMemoryFromShape({ ggufBytes: entry.artifact.bytes, attention: entry.attention, contextLength, kvCacheType: entry.defaultKvCacheType })
    console.log(`${entry.name}\tctx=${contextLength}\tkv=${Math.round(estimate.kvCacheBytes / MIB)}MiB\ttotal=${Math.round(estimate.totalBytes / MIB)}MiB`)
  }
}
