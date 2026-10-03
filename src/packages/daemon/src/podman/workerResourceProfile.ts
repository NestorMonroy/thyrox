/**
 * Adaptador: el perfil de límites vive en `@thyrox/podman-execution`
 * (TASK-THYROX-0667). Se reexporta para los importadores del daemon; no hay
 * una segunda implementación.
 */

export * from '@thyrox/podman-execution/workerResourceProfile.ts'
