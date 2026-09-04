import { prisma, UserRole } from '../packages/database/src'

async function main() {
  const phone = '+918072025106'
  console.log(`Checking user with phone: ${phone}...`)

  const now = new Date()
  const trialEnds = new Date(now)
  trialEnds.setDate(trialEnds.getDate() + 90)

  const user = await prisma.user.upsert({
    where: { phone },
    update: {
      name: 'Ghabilaadithyaa P',
      role: UserRole.factory_owner,
      trialStartedAt: now,
      trialEndsAt: trialEnds,
    },
    create: {
      phone,
      name: 'Ghabilaadithyaa P',
      role: UserRole.factory_owner,
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

  console.log('✅ User successfully seeded!')
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
