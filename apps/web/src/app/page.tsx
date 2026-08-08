import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-background-dark py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Find Trucks. Find Loads.
            <span className="block text-primary-500">Book in Minutes.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10">
            India's truck-load matching marketplace. Connect directly with verified truck owners 
            and load owners. No broker, no hassle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/search?type=truck" className="btn-primary text-lg">
              🔍 Find a Truck
            </Link>
            <Link href="/search?type=load" className="btn-secondary text-lg">
              📦 Find a Load
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-sm text-gray-500 dark:text-gray-400">
            <div>✓ Verified Trucks</div>
            <div>✓ 50km Radius Search</div>
            <div>✓ WhatsApp Alerts</div>
            <div>✓ No Broker Fees</div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold text-lg mb-2">Post or Search</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Post your load or truck, or search within 50km radius
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold text-lg mb-2">Subscribe & Connect</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Unlock contact details with subscription, connect via WhatsApp
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold text-lg mb-2">Track & Complete</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track via checkpoints, get alerts, complete delivery
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-500 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="mb-8 text-primary-100 max-w-xl mx-auto">
          Join thousands of manufacturers, traders, and truck owners already using LorryCarry
        </p>
        <Link href="/login" className="bg-white text-primary-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-button inline-block transition-colors">
          Get Started Free →
        </Link>
      </section>
    </main>
  )
}
