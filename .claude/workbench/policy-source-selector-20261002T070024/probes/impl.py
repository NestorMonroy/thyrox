"""Aplica TASK-THYROX-0763: fuente en el selector de la política y causa de exclusión."""
from pathlib import Path

ROOT = Path("/home/user/thyrox/src/packages/provider/src/cost")


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    assert text.count(old) == 1, f"{path.name}: {text.count(old)} coincidencias de {old[:60]!r}"
    path.write_text(text.replace(old, new), encoding="utf-8")


policy_file = ROOT / "executionPolicy.ts"
replace_once(policy_file, """ * la fuente, y la política no tiene que reescribirse al reimportar. El
""", """ * la fuente, y la política no tiene que reescribirse al reimportar. La fuente
 * (`hf` u `ollama`) se declara cuando el repositorio solo no basta: el
 * `library/…` de la biblioteca de Ollama podría ser también una organización
 * de Hugging Face (TASK-THYROX-0763). Sin declararla, cualquier fuente cumple. El
""")
replace_once(policy_file, """import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
""", """import type { ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ModelSource } from '@thyrox/model-artifacts/modelName.ts'
""")
replace_once(policy_file, """  readonly quantization?: string
}
""", """  readonly quantization?: string
  readonly source?: ModelSource
}
""")
replace_once(policy_file, """const LOCAL_RUNTIME = 'ollama'
""", """const LOCAL_RUNTIME = 'ollama'
const MODEL_SOURCES: readonly ModelSource[] = ['hf', 'ollama']
""")
replace_once(policy_file, """  if (selector.quantization === undefined) return { runtime: LOCAL_RUNTIME, repository: selector.repository }
  if (typeof selector.quantization !== 'string') throw new ExecutionPolicyError(`allowed[${index}]: la cuantización es un texto`)
  return { runtime: LOCAL_RUNTIME, repository: selector.repository, quantization: selector.quantization }
}
""", """  const quantization = quantizationOf(selector.quantization, index)
  const source = sourceOf(selector.source, index)
  return {
    runtime: LOCAL_RUNTIME,
    repository: selector.repository,
    ...(quantization === undefined ? {} : { quantization }),
    ...(source === undefined ? {} : { source }),
  }
}

function quantizationOf(value: unknown, index: number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new ExecutionPolicyError(`allowed[${index}]: la cuantización es un texto`)
  return value
}

function sourceOf(value: unknown, index: number): ModelSource | undefined {
  if (value === undefined) return undefined
  if (!MODEL_SOURCES.includes(value as ModelSource)) {
    throw new ExecutionPolicyError(`allowed[${index}]: la fuente es una de ${MODEL_SOURCES.join(', ')}`)
  }
  return value as ModelSource
}
""")
replace_once(policy_file, """  return policy.allowed.some(selector => selector.repository.toLowerCase() === entry.repository.toLowerCase()
    && (selector.quantization === undefined || selector.quantization.toLowerCase() === entry.quantization.toLowerCase()))
}
""", """  return policy.allowed.some(selector => selectorMatches(selector, entry))
}

function selectorMatches(selector: LocalModelSelector, entry: ModelCatalogEntry): boolean {
  return sameText(selector.repository, entry.repository)
    && (selector.quantization === undefined || sameText(selector.quantization, entry.quantization))
    && (selector.source === undefined || selector.source === entry.source)
}

function sameText(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}
""")

recommend_file = ROOT / "policy.ts"
replace_once(recommend_file, """  const reason = localFallbackReason(kind, profile, permitted)
""", """  const reason = excludesWholeCatalog(local, permitted)
    ? `la política no permite ninguna de las ${local.entries.length} entrada(s) del catálogo local`
    : localFallbackReason(kind, profile, permitted)
""")
replace_once(recommend_file, """/**
 * Elige dónde se ejecuta una clase de tarea:""", """/** La política dejó fuera un catálogo que sí tiene entradas: la causa es la política, no el catálogo. */
function excludesWholeCatalog(local: LocalModelInventory, permitted: LocalModelInventory): boolean {
  return local.entries.length > 0 && permitted.entries.length === 0
}

/**
 * Elige dónde se ejecuta una clase de tarea:""")
