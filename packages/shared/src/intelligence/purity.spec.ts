/**
 * Purity guard for the shared intelligence layer.
 *
 * `packages/shared/src/intelligence/` is consumed by the NestJS API (Node), the
 * Next.js web app (browser + SSR), the Vite admin SPA and React Native. It must
 * therefore stay free of platform-specific APIs, and every export must be
 * deterministic.
 *
 * These tests read the source files directly so a future edit that reaches for
 * `window`, React or Prisma fails here rather than at a consumer's build.
 */
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

import * as intelligence from './index'

const DIR = __dirname

const sourceFiles = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'index.ts')
  .sort()

/** Strip comments and string literals so prose ("...the document...") never trips the scan. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

describe('shared intelligence purity', () => {
  it('ships the expected engine modules', () => {
    expect(sourceFiles).toEqual([
      'actionCenterEngine.ts',
      'geo.ts',
      'matchingEngine.ts',
      'pricingEngine.ts',
      'returnLoadEngine.ts',
      'shipmentIntelligence.ts',
    ])
  })

  describe.each(sourceFiles)('%s', (file) => {
    const code = codeOnly(readFileSync(join(DIR, file), 'utf8'))

    it.each([
      ['React', /\bfrom\s+['"]react['"]/],
      ['Next.js', /\bfrom\s+['"]next\//],
      ['Prisma / database package', /\bfrom\s+['"](@prisma\/client|@lorrycarry\/database)['"]/],
      ['Node built-ins', /\bfrom\s+['"](fs|path|crypto|os|child_process)['"]/],
      ['DOM globals', /\b(window|document|navigator|localStorage|sessionStorage)\s*\./],
      ['process.env', /\bprocess\s*\.\s*env\b/],
    ])('does not depend on %s', (_label, pattern) => {
      expect(code).not.toMatch(pattern)
    })

    it('does not leak Tailwind class names', () => {
      // Presentation belongs to the consuming app; engines return neutral tokens.
      expect(code).not.toMatch(/\b(?:bg|text|border)-(?:red|green|blue|amber|emerald|slate|orange)-\d{2,3}\b/)
    })

    it('only reads wall-clock time as a fallback for an injectable `now`', () => {
      // Time-dependent rules must accept an explicit `now` so callers (and
      // tests) can pin the clock. Reading the real clock is allowed only as the
      // right-hand fallback of an option the caller can supply, e.g.
      //   const now = toTime(params.now) ?? Date.now()
      //   const t   = options?.now ? new Date(options.now).getTime() : Date.now()
      const clockReads = code.match(/new Date\(\s*\)|Date\.now\(\s*\)/g) ?? []
      if (clockReads.length === 0) return

      for (const line of code.split('\n')) {
        if (!/new Date\(\s*\)|Date\.now\(\s*\)/.test(line)) continue
        // The line must reference a caller-supplied `now` alongside the fallback.
        expect(line).toMatch(/\bnow\b/)
        expect(line).toMatch(/\?\?|\?|:|=/)
      }
    })
  })

  it('exports the seven documented intelligence entry points', () => {
    for (const fn of [
      'calculateGeoDistance',
      'estimateFreightRate',
      'calculateMatchScore',
      'evaluateBackhaulOpportunities',
      'assessShipmentIntelligence',
      'summarizeActiveShipmentsControlTower',
      'deriveOperationalTasks',
    ]) {
      expect(typeof (intelligence as Record<string, unknown>)[fn]).toBe('function')
    }
  })
})

describe('shared intelligence determinism', () => {
  it('calculateGeoDistance is stable and symmetric', () => {
    const pune: [number, number] = [18.5204, 73.8567]
    const bengaluru: [number, number] = [12.9716, 77.5946]

    const a = intelligence.calculateGeoDistance(...pune, ...bengaluru)
    const b = intelligence.calculateGeoDistance(...pune, ...bengaluru)
    const reversed = intelligence.calculateGeoDistance(...bengaluru, ...pune)

    expect(a).toBe(b)
    expect(a).toBeCloseTo(reversed, 6)
    expect(a).toBeGreaterThan(0)
  })

  it('estimateFreightRate returns identical output for identical input', () => {
    const input = { distanceKm: 840, tonnage: 18, truckType: 'Open' as const }

    expect(intelligence.estimateFreightRate(input)).toEqual(
      intelligence.estimateFreightRate(input)
    )
  })
})
