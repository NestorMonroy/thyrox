# Mecanismo de release de qwen-code, leído para decidir el de thyrox

Pregunta del ejecutor (2026-09-27), al revisar `install`: *¿qué pasa cuando no
se esté usando Claude Code y se esté usando otro provider?* Hoy `install` y el
auto-updater de thyrox descargan las releases de Claude Code
(`@thyrox/updater: autoUpdater.ts:75`, bucket `claude-code-releases`; y
`nativeInstaller/download.ts`, `npm view ${MACRO.NATIVE_PACKAGE_URL}`). Antes
de decidir qué debe hacer, se lee cómo resuelve el release otro agente de
terminal que sí tiene canal propio.

Fuente: `/home/user/nestormonroy/qwen-code` en `ffea2d0` (2026-09-24).

## 1. El pipeline — `.github/workflows/release.yml` (844 líneas)

| Etapa | Qué hace | Dónde |
|---|---|---|
| disparo | cron diario (nightly) y semanal (preview), más `workflow_dispatch` con `version`, `ref`, `dry_run` | `release.yml:3-37` |
| `prepare` | resuelve commit y versión con `scripts/get-release-version.js` | `release.yml:49-238` |
| calidad | lint, build, typecheck, tests en 3 shards, tests de scripts; un job `quality` agrega | `release.yml:239-475` |
| integración | CLI e interactiva sin sandbox y en Docker | `release.yml:495-580` |
| `publish` | rama de release → bundle → archivos standalone → `npm publish` con dist-tag → verificar archivos → release y tag de GitHub | `release.yml:587-765`, pasos vía `run-release-step.sh` |
| fallo | abre un issue | `release.yml:766-` |

La publicación se serializa por tag y nunca se cancela a medias
(`release.yml:616-618`).

## 2. Versión y canales — `scripts/get-release-version.js` (551 líneas)

Tres canales, cada uno un **dist-tag de npm**, con semver:

- `latest` — estable, `X.Y.Z` sin prerelease;
- `preview` — `X.Y.Z-preview.N`;
- `nightly` — `X.Y.Z-nightly.<fecha>.<hash>` (`:318-326`), y `promote-nightly`
  sube la minor (`:298-316`).

Detecta rollback: si el dist-tag apunta a una versión menor que la mayor
publicada, toma la mayor como base (`:61-180`). La fuente de verdad de «qué
hay publicado» es el registro de npm, no los tags de git.

## 3. Artefactos e integridad

- Archivos standalone por plataforma (`scripts/build-standalone-release.js`,
  678 líneas), en GitHub Releases y en un espejo OSS de Aliyun.
- `SHA256SUMS` firmado con **Ed25519** (`scripts/sign-release.sh`); la clave
  pública va embebida en el cliente (`standalone-update-verify.ts`).
- El instalador `install-qwen-standalone.sh` elige GitHub o el espejo según
  cuál responda antes con `SHA256SUMS` (`:707-762`) y admite
  `--version latest|semver` (`:155-222`).

## 4. El cliente — cómo sabe que hay versión nueva y cómo se actualiza

- `utils/installationInfo.ts` detecta el **método de instalación**: clon de
  git, npx/pnpx/bunx, npm/pnpm/bun global, Homebrew, standalone. Cada uno da
  su propio mensaje de actualización.
- **Clon local de git** (`installationInfo.ts:198-213`): no descarga nada;
  responde *«Running from a local git clone. Please update with "git pull".»*
- `ui/utils/updateCheck.ts` consulta `npm view <pkg> dist-tags.<tag>` con
  timeout acotado y distingue `timeout | offline | registry` (`:57-117,162-`).

## Lo que esto dice para thyrox

1. **El release no depende del provider.** En qwen, versión, canal, artefacto
   y firma son del *programa*; ninguno nombra el modelo ni el proveedor. Por
   eso descargar las releases de otro producto no tiene arreglo por
   configuración: thyrox necesita su propio canal, o ninguno.
2. **thyrox hoy sólo existe como clon.** Corre con Bun desde la fuente
   (`bin/cli` → `entry/cli.tsx`), sin bundle, sin paquete publicado, sin tags
   de versión. En la tabla de qwen es exactamente la fila «clon local de git»,
   y qwen la resuelve sin descargar nada.
3. **Lo mínimo coherente con la fuente**, en orden:
   - (a) detección del método de instalación, con la rama de clon: `update`
     informa `git pull` y el auto-updater no descarga;
   - (b) `install` pone el lanzador `thyrox` en el PATH desde el clon
     (`generate_bin --install-user-bin` ya existe);
   - (c) un canal propio sólo cuando haya artefacto que publicar: tags
     `vX.Y.Z` y GitHub Releases con `SHA256SUMS` firmado. Un binario de
     `bun build --compile` por plataforma sería el equivalente del standalone.
     Hasta entonces, sin canal no hay descarga.

*Métrica:* lectura de los archivos citados, en el commit `ffea2d0`.
*Ciega a:* los pasos de `run-release-step.sh` y de `finalize-release.yml` que
no se abrieron línea a línea, y a la operación real (credenciales, espejos),
que no se ejecutó.
