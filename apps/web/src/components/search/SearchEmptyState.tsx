'use client'

import React from 'react'
import {
  ArrowRightLeft,
  Crosshair,
  Factory,
  Layers,
  MapPin,
  Navigation,
  Package,
  RotateCcw,
  Ruler,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  INDUSTRIAL_HUB_SUGGESTIONS,
  VEHICLE_BODY_TYPES,
  bodyTypeLabel,
  getSearchEmptyCopy,
  oppositeMode,
  resolveMarketplaceCtas,
  searchUrlForMode,
  widerRadiusSteps,
  type HubSuggestion,
  type SearchEmptyVariant,
  type SearchMode,
} from '@/lib/searchEmptyState'

export interface SearchEmptyStateProps {
  mode: SearchMode
  /** Which "why is this empty" variant to render — see `resolveSearchEmptyVariant`. */
  variant: SearchEmptyVariant
  /** Current radius filter, in km (string, matching the search panel select). */
  radius: string
  /** Current vehicle body filter ('' = all types). */
  truckType: string
  /** Loading point label, when one is set. */
  locationLabel?: string
  /** Human-readable failure message for the `error` variant. */
  searchError?: string | null
  /** Whether the browser exposes the Geolocation API. */
  gpsSupported?: boolean
  gpsLoading?: boolean
  /** Whether a browser session exists — login redirects vs direct routes. */
  isAuthenticated?: boolean
  /**
   * Canonical or legacy role label from the persisted session.
   *
   * Decides which publish CTAs are offered: transporters and admins operate
   * both sides, a factory owner posts freight, a driver registers vehicles.
   * Withheld sides are explained instead of linked, so nobody is sent to a
   * route the middleware would bounce them off.
   */
  role?: string | null
  onDetectLocation: () => void
  onFocusLocationInput: () => void
  onHubSelect: (hub: HubSuggestion) => void
  onRadiusSelect: (radius: string) => void
  onTruckTypeSelect: (truckType: string) => void
  onResetFilters: () => void
  onRetry: () => void
  onSwitchMode: (mode: SearchMode) => void
  className?: string
}

const chipClass =
  'px-2.5 py-1 rounded-badge text-[11px] font-semibold transition-colors cursor-pointer ' +
  'bg-sunken text-body hover:bg-wash-strong hover:text-ink border border-white/5 ' +
  'focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none'

const chipActiveClass =
  'px-2.5 py-1 rounded-badge text-[11px] font-semibold transition-colors cursor-pointer ' +
  'bg-primary-500 text-white border border-primary-400/40 shadow-glow-primary ' +
  'focus-visible:ring-2 focus-visible:ring-primary-500 focus:outline-none'

interface StepShellProps {
  step: string
  title: string
  hint: string
  icon: React.ReactNode
  /** Marks the step the operator should act on next for the current variant. */
  isCurrent?: boolean
  children: React.ReactNode
}

/**
 * One numbered guidance card.
 *
 * Follows the operational step-card treatment from
 * docs/LORRYCARRY_DESIGN_SYSTEM.md §15, but each step also carries a working
 * control so the operator can act without hunting for the search panel.
 */
