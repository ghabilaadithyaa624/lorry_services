/**
 * Cross-repo invariants for the canonical role model.
 *
 * docs/database-schema-design.md defines the canonical roles
 * `factory_owner`, `truck_driver`, `transporter`, `admin`. This suite asserts
 * the Prisma enum, the migration chain and the web helper all agree, so the
 * legacy labels cannot creep back in.
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { normalizeRole } from './roles'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const SCHEMA = join(REPO_ROOT, 'packages', 'database', 'prisma', 'schema.prisma')
const MIGRATIONS = join(REPO_ROOT, 'packages', 'database', 'prisma', 'migrations')

const CANONICAL = ['factory_owner', 'truck_driver', 'transporter', 'admin']
const LEGACY = ['load_owner', 'truck_owner', 'driver']

describe('Prisma UserRole enum', () => {
  const schema = readFileSync(SCHEMA, 'utf8')
  const body = schema.match(/enum UserRole \{([\s\S]*?)\}/)?.[1] ?? ''
  const values = body
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter(Boolean)

  it('declares exactly the canonical roles', () => {
    expect(values).toEqual(CANONICAL)
  })

  it.each(LEGACY)('no longer declares the legacy role %s', (legacy) => {
    expect(values).not.toContain(legacy)
  })
})

describe('role migration chain', () => {
  const dirs = readdirSync(MIGRATIONS).sort()
  const sql = Object.fromEntries(
    dirs.map((d) => [d, readFileSync(join(MIGRATIONS, d, 'migration.sql'), 'utf8')])
  )
  const canonicalize = dirs.find((d) => d.includes('canonicalize_user_roles'))

  it('ships a canonicalization migration', () => {
    expect(canonicalize).toBeDefined()
  })

  it('backfills legacy rows before the old enum type is dropped', () => {
    const body = sql[canonicalize as string]
    const backfill = body.indexOf("SET \"role\" = 'truck_driver'")
    const dropType = body.indexOf('DROP TYPE "UserRole"')
    expect(backfill).toBeGreaterThan(-1)
    expect(dropType).toBeGreaterThan(-1)
    // Data must be rescued before the type that holds it disappears.
    expect(backfill).toBeLessThan(dropType)
  })

  it('maps every legacy label onto a canonical one', () => {
    const body = sql[canonicalize as string]
    expect(body).toContain("WHEN 'load_owner' THEN 'factory_owner'")
    expect(body).toContain("WHEN 'truck_owner' THEN 'truck_driver'")
    expect(body).toContain("WHEN 'driver' THEN 'truck_driver'")
  })

  it('creates the new enum with only canonical values', () => {
    expect(sql[canonicalize as string]).toContain(
      "CREATE TYPE \"UserRole_new\" AS ENUM ('factory_owner', 'truck_driver', 'admin')"
    )
  })

  it('has no later migration reintroducing a legacy enum value', () => {
    const after = dirs.filter((d) => d > (canonicalize as string))
    for (const dir of after) {
      for (const legacy of LEGACY) {
        expect(sql[dir]).not.toContain(`ADD VALUE IF NOT EXISTS '${legacy}'`)
        expect(sql[dir]).not.toContain(`ADD VALUE '${legacy}'`)
      }
    }
  })
})

describe('application normalization matches the migration', () => {
  it.each([
    ['load_owner', 'factory_owner'],
    ['truck_owner', 'truck_driver'],
    ['driver', 'truck_driver'],
  ])('normalizes %s to %s, same as the SQL CASE', (legacy, canonical) => {
    expect(normalizeRole(legacy)).toBe(canonical)
  })

  it('only ever emits canonical roles', () => {
    for (const role of [...CANONICAL, ...LEGACY]) {
      expect(CANONICAL).toContain(normalizeRole(role))
    }
  })
})
