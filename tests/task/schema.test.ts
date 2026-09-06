/**
 * El esquema de `tasks` se declara DOS veces, en dos lenguas, y nada guardaba
 * que siguieran siendo compatibles.
 *
 * Medido antes de escribir este control (`censo-ddl-tareas-20260906T182720`):
 * la base de `src/agents/agent_store.py` declara **15** columnas y el piso de
 * `TABLERO_DDL` declara **13**. El delta es exactamente
 * `{submodule, submodule_source}`, y las dos están cubiertas por un
 * `ALTER TABLE` del lado Python. Ninguna columna `NOT NULL` de la base falta
 * en el piso. O sea: **piso ⊂ base**, y hoy el par está reconciliado.
 *
 * Lo que NO existía es la guarda. `CREATE TABLE IF NOT EXISTS` no altera una
 * tabla ya creada, así que una columna `NOT NULL` nueva que entrara a la base
 * del Python sin entrar al piso del TS dejaría **en silencio** a toda base
 * creada por el harness sin esa columna — y el fallo aparecería como un
 * `NOT NULL constraint failed` en un consumidor que no la declaró.
 *
 * Qué haría fallar este control, declarado antes de escribirlo:
 *
 * 1. Una columna nueva en la base del Python sin ALTER ni entrada en el piso.
 * 2. Una columna `NOT NULL` en la base del Python ausente del piso.
 * 3. Que el comparador midiera en vacío — una regex que dejara de casar
 *    devolvería listas vacías y las dos aserciones darían verde sin medir
 *    nada. Por eso se afirman también los conteos.
 * 4. Que el esquema siguiera declarado dentro de la herramienta del harness:
 *    el vocabulario y la forma de la tabla son del subsistema de tareas, no
 *    de su superficie de herramienta.
 */
import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  alterColumns, floorColumns, pythonBaseColumns, schemaDrift,
  selectCitationId, TABLERO_DDL, TASK_HIGHWATER_DDL, TASK_STATUSES, UPDATE_STATUSES,
} from '../../src/task/schema.ts'

const RAIZ = new URL('../..', import.meta.url).pathname

describe('las dos declaraciones del esquema de tareas', () => {
  test('el piso del TS declara las 13 columnas que el harness crea', () => {
    expect(floorColumns()).toEqual([
      'task_id', 'subject', 'description', 'status', 'active_form', 'owner',
      'blocks_json', 'blocked_by_json', 'session_id', 'source', 'metadata_json',
      'created_at', 'updated_at',
    ])
  })

  test('la base del Python declara 15 — el piso más las dos de capa', () => {
    const base = pythonBaseColumns()
    expect(base.length).toBe(15)
    expect(base).toContain('submodule')
    expect(base).toContain('submodule_source')
  })

  test('los tres grupos de ALTER del Python suman cinco columnas', () => {
    expect(alterColumns().sort()).toEqual([
      'citation_id', 'opened_at', 'opened_at_source', 'submodule', 'submodule_source',
    ])
  })
})

describe('el invariante: piso ⊂ base, y el delta lo cubre un ALTER', () => {
  test('ninguna columna de la base queda fuera del piso sin ALTER que la añada', () => {
    const d = schemaDrift()
    expect(d.uncovered).toEqual([])
    // No puede pasar en vacío: si el comparador dejara de leer, `uncovered`
    // saldría vacío por no haber medido nada. Sub-patrón D dentro del control.
    expect(d.base.length).toBeGreaterThan(0)
    expect(d.floor.length).toBeGreaterThan(0)
  })

  test('ninguna columna NOT NULL de la base falta en el piso', () => {
    const d = schemaDrift()
    expect(d.missingNotNull).toEqual([])
    expect(d.notNull.length).toBeGreaterThan(0)
  })

  test('el delta medido hoy son exactamente las dos columnas de capa', () => {
    expect(schemaDrift().onlyInBase.sort()).toEqual(['submodule', 'submodule_source'])
  })
})

describe('el esquema ya no vive dentro de la herramienta del harness', () => {
  test('tools/tasks.ts no declara ningún CREATE TABLE', () => {
    const t = readFileSync(join(RAIZ, 'src/packages/harness/src/tools/tasks.ts'), 'utf8')
    expect(t).not.toContain('CREATE TABLE')
  })

  test('el vocabulario de estados se declara una sola vez, en el subsistema', () => {
    expect(TASK_STATUSES).toEqual(['pending', 'in_progress', 'completed'])
    expect(UPDATE_STATUSES).toContain('deleted')
  })
})

describe('la conducta se preserva', () => {
  test('el piso crea una tabla que acepta una fila mínima', () => {
    const db = new Database(':memory:')
    db.run(TABLERO_DDL)
    db.run(TASK_HIGHWATER_DDL)
    db.run(
      "INSERT INTO tasks (task_id, subject, status, session_id, created_at, updated_at)"
      + " VALUES ('1', 'un sujeto', 'pending', 's', 'a', 'b')",
    )
    expect((db.query('SELECT COUNT(*) AS n FROM tasks').get() as { n: number }).n).toBe(1)
    db.close()
  })

  test('selectCitationId sonda la base y no la asume', () => {
    const db = new Database(':memory:')
    db.run(TABLERO_DDL)
    expect(selectCitationId(db)).toBe('')
    db.run('ALTER TABLE tasks ADD COLUMN citation_id TEXT')
    expect(selectCitationId(db)).toBe(', citation_id')
    db.close()
  })
})