function StepShell({ step, title, hint, icon, isCurrent, children }: StepShellProps) {
  return (
    <div
      className={cn(
        'bg-sunken/70 border rounded-2xl p-4 space-y-3 text-left transition-colors',
        isCurrent ? 'border-primary-500/40' : 'border-white/5'
      )}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-bold text-primary-400 block tracking-widest">
          STEP {step}
        </span>
        <span className="text-subtle shrink-0" aria-hidden="true">
          {icon}
        </span>
      </div>

      <h4 className="text-xs font-bold text-ink">{title}</h4>
      <p className="text-[11px] text-muted leading-relaxed">{hint}</p>

      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

/**
 * Empty-state guidance panel for `/search`.
 *
 * A bare "no results" panel leaves a public visitor with nothing to do, so this
 * spells out the four ways to get a hit — detect location, enter an industrial
 * hub, expand radius, change vehicle type — and pairs them with the publish
 * CTAs that create supply when the marketplace genuinely has none.
 */
export function SearchEmptyState({
  mode,
  variant,
  radius,
  truckType,
  locationLabel,
  searchError,
  gpsSupported = true,
  gpsLoading = false,
  isAuthenticated = false,
  role = null,
  onDetectLocation,
  onFocusLocationInput,
  onHubSelect,
  onRadiusSelect,
  onTruckTypeSelect,
  onResetFilters,
  onRetry,
  onSwitchMode,
  className,
}: SearchEmptyStateProps) {
  const isTruckMode = mode === 'trucks'
  const { title, description } = getSearchEmptyCopy(variant, {
    mode,
    radius,
    locationLabel,
  })
  const Icon = isTruckMode ? Truck : Package
  const widerRadii = widerRadiusSteps(radius)
  const otherMode = oppositeMode(mode)

  /**
   * Publish CTAs for this role and tab: primary side first, any side the
   * account cannot use withheld with an explanation (see
   * `resolveMarketplaceCtas`).
   */
  const ctaSet = resolveMarketplaceCtas({ mode, role, isAuthenticated })

  return (
    <div
      data-search-empty-variant={variant}
      className={cn(
        'p-6 sm:p-10 bg-panel/80 backdrop-blur-xl rounded-card border border-hairline shadow-modal space-y-6',
        className
      )}
    >
      {/* ── Headline ── */}
      <div className="text-center flex flex-col items-center">
        <div
          className="w-14 h-14 rounded-2xl bg-sunken border border-hairline flex items-center justify-center mb-4"
          aria-hidden="true"
        >
          <Icon className="w-7 h-7 text-primary-500" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-ink tracking-tight">{title}</h3>
        <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed mt-1.5">{description}</p>
      </div>

      {/* ── Failure is reported as a failure, never as "0 results" ── */}
      {variant === 'error' && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-danger-500/25 bg-danger-500/5"
        >
          <p className="text-xs text-danger-700 dark:text-danger-300 leading-relaxed">
            {searchError ||
              'The search service did not respond. No result count is available for this query.'}
          </p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0">
            Retry search
          </Button>
        </div>
      )}

      {/* ── Guidance: four ways to get a result ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StepShell
          step="01"
          title="Detect your location"
          hint={
            gpsSupported
              ? 'Uses the browser location permission and reverse-geocodes to your nearest hub.'
              : 'This browser has no location API — enter a city or industrial hub instead.'
          }
          icon={<Crosshair className="w-4 h-4" />}
          isCurrent={variant === 'needs-location'}
        >
          <Button
            size="sm"
            variant="secondary"
            disabled={!gpsSupported}
            loading={gpsLoading}
            loadingText="Detecting your location"
            leftIcon={<Navigation className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={onDetectLocation}
          >
            {gpsLoading ? 'Locating...' : 'Detect GPS location'}
          </Button>
        </StepShell>

        <StepShell
          step="02"
          title="Enter an industrial hub or city"
          hint="Tap a freight-dense hub to load it as the loading point, or type your own city."
          icon={<MapPin className="w-4 h-4" />}
          isCurrent={variant === 'ready-to-search'}
        >
          {INDUSTRIAL_HUB_SUGGESTIONS.map((hub) => (
            <button key={hub.query} type="button" className={chipClass} onClick={() => onHubSelect(hub)}>
              <span className="font-bold">{hub.label}</span>
              <span className="text-subtle"> · {hub.state}</span>
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={onFocusLocationInput}>
            Type a city
          </Button>
        </StepShell>

        <StepShell
          step="03"
          title="Expand the search radius"
          hint={
            widerRadii.length > 0
              ? `Nothing matched within ${radius} km. A wider corridor pulls in carriers and loads from neighbouring districts.`
              : `${radius} km is the widest supported radius — try another loading point instead.`
          }
          icon={<Ruler className="w-4 h-4" />}
          isCurrent={variant === 'no-results' || variant === 'error'}
        >
          {widerRadii.map((step) => (
            <button
              key={step}
              type="button"
              className={chipClass}
              onClick={() => onRadiusSelect(step)}
            >
              <span className="font-mono font-bold">{step} km</span>
            </button>
          ))}
          {widerRadii.length === 0 && (
            <span className="text-[11px] text-subtle font-mono">No wider step available</span>
          )}
        </StepShell>

        <StepShell
          step="04"
          title="Change the vehicle type"
          hint="Body-type and weight filters can hide an otherwise valid match — reset them and re-run."
          icon={<Layers className="w-4 h-4" />}
          isCurrent={variant === 'no-results' || variant === 'error'}
        >
          <button
            type="button"
            className={truckType ? chipClass : chipActiveClass}
            aria-pressed={!truckType}
            onClick={() => onTruckTypeSelect('')}
          >
            All vehicle types
          </button>
          {VEHICLE_BODY_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={truckType === option.value ? chipActiveClass : chipClass}
              aria-pressed={truckType === option.value}
              onClick={() => onTruckTypeSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={onResetFilters}
          >
            Reset all filters
          </Button>
        </StepShell>
      </div>

      {/* ── Publish + switch-side CTAs ── */}
      <div className="pt-5 border-t border-hairline flex flex-col items-center gap-3">
        <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-subtle text-center">
          Nothing live near you? Create the match
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {ctaSet.ctas.map((cta) => (
            <Button
              key={cta.kind}
              as="a"
              href={cta.href}
              variant={cta.primary ? 'primary' : 'secondary'}
              size="sm"
              data-cta={cta.kind}
              leftIcon={
                cta.kind === 'post-freight' ? (
                  <Factory className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                )
              }
            >
              {cta.label}
            </Button>
          ))}

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() => onSwitchMode(otherMode)}
          >
            {isTruckMode ? 'Search freight loads instead' : 'Search trucks instead'}
            <span className="sr-only">({searchUrlForMode(otherMode)})</span>
          </Button>
        </div>

        {/*
          A side the signed-in role cannot use is explained, never linked:
          the middleware redirects a factory owner off /register-truck and a
          driver off /post-load, so a button there would be a dead end.
        */}
        {ctaSet.hidden && (
          <p className="text-[11px] text-subtle text-center max-w-lg leading-relaxed">
            {ctaSet.hidden.note}
          </p>
        )}

        <p className="text-[11px] text-subtle text-center max-w-lg leading-relaxed">
          {ctaSet.primary?.kind === 'post-freight'
            ? `Publishing a load puts your requirement in front of verified transporters, and the ${bodyTypeLabel(truckType || 'Open')} fleet nearby can bid on it.`
            : 'Listing your vehicle publishes your capacity and preferred corridors to shippers searching this hub.'}
        </p>
      </div>
    </div>
  )
}

export default SearchEmptyState
