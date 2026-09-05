'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { Navbar, Footer } from '@/components/layout'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { whatsappLink } from '@/lib/utils'
import {
  COMPANY_TYPES,
  DEMO_SUPPORT_PHONE,
  FLEET_SIZES,
  MONTHLY_LOADS,
  demoWhatsAppUrl,
  emptyDemoLead,
  submitDemoLead,
  validateDemoLead,
  type DemoLeadErrors,
  type DemoLeadInput,
} from '@/lib/leads'

const DEMO_COVERS = [
  {
    icon: Truck,
    title: 'Freight marketplace',
    body: 'How shippers post a load and how Vahan-verified trucks appear in the 50 km proximity search.',
  },
  {
    icon: MapPin,
    title: 'Matching & corridors',
    body: 'Proximity ranking, body-type fit and the reference corridor directory used before a booking.',
  },
  {
    icon: ShieldCheck,
    title: 'Verification workflow',
    body: 'RC, insurance and fitness checks against the Vahan database — what operators actually upload.',
  },
  {
    icon: Clock,
    title: 'Checkpoint tracking',
    body: 'Toll-gate milestone logs, ETAs and POD confirmation. Tracking is checkpoint-based, not live GPS.',
  },
]

const STEPS = [
  { n: '01', title: 'Share a few details', body: 'Tell us who you are and where you operate. Nothing is stored in the marketplace database.' },
  { n: '02', title: 'Confirm on WhatsApp', body: 'Send the request to the LorryCarry desk on the published helpline. We reply on the same thread.' },
  { n: '03', title: 'Walk through the product', body: 'A 20–30 minute screen-share covering the modules that match your role. No obligation to subscribe.' },
]

/**
 * Public Request Demo page — LocoNav-style B2B lead form.
 *
 * Honesty constraints:
 * - No invented customer counts, geographies, certifications or customer quotes.
 * - Form PII is not persisted; delivery is a user-initiated WhatsApp hand-off
 *   (with an API validation hop when the backend is reachable).
 */
