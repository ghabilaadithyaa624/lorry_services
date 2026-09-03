import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/layout'

export const metadata: Metadata = {
  title: 'Privacy & Data Security | LorryCarry',
  description: 'How LorryCarry collects, uses and protects data across its freight marketplace.',
}

const sections = [
  {
    title: '1. Data We Collect',
    body: 'We collect account details (name, phone, role), vehicle and verification records (RC, insurance, Vahan status), load and booking records, and usage signals needed to operate the direct freight marketplace. Language, theme and notification preferences are also stored.',
  },
  {
    title: '2. How We Use Data',
    body: 'Data is used to verify transporters, match loads and trucks, surface contact options under an active subscription, deliver notifications, and keep the platform safe. We do not sell personal data to third parties.',
  },
  {
    title: '3. Contact Detail Protection',
    body: 'Drivers, transporters and shippers exchange contact details directly after the contact pass is active. Contact details remain sealed in search results until an authorised subscription unlock, and access is auditable.',
  },
  {
    title: '4. Sharing & Processors',
    body: 'We share data with government verification services (e.g. Vahan/RC lookup), toll checkpoint providers, and infrastructure processors (hosting, logs, payments) strictly to deliver the service. These processors are bound by confidentiality obligations.',
  },
  {
    title: '5. Retention & Your Rights',
    body: 'Data is retained only for as long as needed for the account and legal obligations. You can request access, correction, or deletion of personal data through the account profile and support channels.',
  },
  {
    title: '6. Security',
    body: 'We use encryption in transit, scoped access controls, and audited secrets management. No platform feature should ever ask you to share your password through chat or phone.',
  },
  {
    title: '7. Contact',
    body: 'Privacy and data security questions can be directed to the LorryCarry support and WhatsApp helpline listed in the footer.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="space-y-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 font-mono uppercase text-[10px] font-bold">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">Privacy & Data Security</h1>
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
          <Link href="/terms" className="inline-flex items-center px-4 py-2 rounded-xl bg-surface-900 border border-hairline text-sm font-semibold text-ink hover:bg-wash transition-colors">
            Read Terms of Service
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
