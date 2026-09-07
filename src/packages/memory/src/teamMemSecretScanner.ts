/**
 * Puerto de `ccnmt: packages/memory/src/teamMemSecretScanner.ts` (verbatim
 * — sin dependencias externas al paquete).
 *
 * Escáner de secretos del lado del cliente para memoria de equipo (PSR
 * M22174).
 *
 * Escanea el contenido en busca de credenciales antes de subirlo, para que
 * los secretos nunca salgan de la máquina del usuario. Usa un subconjunto
 * curado de reglas de alta confianza de gitleaks
 * (https://github.com/gitleaks/gitleaks, licencia MIT) — solo se incluyen
 * reglas con prefijos distintivos que tienen tasas de falso-positivo casi
 * cero. Se omiten las reglas genéricas basadas en contexto de palabra
 * clave.
 *
 * IDs de regla y regexes tomados directo de la config pública de gitleaks:
 * https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml
 *
 * Notas de regex en JS:
 *   - gitleaks usa regex de Go; los grupos inline (?i) y de modo (?-i:...)
 *     no son portables a JS. Las reglas afectadas se reescriben con clases
 *     de caracteres explícitas ([a-zA-Z0-9] en vez de (?i)[a-z0-9]).
 *   - Las alternancias de límite finales como (?:[\x60'"\s;]|\\[nr]|$)
 *     de la regex de Go se conservan (JS `$` coincide con fin-de-cadena en
 *     modo por defecto).
 */

// capitalize inlineado abajo, igual que en la fuente.
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

type SecretRule = {
  /** ID de regla de gitleaks (kebab-case), usado en labels y analítica. */
  id: string
  /** Fuente del regex, compilado con pereza en el primer escaneo. */
  source: string
  /** Flags opcionales de regex JS (la mayoría de reglas son case-sensitive por defecto). */
  flags?: string
}

type SecretMatch = {
  /** ID de regla de gitleaks que coincidió (p. ej. "github-pat", "aws-access-token"). */
  ruleId: string
  /** Label legible derivado del ID de regla. */
  label: string
}

// ─── Reglas curadas ─────────────────────────────────────────────
// Patrones de alta confianza de gitleaks con prefijos distintivos.
// Ordenadas aproximadamente por probabilidad de aparecer en contenido de
// un equipo de desarrollo.

// Prefijo de API key de Anthropic, ensamblado en tiempo de ejecución para
// que la secuencia de bytes literal no esté presente en el bundle externo
// (chequeo de cadenas excluidas). join() no se pliega a constante por el
// minificador.
const ANT_KEY_PFX = ['sk', 'ant', 'api'].join('-')

