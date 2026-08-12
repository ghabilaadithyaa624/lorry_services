'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const shouldReduceMotion = useReducedMotion()
  
  // Skip transition for admin pages if they have their own or need instant loading
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.25,
        ease: 'easeOut',
      }}
      className="flex flex-col min-h-screen motion-reduce:transition-none motion-reduce:transform-none"
    >
      {children}
    </motion.div>
  )
}
