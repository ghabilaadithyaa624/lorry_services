import Link from 'next/link'
import {
  ArrowRightIcon,
  BellAlertIcon,
  CheckBadgeIcon,
  CheckIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const benefits = [
  { icon: CheckBadgeIcon, title: 'Verified trucks', text: 'Connect with truck owners screened for reliable service.' },
  { icon: MapPinIcon, title: 'Search by radius', text: 'Find the right vehicle close to your pickup location.' },
  { icon: BellAlertIcon, title: 'WhatsApp alerts', text: 'Stay updated on new matches and delivery progress.' },
  { icon: UserGroupIcon, title: 'No broker fees', text: 'Deal directly and keep more of every transport booking.' },
]

const steps = [
  { number: '01', title: 'Post or search', text: 'Tell us what you need moved, or find an available truck near you.' },
  { number: '02', title: 'Connect directly', text: 'Review the details, unlock contact, and chat with the right match.' },
  { number: '03', title: 'Move with confidence', text: 'Track checkpoints and keep everyone aligned until delivery.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="LorryCarry home">
            <span className="flex w-10 h-10 items-center justify-center rounded-button bg-primary-500 text-white shadow-sm">
              <TruckIcon className="w-6 h-6" aria-hidden="true" />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">Lorry<span className="text-primary-500">Carry</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-gray-300" aria-label="Main navigation">
            <a href="#how-it-works" className="transition-colors hover:text-primary-600">How it works</a>
            <a href="#benefits" className="transition-colors hover:text-primary-600">Why LorryCarry</a>
            <Link href="/login" className="rounded-button px-4 py-2 transition-colors hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-gray-900">Sign in</Link>
          </nav>
          <Link href="/role-select" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm sm:px-5">
            Get started <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative border-b border-slate-200/80 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3.5 py-2 text-sm font-semibold text-primary-700 dark:border-primary-700/30 dark:bg-primary-500/10 dark:text-primary-300">
              <span className="w-2 h-2 rounded-full bg-verified" aria-hidden="true" /> India&apos;s direct truck-load marketplace
            </div>
            <h1 className="max-w-2xl text-balance text-5xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
              Move more.<br /><span className="text-primary-500">Wait less.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 dark:text-gray-300">
              Find trusted trucks, discover nearby loads, and book in minutes. LorryCarry helps load owners and truck owners connect directly, without the broker markup.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/search?type=truck" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5">
                <MagnifyingGlassIcon className="w-5 h-5" aria-hidden="true" /> Find a truck
              </Link>
              <Link href="/search?type=load" className="btn-secondary inline-flex items-center justify-center gap-2 border border-slate-200 px-6 py-3.5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
                <TruckIcon className="w-5 h-5" aria-hidden="true" /> Find a load
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-2"><CheckIcon className="w-4 h-4 text-verified" aria-hidden="true" /> Verified listings</span>
              <span className="inline-flex items-center gap-2"><CheckIcon className="w-4 h-4 text-verified" aria-hidden="true" /> No broker fees</span>
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div className="rounded-card border border-slate-200 bg-slate-50 p-4 shadow-xl shadow-slate-200/60 sm:p-6 dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/20">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-gray-800">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live marketplace</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Nearby matches</p></div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-500/10 dark:text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-verified" /> Live</span>
              </div>
              <div className="mt-5 rounded-button border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-900 dark:text-white">12T Open Truck</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPinIcon className="size-3.5" /> Pune · within 18 km</p></div><CheckBadgeIcon className="w-6 h-6 text-verified" /></div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-gray-800"><span className="text-slate-500">Available today</span><span className="font-semibold text-primary-600">View details →</span></div>
              </div>
              <div className="mt-3 rounded-button border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-slate-900 dark:text-white">Steel coils · Pune → Nashik</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPinIcon className="size-3.5" /> Pickup in 2 days</p></div><span className="rounded-full bg-primary-50 px-2 py-1 text-[11px] font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">New load</span></div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-gray-800"><span className="text-slate-500">8T · 210 km</span><span className="font-semibold text-primary-600">View details →</span></div>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-button bg-primary-500/10 px-4 py-3 text-sm text-primary-800 dark:text-primary-200"><BellAlertIcon className="w-5 h-5 shrink-0" /><span><strong>Get alerts on WhatsApp</strong><br /><span className="text-xs text-primary-700/70 dark:text-primary-300/70">Never miss a nearby opportunity.</span></span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-600">Everything in one place</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white">A simpler way to keep freight moving.</h2></div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-card border border-slate-200 bg-white p-6 transition-transform hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"><div className="flex size-11 items-center justify-center rounded-button bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300"><Icon className="w-6 h-6" aria-hidden="true" /></div><h3 className="mt-5 font-bold text-slate-900 dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">{text}</p></article>)}</div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-900/50"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-600">Three simple steps</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white">From search to booked.</h2></div><div className="mt-12 grid gap-8 md:grid-cols-3">{steps.map((step) => <article key={step.number} className="relative"><span className="font-mono text-4xl font-bold text-primary-200 dark:text-primary-500/30">{step.number}</span><h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{step.title}</h3><p className="mt-2 max-w-sm leading-7 text-slate-600 dark:text-gray-400">{step.text}</p></article>)}</div></div></section>

      <section className="bg-primary-500 px-5 py-16 text-center text-white sm:px-8"><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your next load is closer than you think.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-primary-50">Whether you are moving goods or moving a truck, LorryCarry gets you to the right match faster.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/role-select" className="inline-flex items-center justify-center gap-2 rounded-button bg-white px-6 py-3 font-bold text-primary-700 transition-colors hover:bg-primary-50">Join LorryCarry <ArrowRightIcon className="w-5 h-5" aria-hidden="true" /></Link><Link href="/login" className="inline-flex items-center justify-center rounded-button border border-white/40 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10">I already have an account</Link></div></section>

      <footer className="bg-slate-950 px-5 py-8 text-center text-sm text-slate-400 sm:px-8"><p><span className="font-bold text-white">Lorry<span className="text-primary-500">Carry</span></span> · Direct connections for a moving India.</p></footer>
    </main>
  )
}