export default function RequestDemo() {
  const [form, setForm] = useState<DemoLeadInput>(emptyDemoLead)
  const [errors, setErrors] = useState<DemoLeadErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ whatsappUrl: string; mailtoUrl: string | null } | null>(null)

  const setField = (key: keyof DemoLeadInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validateDemoLead(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const localUrl = demoWhatsAppUrl(form)
    try {
      const result = await submitDemoLead(form)
      setSubmitted({
        whatsappUrl: result?.whatsappUrl || localUrl,
        mailtoUrl: result?.mailtoUrl ?? null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col font-sans">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Hero band */}
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[320px] bg-primary-500/20 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 font-mono uppercase text-[10px] font-bold tracking-widest">
                <CalendarDays className="w-3 h-3" aria-hidden="true" />
                Product walkthrough
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                Request a LorryCarry demo
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                A live walkthrough of the freight marketplace, 50 km proximity matching, Vahan-ready
                verification and checkpoint tracking. No obligation — and no invented scale claims.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left column — what the demo covers */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
                  What we will walk through
                </h2>
                <p className="text-sm text-muted leading-relaxed">
                  The session is a screen-share of the product as it ships today. We only cover
                  capabilities that are live on LorryCarry.
                </p>
              </div>

              <ul className="space-y-3">
                {DEMO_COVERS.map((item) => {
                  const Icon = item.icon
                  return (
                    <li
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl border border-hairline bg-panel p-4"
                    >
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{item.title}</span>
                        <span className="mt-0.5 block text-xs sm:text-sm text-muted leading-relaxed">
                          {item.body}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>

              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-subtle">How it works</h3>
                <ol className="space-y-3">
                  {STEPS.map((step) => (
                    <li key={step.n} className="flex items-start gap-3">
                      <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                        {step.n}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{step.title}</span>
                        <span className="block text-xs sm:text-sm text-muted leading-relaxed">{step.body}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-xs text-subtle leading-relaxed border-t border-hairline pt-4">
                We do not publish customer counts, certifications or customer quotes on this page.
                The walkthrough is scheduled over the same WhatsApp helpline listed in Help &amp; Support.
              </p>
            </div>

            {/* Right column — form */}
            <div className="lg:col-span-7">
              <Card padding="none" className="shadow-modal">
                <Card.Header>
                  <div>
                    <Card.Title as="h2">Tell us where to reach you</Card.Title>
                    <p className="mt-1 text-xs sm:text-sm text-muted">
                      Required fields are marked. Fleet size and monthly loads are optional.
                    </p>
                  </div>
                </Card.Header>
                <Card.Body padding="lg">
                  {submitted ? (
                    <SuccessState whatsappUrl={submitted.whatsappUrl} mailtoUrl={submitted.mailtoUrl} />
                  ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                      {/* Honeypot — hidden from humans and assistive tech */}
                      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                        <label htmlFor="demo-website">Company website</label>
                        <input
                          id="demo-website"
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={form.website}
                          onChange={(event) => setField('website', event.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Full name"
                          name="name"
                          autoComplete="name"
                          required
                          value={form.name}
                          onChange={(event) => setField('name', event.target.value)}
                          error={errors.name}
                          placeholder="e.g. Priya Sharma"
                        />
                        <Input
                          label="Company name"
                          name="company"
                          autoComplete="organization"
                          required
                          value={form.companyName}
                          onChange={(event) => setField('companyName', event.target.value)}
                          error={errors.companyName}
                          placeholder="e.g. Aarav Textiles Pvt Ltd"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Mobile number"
                          name="tel"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          required
                          value={form.mobile}
                          onChange={(event) => setField('mobile', event.target.value)}
                          error={errors.mobile}
                          placeholder="10-digit Indian mobile"
                          hint="We will confirm the slot on this number via WhatsApp."
                        />
                        <Select
                          label="Role / company type"
                          name="companyType"
                          required
                          value={form.companyType}
                          onChange={(event) => setField('companyType', event.target.value)}
                          error={errors.companyType}
                        >
                          <option value="">Select one</option>
                          {COMPANY_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                          label="Fleet size"
                          name="fleetSize"
                          value={form.fleetSize}
                          onChange={(event) => setField('fleetSize', event.target.value)}
                          error={errors.fleetSize}
                          hint="Optional"
                        >
                          <option value="">Prefer not to say</option>
                          {FLEET_SIZES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                        <Select
                          label="Monthly loads"
                          name="monthlyLoads"
                          value={form.monthlyLoads}
                          onChange={(event) => setField('monthlyLoads', event.target.value)}
                          error={errors.monthlyLoads}
                          hint="Optional"
                        >
                          <option value="">Prefer not to say</option>
                          {MONTHLY_LOADS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <Input
                        label="City / state"
                        name="city"
                        autoComplete="address-level2"
                        required
                        value={form.cityState}
                        onChange={(event) => setField('cityState', event.target.value)}
                        error={errors.cityState}
                        placeholder="e.g. Pune, Maharashtra"
                        leftElement={<MapPin className="w-4 h-4" />}
                      />

                      <Textarea
                        label="Message"
                        name="message"
                        value={form.message}
                        onChange={(event) => setField('message', event.target.value)}
                        error={errors.message}
                        hint="Optional — lanes, vehicle types or what you want to see."
                        placeholder="Anything we should prepare for the walkthrough."
                        rows={4}
                      />

                      <p className="text-xs text-subtle leading-relaxed">
                        Submitting prepares a WhatsApp message to the LorryCarry desk. We do not save this
                        form in the marketplace database.{' '}
                        <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                          Privacy &amp; data security
                        </Link>
                        .
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          loading={submitting}
                          loadingText="Preparing your request"
                          fullWidth
                          rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                          Request a walkthrough
                        </Button>
                        <Button
                          as="a"
                          href={whatsappLink(DEMO_SUPPORT_PHONE, 'Hi LorryCarry, I would like to schedule a product demo.')}
                          variant="secondary"
                          size="lg"
                          className="sm:w-auto"
                          leftIcon={<MessageCircle className="w-4 h-4" />}
                          {...{ target: '_blank', rel: 'noopener noreferrer' }}
                        >
                          Chat on WhatsApp
                        </Button>
                      </div>
                    </form>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function SuccessState({
  whatsappUrl,
  mailtoUrl,
}: {
  whatsappUrl: string
  mailtoUrl: string | null
}) {
  return (
    <div className="space-y-5 py-2" role="status">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-ink">Your request is ready to send</h3>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Tap WhatsApp to share it with the LorryCarry desk on the published helpline. We reply on
            that thread to confirm a 20–30 minute slot.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          as="a"
          href={whatsappUrl}
          variant="primary"
          size="lg"
          leftIcon={<MessageCircle className="w-4 h-4" />}
          {...{ target: '_blank', rel: 'noopener noreferrer' }}
        >
          Send on WhatsApp
        </Button>
        {mailtoUrl && (
          <Button as="a" href={mailtoUrl} variant="secondary" size="lg">
            Send by email
          </Button>
        )}
        <Button as={Link} href="/subscribe" variant="ghost" size="lg">
          See pricing
        </Button>
      </div>

      <ul className="text-xs text-subtle space-y-1.5 pt-2 border-t border-hairline">
        <li className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
          Helpline {DEMO_SUPPORT_PHONE}
        </li>
        <li className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          No account is required for the walkthrough
        </li>
      </ul>
    </div>
  )
}
