import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { KycQueue } from './pages/KycQueue'
import { Listings } from './pages/Listings'
import { Subscriptions } from './pages/Subscriptions'
import { Users } from './pages/Users'
import { Bookings } from './pages/Bookings'
import { Disputes } from './pages/Disputes'
import { Analytics } from './pages/Analytics'
import { Login } from './pages/Login'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

function ProtectedLayout() {
  const token = localStorage.getItem('accessToken')
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/kyc" element={<PageTransition><KycQueue /></PageTransition>} />
          <Route path="/listings" element={<PageTransition><Listings /></PageTransition>} />
          <Route path="/subscriptions" element={<PageTransition><Subscriptions /></PageTransition>} />
          <Route path="/users" element={<PageTransition><Users /></PageTransition>} />
          <Route path="/bookings" element={<PageTransition><Bookings /></PageTransition>} />
          <Route path="/disputes" element={<PageTransition><Disputes /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}



function PageTransition({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: 'easeOut' }}
      className="h-full w-full motion-reduce:transition-none motion-reduce:transform-none"
    >
      {children}
    </motion.div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  )
}

export default App
