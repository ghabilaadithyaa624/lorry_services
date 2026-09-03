/**
 * LorryCarry UI Component Library
 *
 * Centralized export for all shared UI primitives.
 * Import from '@/components/ui' instead of individual files.
 *
 * Theming: every primitive resolves colour through the semantic design tokens
 * defined in `globals.css`, so components render correctly in both the light
 * and dark themes without per-call-site overrides.
 *
 * @example
 * import { Button, Card, Badge, Input, Tabs, EmptyState } from '@/components/ui'
 */

// ── Atoms & primitives ──
export * from './Button'
export * from './Badge'
export * from './Spinner'
export * from './Skeleton'
export * from './StatusDot'
export * from './Avatar'

// ── Forms ──
export * from './Input'

// ── Surfaces & layout ──
export * from './Card'
export * from './GlassPanel'
export * from './PageHeader'
export * from './KpiCard'

// ── Navigation & disclosure ──
export * from './Tabs'
export * from './Modal'

// ── Feedback & data display ──
export * from './TelemetryMetric'
export * from './AlertBanner'
export * from './DataTable'
export * from './Toast'
export * from './Timeline'
export * from './EmptyState'
export * from './OperationalEmptyState'
export * from './FreightNetworkDiagram'
export * from './OptimizedImage'
