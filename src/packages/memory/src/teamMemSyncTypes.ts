/**
 * Team Memory Sync Types
 *
 * Zod schemas and types for the repo-scoped team memory sync API.
 * Based on the backend API contract from anthropic/anthropic#250711.
 */

/**
 * A file skipped during push because it contains a detected secret.
 * The path is relative to the team memory directory. Only the matched
 * gitleaks rule ID is recorded — never the secret value itself.
 */
export type SkippedSecretFile = {
  path: string
  /** Gitleaks rule ID (e.g., "github-pat", "aws-access-token") */
  ruleId: string
  /** Human-readable label derived from rule ID */
  label: string
}

/**
 * Result from uploading team memory with conflict info
 */
export type TeamMemorySyncPushResult = {
  success: boolean
  filesUploaded: number
  checksum?: string
  conflict?: boolean // true if 412 Precondition Failed
  error?: string
  /** Files skipped because they contain detected secrets (PSR M22174). */
  skippedSecrets?: SkippedSecretFile[]
  errorType?:
    | 'auth'
    | 'timeout'
    | 'network'
    | 'conflict'
    | 'unknown'
    | 'no_oauth'
    | 'no_repo'
  httpStatus?: number
}

