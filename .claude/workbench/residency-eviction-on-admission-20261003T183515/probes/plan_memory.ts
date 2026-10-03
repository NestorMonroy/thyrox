import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { resolveModel } from '@thyrox/model-artifacts/modelResolver.ts'
import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
const entries = (await loadModelCatalog(localModelHome(process.env, '/home/user/thyrox').catalog)).entries()
for (const ctx of [16384, 24576, 32768]) {
  const r = resolveModel({ model: 'thyrox-qwen--qwen3-4b-gguf:q4_k_m-hf-bc640142c66e', contextLength: ctx }, entries)
  const m = r.memoryProfile as Record<string, number>
  console.log(`ctx${ctx} kv=${r.kvCacheType} ` + Object.entries(m).map(([k, v]) => `${k}=${Math.round(v / 1048576)}MiB`).join(' '))
}
