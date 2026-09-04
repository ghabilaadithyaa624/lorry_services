import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Terms of Service | LorryCarry',
  description: 'Terms governing the use of the LorryCarry direct freight marketplace.',
}

const sections = [
  {
    title: '1. Platform Overview',
    body: 'LorryCarry is a direct freight marketplace connecting shippers with Vahan-verified lorry owners. It provides matchmaking, verification, booking coordination and checkpoint telemetry support. LorryCarry is not a carrier, broker or freight forwarder.',
  },
  {
    title: '2. Account Responsibilities',
    body: 'You are responsible for the accuracy of the information you provide, for maintaining the confidentiality of your credentials, and for lawful use of the platform. Companies and fleets must ensure that all uploaded vehicle, insurance and owner documents are valid.',
  },
  {
    title: '3. Freight & Payment Terms',
    body: 'Commercial freight terms are agreed directly between shipper and transporter, using the recommended 50% advance at loading and 50% balance on Proof of Delivery policy. Money moves directly between the parties and outside the LorryCarry application.',
  },
  {
    title: '4. Contact Pass & Subscriptions',
    body: 'Direct phone and WhatsApp contact details are unlocked through an active subscription or contact pass. Subscriptions are billed per the published plan and cannot be used to bypass verification or platform safety checks.',
  },
  {
    title: '5. Tracking & Verification Scope',
    body: 'Vahan verification and checkpoint telemetry are best-effort digital verification tools based on government and toll records. They do not constitute a guarantee of cargo safety, transit time or vehicle availability.',
  },
  {
    title: '6. Liability',
    body: 'Shippers and transporters remain liable for the commercial performance of their own freight agreement. LorryCarry provides technology and identity verification but does not accept liability for damage, loss, delay or payment disputes between counterparties.',
  },
  {
    title: '7. Changes & Contact',
    body: 'These terms may be updated from time to time. Continued use after a change constitutes acceptance. Questions about these terms can be raised via the WhatsApp helpline or 24/7 freight support contact in the footer.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 font-mono uppercase text-[10px] font-bold">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">Terms of Service</h1>
          <p className="text-sm text-muted">Last updated: {new Date().getFullYear()}</p>
        </div>

        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-hairline bg-panel p-5 sm:p-6 space-y-2">
              <h2 className="text-base font-bold text-ink">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/privacy" className="inline-flex items-center px-4 py-2 rounded-xl bg-surface-900 border border-hairline text-sm font-semibold text-ink hover:bg-wash transition-colors">
            Read Privacy & Data Security
          </Link>
          <Link href="/" className="inline-flex items-center px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors">
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
