// La fuente decompilada traía un stub (`unknown` en los tres tipos). La
// forma se deriva de lo que este comando escribe: el `INITIAL_STATE`, cada
// `setState` y los `warnings.push` de `install-github-app.tsx`, y los
// literales de `setupGitHubActions.ts`.
export type Workflow = 'claude' | 'claude-review'

export type Warning = {
  title: string
  message: string
  instructions: string[]
}

export type State = {
  step:
    | 'check-gh'
    | 'warnings'
    | 'choose-repo'
    | 'install-app'
    | 'check-existing-workflow'
    | 'select-workflows'
    | 'check-existing-secret'
    | 'api-key'
    | 'oauth-flow'
    | 'creating'
    | 'success'
    | 'error'
  selectedRepoName: string
  currentRepo: string
  useCurrentRepo: boolean
  apiKeyOrOAuthToken: string
  useExistingKey: boolean
  currentWorkflowInstallStep: number
  warnings: Warning[]
  secretExists: boolean
  secretName: string
  useExistingSecret: boolean
  workflowExists: boolean
  /** Lo que eligió quien instala ante un workflow ya existente; no existe hasta que elige. */
  workflowAction?: 'update' | 'skip' | 'exit'
  selectedWorkflows: Workflow[]
  selectedApiKeyOption: 'existing' | 'new' | 'oauth'
  authType: 'api_key' | 'oauth_token'
  error?: string
  errorReason?: string
  errorInstructions?: string[]
}