const SECRET_RULES: SecretRule[] = [
  // — Proveedores cloud —
  {
    id: 'aws-access-token',
    source: '\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b',
  },
  {
    id: 'gcp-api-key',
    source: '\\b(AIza[\\w-]{35})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'azure-ad-client-secret',
    source:
      '(?:^|[\\\\\'"\\x60\\s>=:(,)])([a-zA-Z0-9_~.]{3}\\dQ~[a-zA-Z0-9_~.-]{31,34})(?:$|[\\\\\'"\\x60\\s<),])',
  },
  {
    id: 'digitalocean-pat',
    source: '\\b(dop_v1_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'digitalocean-access-token',
    source: '\\b(doo_v1_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },

  // — APIs de IA —
  {
    id: 'anthropic-api-key',
    source: `\\b(${ANT_KEY_PFX}03-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'"\\s;]|\\\\[nr]|$)`,
  },
  {
    id: 'anthropic-admin-api-key',
    source:
      '\\b(sk-ant-admin01-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'openai-api-key',
    source:
      '\\b(sk-(?:proj|svcacct|admin)-(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})T3BlbkFJ(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})\\b|sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'huggingface-access-token',
    // gitleaks: hf_(?i:[a-z]{34}) → JS: hf_[a-zA-Z]{34}
    source: '\\b(hf_[a-zA-Z]{34})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },

  // — Control de versiones —
  {
    id: 'github-pat',
    source: 'ghp_[0-9a-zA-Z]{36}',
  },
  {
    id: 'github-fine-grained-pat',
    source: 'github_pat_\\w{82}',
  },
  {
    id: 'github-app-token',
    source: '(?:ghu|ghs)_[0-9a-zA-Z]{36}',
  },
  {
    id: 'github-oauth',
    source: 'gho_[0-9a-zA-Z]{36}',
  },
  {
    id: 'github-refresh-token',
    source: 'ghr_[0-9a-zA-Z]{36}',
  },
  {
    id: 'gitlab-pat',
    source: 'glpat-[\\w-]{20}',
  },
  {
    id: 'gitlab-deploy-token',
    source: 'gldt-[0-9a-zA-Z_\\-]{20}',
  },

  // — Comunicación —
  {
    id: 'slack-bot-token',
    source: 'xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*',
  },
  {
    id: 'slack-user-token',
    source: 'xox[pe](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}',
  },
  {
    id: 'slack-app-token',
    source: 'xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+',
    flags: 'i',
  },
  {
    id: 'twilio-api-key',
    source: 'SK[0-9a-fA-F]{32}',
  },
  {
    id: 'sendgrid-api-token',
    // gitleaks: SG\.(?i)[a-z0-9=_\-\.]{66} → JS: case-insensitive via flag
    source: '\\b(SG\\.[a-zA-Z0-9=_\\-.]{66})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },

  // — Herramientas de desarrollo —
  {
    id: 'npm-access-token',
    source: '\\b(npm_[a-zA-Z0-9]{36})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'pypi-upload-token',
    source: 'pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}',
  },
  {
    id: 'databricks-api-token',
    source: '\\b(dapi[a-f0-9]{32}(?:-\\d)?)(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'hashicorp-tf-api-token',
    // gitleaks: (?i)[a-z0-9]{14}\.(?-i:atlasv1)\.[a-z0-9\-_=]{60,70}
    // → JS: case-insensitive hex+alnum prefix, literal "atlasv1", case-insensitive suffix
    source: '[a-zA-Z0-9]{14}\\.atlasv1\\.[a-zA-Z0-9\\-_=]{60,70}',
  },
  {
    id: 'pulumi-api-token',
    source: '\\b(pul-[a-f0-9]{40})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'postman-api-token',
    // gitleaks: PMAK-(?i)[a-f0-9]{24}\-[a-f0-9]{34} → JS: use [a-fA-F0-9]
    source:
      '\\b(PMAK-[a-fA-F0-9]{24}-[a-fA-F0-9]{34})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },

  // — Observabilidad —
  {
    id: 'grafana-api-key',
    source:
      '\\b(eyJrIjoi[A-Za-z0-9+/]{70,400}={0,3})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'grafana-cloud-api-token',
    source: '\\b(glc_[A-Za-z0-9+/]{32,400}={0,3})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'grafana-service-account-token',
    source:
      '\\b(glsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'sentry-user-token',
    source: '\\b(sntryu_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'sentry-org-token',
    source:
      '\\bsntrys_eyJpYXQiO[a-zA-Z0-9+/]{10,200}(?:LCJyZWdpb25fdXJs|InJlZ2lvbl91cmwi|cmVnaW9uX3VybCI6)[a-zA-Z0-9+/]{10,200}={0,2}_[a-zA-Z0-9+/]{43}',
  },

  // — Pagos / comercio —
  {
    id: 'stripe-access-token',
    source:
      '\\b((?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99})(?:[\\x60\'"\\s;]|\\\\[nr]|$)',
  },
  {
    id: 'shopify-access-token',
    source: 'shpat_[a-fA-F0-9]{32}',
  },
  {
    id: 'shopify-shared-secret',
    source: 'shpss_[a-fA-F0-9]{32}',
  },

  // — Criptografía —
  {
    id: 'private-key',
    source:
      '-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----[\\s\\S-]{64,}?-----END[ A-Z0-9_-]{0,100}PRIVATE KEY(?: BLOCK)?-----',
    flags: 'i',
  },
]

// Caché de patrones compilados con pereza — se compila una vez, en el
// primer escaneo.
let compiledRules: Array<{ id: string; re: RegExp }> | null = null

function getCompiledRules(): Array<{ id: string; re: RegExp }> {
  if (compiledRules === null) {
    compiledRules = SECRET_RULES.map(r => ({
      id: r.id,
      re: new RegExp(r.source, r.flags),
    }))
  }
  return compiledRules
}

/**
 * Convierte un ID de regla de gitleaks (kebab-case) en un label legible.
 * P. ej. "github-pat" → "GitHub PAT", "aws-access-token" → "AWS Access Token".
 */
function ruleIdToLabel(ruleId: string): string {
  // Palabras cuya capitalización canónica difiere del title case.
  const specialCase: Record<string, string> = {
    aws: 'AWS',
    gcp: 'GCP',
    api: 'API',
    pat: 'PAT',
    ad: 'AD',
    tf: 'TF',
    oauth: 'OAuth',
    npm: 'NPM',
    pypi: 'PyPI',
    jwt: 'JWT',
    github: 'GitHub',
    gitlab: 'GitLab',
    openai: 'OpenAI',
    digitalocean: 'DigitalOcean',
    huggingface: 'HuggingFace',
    hashicorp: 'HashiCorp',
    sendgrid: 'SendGrid',
  }
  return ruleId
    .split('-')
    .map(part => specialCase[part] ?? capitalize(part))
    .join(' ')
}

/**
 * Escanea una cadena en busca de secretos potenciales.
 *
 * Devuelve un match por cada regla que disparó (deduplicado por ID de
 * regla). El texto realmente coincidente NO se devuelve, a propósito —
 * nunca logueamos ni mostramos valores de secretos.
 */
export function scanForSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = []
  const seen = new Set<string>()

  for (const rule of getCompiledRules()) {
    if (seen.has(rule.id)) {
      continue
    }
    if (rule.re.test(content)) {
      seen.add(rule.id)
      matches.push({
        ruleId: rule.id,
        label: ruleIdToLabel(rule.id),
      })
    }
  }

  return matches
}

/**
 * Obtiene un label legible para un ID de regla de gitleaks.
 * Recae en la conversión kebab-a-Title para IDs desconocidos.
 */
export function getSecretLabel(ruleId: string): string {
  return ruleIdToLabel(ruleId)
}

/**
 * Redacta in-place cualquier secreto coincidente con [REDACTED].
 * A diferencia de scanForSecrets, esto devuelve el contenido con los
 * tramos reemplazados, para que el texto circundante se pueda seguir
 * escribiendo a disco de forma segura.
 */
let redactRules: RegExp[] | null = null

export function redactSecrets(content: string): string {
  redactRules ??= SECRET_RULES.map(
    r => new RegExp(r.source, (r.flags ?? '').replace('g', '') + 'g'),
  )
  for (const re of redactRules) {
    // Reemplaza solo el grupo capturado, no el match completo — los
    // patrones incluyen caracteres de límite (espacio, comilla, ;) fuera
    // del grupo que deben sobrevivir.
    content = content.replace(re, (match, g1) =>
      typeof g1 === 'string' ? match.replace(g1, '[REDACTED]') : '[REDACTED]',
    )
  }
  return content
}
