/**
 * Tests de los ayudantes de force-downgrade — correccion del porte contra
 * ant v2.1.136 `Lw_` (3480.js) y `UK6` (3480.js).
 *
 * El camino asincrono de `getMaxVersionConfig` pasa por GrowthBook, que no
 * se puede mockear limpiamente en bun:test. Estos tests unitarios fijan el
 * contrato de decision puro de `shouldForceDowngradeNow`, que es el centro
 * de decision tanto del AutoUpdater como del instalador nativo.
 */
import { describe, expect, test } from 'bun:test'
import { shouldForceDowngradeNow } from '../autoUpdater.js'

describe('shouldForceDowngradeNow (ant UK6)', () => {
  test('current > target → true (downgrade fires)', () => {
    expect(shouldForceDowngradeNow('26.5.10', '26.4.5', 'auto_updater')).toBe(
      true,
    )
  })

  test('current === target → false (no downgrade needed)', () => {
    expect(shouldForceDowngradeNow('26.5.10', '26.5.10', 'auto_updater')).toBe(
      false,
    )
  })

  test('current < target → false (normal upgrade path)', () => {
    expect(shouldForceDowngradeNow('26.4.5', '26.5.10', 'auto_updater')).toBe(
      false,
    )
  })

  test('major version drop → true', () => {
    expect(shouldForceDowngradeNow('27.0.0', '26.5.0', 'auto_updater')).toBe(
      true,
    )
  })

  test('minor version drop → true', () => {
    expect(shouldForceDowngradeNow('26.5.0', '26.4.99', 'auto_updater')).toBe(
      true,
    )
  })

  test('patch version drop → true', () => {
    expect(shouldForceDowngradeNow('26.4.10', '26.4.9', 'auto_updater')).toBe(
      true,
    )
  })

  test('CalVer-style versions compare correctly', () => {
    // ccb uses v<year>.<month>.<N> calver. Verify "26.5.99 > 26.4.99"
    // (mismo año: gana el mes posterior).
    expect(shouldForceDowngradeNow('26.5.99', '26.4.99', 'auto_updater')).toBe(
      true,
    )
    expect(shouldForceDowngradeNow('26.4.99', '26.5.1', 'auto_updater')).toBe(
      false,
    )
  })

  test('"native_update" reason tag — same decision semantics', () => {
    expect(shouldForceDowngradeNow('26.5.10', '26.4.5', 'native_update')).toBe(
      true,
    )
    expect(shouldForceDowngradeNow('26.4.5', '26.5.10', 'native_update')).toBe(
      false,
    )
  })

  test('unparseable current version → false (ant parse returns null)', () => {
    // el `gt()` de semver devuelve false ante una entrada que no analiza, y
    // eso coincide con ant
    // `parse(currentVersion)?.compare(...) ?? false`.
    expect(shouldForceDowngradeNow('not-a-version', '26.4.5', 'auto_updater')).toBe(
      false,
    )
  })

  test('unparseable target version → false', () => {
    expect(
      shouldForceDowngradeNow('26.5.10', 'not-a-version', 'auto_updater'),
    ).toBe(false)
  })

  test('build metadata is ignored by comparison (semver)', () => {
    // 26.5.10+abc1234 === 26.5.10+def5678 a efectos de orden.
    expect(
      shouldForceDowngradeNow(
        '26.5.10+abc1234',
        '26.5.10+def5678',
        'auto_updater',
      ),
    ).toBe(false)
  })

  test('prerelease tags compare per semver rules', () => {
    // 26.5.0-rc.1 < 26.5.0 → no downgrade
    expect(
      shouldForceDowngradeNow('26.5.0-rc.1', '26.5.0', 'auto_updater'),
    ).toBe(false)
    // 26.5.0 > 26.5.0-rc.1 → downgrade
    expect(
      shouldForceDowngradeNow('26.5.0', '26.5.0-rc.1', 'auto_updater'),
    ).toBe(true)
  })
})
