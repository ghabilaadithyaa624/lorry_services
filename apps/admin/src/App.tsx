import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { KycQueue } from './pages/KycQueue'
import { Listings } from './pages/Listings'
import { Subscriptions } from './pages/Subscriptions'
import { Users } from './pages/Users'
import { Bookings } from './pages/Bookings'

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kyc" element={<KycQueue />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/users" element={<Users />} />
        <Route path="/bookings" element={<Bookings />} />
      </Routes>
    </Layout>
  )
}

export default App
