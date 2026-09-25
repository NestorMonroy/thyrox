/**
 * V7 §10.3 facade — moved to `@thyrox/config/env/privacy`.
 *
 * Wires the host's `isTelemetryDisabled` probe into the package via the
 * setter exported by the package. This file is still the call site for
 * now; once src/utils/privacyLevel.ts itself moves (Wave 2), the wiring
 * happens inside the installer.
 */

import { setIsTelemetryDisabledFn } from '@thyrox/config/env/privacy'
import { isTelemetryDisabled } from '@thyrox/config/env/privacy-level'

// eslint-disable-next-line custom-rules/no-top-level-side-effects
setIsTelemetryDisabledFn(() => isTelemetryDisabled())

export { isAnalyticsDisabled } from '@thyrox/config/env/privacy'
