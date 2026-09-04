const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function main() {
  const phone = '+918072025106'
  console.log(`Checking user with phone: ${phone}...`)

  const now = new Date()
  const trialEnds = new Date(now)
  trialEnds.setDate(trialEnds.getDate() + 90)

  // Upsert user
  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      name: 'Ghabilaadithyaa P',
      role: 'factory_owner',
      trialStartedAt: now,
      trialEndsAt: trialEnds,
    },
    create: {
      phone,
      name: 'Ghabilaadithyaa P',
      role: 'factory_owner',
      trialStartedAt: now,
      trialEndsAt: trialEnds,
      preference: {
        create: {
          theme: 'dark',
          language: 'en',
          currency: 'INR',
          notifyWhatsapp: true,
          notifySms: true,
        },
      },
    },
    include: {
      preference: true,
      subscriptions: true,
    },
  })

  console.log('✅ User successfully seeded in Supabase PostgreSQL!')
  console.log(JSON.stringify(user, null, 2))
}

main()
  .catch((e) => {
    console.error('Error seeding user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
