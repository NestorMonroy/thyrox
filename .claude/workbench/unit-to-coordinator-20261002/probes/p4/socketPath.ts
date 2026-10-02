#!/usr/bin/env bun
/**
 * Imprime la ruta del socket del coordinador de model scheduling de este
 * anfitrión (TASK-THYROX-0759): la que un lanzador publica en una unidad
 * —montada y nombrada en `THYROX_MODEL_COORDINATOR_SOCKET`— para que su
 * `thyrox -p` pida admisión sin saber cómo se deriva.
 */
import { modelCoordinatorSocketPath } from '../coordinatorProtocol.ts'

console.log(modelCoordinatorSocketPath(process.env))
