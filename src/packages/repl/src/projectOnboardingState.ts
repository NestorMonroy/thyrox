import memoize from 'lodash-es/memoize.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from '@thyrox/config'
import { readEnv } from '@thyrox/config/env/utils'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { isDirEmpty } from '@thyrox/storage/file.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { INSTRUCTIONS_FILE_NAME, instructionsFileCandidates } from '@thyrox/config/env/instructionFiles.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

export type Step = {
  key: string
  text: string
  isComplete: boolean
  isCompletable: boolean
  isEnabled: boolean
}

export function getSteps(): Step[] {
  const fs = getFsImplementation()
  const hasClaudeMd = instructionsFileCandidates(getCwd()).some(path => fs.existsSync(path))
  const isWorkspaceDirEmpty = isDirEmpty(getCwd())

  return [
    {
      key: 'workspace',
      text: `Ask ${PRODUCT_NAME} to create a new app or clone a repository`,
      isComplete: false,
      isCompletable: true,
      isEnabled: isWorkspaceDirEmpty,
    },
    {
      key: 'claudemd',
      text: `Run /init to create a ${INSTRUCTIONS_FILE_NAME} file with instructions for ${PRODUCT_NAME}`,
      isComplete: hasClaudeMd,
      isCompletable: true,
      isEnabled: !isWorkspaceDirEmpty,
    },
  ]
}

export function isProjectOnboardingComplete(): boolean {
  return getSteps()
    .filter(({ isCompletable, isEnabled }) => isCompletable && isEnabled)
    .every(({ isComplete }) => isComplete)
}

export function maybeMarkProjectOnboardingComplete(): void {
  // Short-circuit on cached config — isProjectOnboardingComplete() hits
  // the filesystem, and REPL.tsx calls this on every prompt submit.
  if (getCurrentProjectConfig().hasCompletedProjectOnboarding) {
    return
  }
  if (isProjectOnboardingComplete()) {
    saveCurrentProjectConfig(current => ({
      ...current,
      hasCompletedProjectOnboarding: true,
    }))
  }
}

export const shouldShowProjectOnboarding = memoize((): boolean => {
  const projectConfig = getCurrentProjectConfig()
  // Short-circuit on cached config before isProjectOnboardingComplete()
  // hits the filesystem — this runs during first render.
  if (
    projectConfig.hasCompletedProjectOnboarding ||
    projectConfig.projectOnboardingSeenCount >= 4 ||
    readEnv('IS_DEMO')
  ) {
    return false
  }

  return !isProjectOnboardingComplete()
})

export function incrementProjectOnboardingSeenCount(): void {
  saveCurrentProjectConfig(current => ({
    ...current,
    projectOnboardingSeenCount: current.projectOnboardingSeenCount + 1,
  }))
}
