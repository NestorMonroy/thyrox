/** Aplica la migración del store semántico (crea pgvector y el esquema) por su propia API. */
import { openSemanticSearchStore } from '../../../../src/packages/semantic-search/store.ts'
const store = openSemanticSearchStore({ url: process.env.THYROX_SEMANTIC_SEARCH_DATABASE_URL!, schema: { name: process.env.THYROX_SEMANTIC_SEARCH_SCHEMA ?? 'semantic_search' } })
try { await store.migrate(); console.log('migrate: ok') } finally { await store.close() }
