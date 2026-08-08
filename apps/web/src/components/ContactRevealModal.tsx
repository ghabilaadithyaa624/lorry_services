'use client'

interface ContactRevealModalProps {
  onClose: () => void
  onSubscribe: () => void
}

export function ContactRevealModal({ onClose, onSubscribe }: ContactRevealModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-card p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 text-primary-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🔒
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Unlock Contact Details</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Subscribe to view phone numbers and connect directly with truck/load owners via WhatsApp.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-card text-left mb-6 text-sm space-y-2">
            <div className="font-semibold mb-1">Subscription includes:</div>
            <div className="flex items-center text-green-600 dark:text-green-400">
              ✓ Unlimited contact reveals
            </div>
            <div className="flex items-center text-green-600 dark:text-green-400">
              ✓ Direct WhatsApp integration
            </div>
            <div className="flex items-center text-green-600 dark:text-green-400">
              ✓ Verified truck owner details
            </div>
            <div className="flex items-center text-green-600 dark:text-green-400">
              ✓ Priority customer support
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={onSubscribe} className="btn-primary w-full text-base py-3">
              Subscribe Now
            </button>
            <button onClick={onClose} className="btn-secondary w-full text-base py-2.5">
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
