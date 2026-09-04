import { randomUUID } from 'crypto';
import { PrismaClient, UserRole, SubscriptionStatus, TruckType, VerificationStatus, DocumentType, LoadStatus, BookingStatus, PaymentPurpose, PaymentStatus, NotificationChannel, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LorryCarry seed process (Pune ➔ Bangalore Corridor)...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.document.deleteMany();
  await prisma.truck.deleteMany();
  await prisma.load.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const factoryOwner1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      name: 'Pune Auto Components Ltd (Ramesh Patil)',
      role: UserRole.factory_owner,
    },
  });

  const factoryOwner2 = await prisma.user.create({
    data: {
      phone: '+919876543211',
      name: 'Sahyadri Agri Products (Sanjay Deshmukh)',
      role: UserRole.factory_owner,
    },
  });

  const truckDriver1 = await prisma.user.create({
    data: {
      phone: '+919876543220',
      name: 'Deccan Express Logistics (Vijay Pawar)',
      role: UserRole.truck_driver,
    },
  });

  const truckDriver2 = await prisma.user.create({
    data: {
      phone: '+919876543221',
      name: 'Mahalaxmi Transport (Prakash Shinde)',
      role: UserRole.truck_driver,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      phone: '+919999999999',
      name: 'LorryCarry Admin',
      role: UserRole.admin,
    },
  });

  console.log('✅ Users seeded');

  // 2. Subscriptions
  await prisma.subscription.create({
    data: {
      userId: factoryOwner1.id,
      plan: 'Monthly Unlimited',
      status: SubscriptionStatus.active,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      autoRenew: true,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: truckDriver1.id,
      plan: 'Fleet Pro Unlimited',
      status: SubscriptionStatus.active,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await prisma.subscription.create({
    data: {
      userId: truckDriver2.id,
      plan: 'Single Truck Saver',
      status: SubscriptionStatus.active,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Subscriptions seeded');

  // 3. Create Loads (Pune -> Bangalore)
  // Coordinates: Pune (18.5204° N, 73.8567° E), Bangalore (12.9716° N, 77.5946° E)
  const load1 = await prisma.load.create({
    data: {
      userId: factoryOwner1.id,
      tonnageRequired: 18.5,
      loadingAddress: 'Plot B-12, MIDC Chakan Phase 2, Pune, Maharashtra',
      loadingPin: '410501',
      unloadingAddress: 'Plot 45, Peenya Industrial Area Phase 3, Bangalore, Karnataka',
      unloadingPin: '560058',
      truckType: TruckType.Container,
      minLengthFt: 32,
      minHeightFt: 8,
      urgent: true,
      maxPrice: 65000,
      expectedDeliveryAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
      advancePayable: 20000,
      status: LoadStatus.InTransit,
    },
  });

  const load2 = await prisma.load.create({
    data: {
      userId: factoryOwner2.id,
      tonnageRequired: 24.0,
      loadingAddress: 'Sugar Factory Yard, Hadapsar, Pune, Maharashtra',
      loadingPin: '411028',
      unloadingAddress: 'APMC Market Yard, Yeshwanthpur, Bangalore, Karnataka',
      unloadingPin: '560022',
      truckType: TruckType.Open,
      minLengthFt: 28,
      minHeightFt: 7,
      urgent: false,
      maxPrice: 58000,
      expectedDeliveryAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      advancePayable: 15000,
      status: LoadStatus.Open,
    },
  });

  // Update geospatial points via PostGIS raw queries if database PostGIS is available
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography WHERE id = '${load1.id}'`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint(73.9260, 18.5089), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint(77.5450, 13.0280), 4326)::geography WHERE id = '${load2.id}'`
    );
  } catch (err) {
    console.log('⚠️ PostGIS geometry update deferred (ensure PostGIS extension is active on Postgres connection)');
  }

  console.log('✅ Loads seeded');

  // 4. Create Trucks (with Vahan RC verification + FASTag compliance data)
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const isoDate = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString().slice(0, 10);

  const truck1 = await prisma.truck.create({
    data: {
      userId: truckDriver1.id,
      registrationNumber: 'MH 12 QW 8842',
      bodyType: TruckType.Container,
      lengthFt: 32,
      heightFt: 9,
      tonnageCapacity: 20.0,
      serviceableRadiusKm: 100,
      preferredDestinations: ['Bangalore', 'Chennai', 'Hyderabad'],
      verificationStatus: VerificationStatus.Verified,
      verifiedAt: new Date(now - 9 * DAY),
      vahanValidatedAt: new Date(now - 2 * DAY),
      vahanDetails: {
        registrationNumber: 'MH12QW8842',
        registrationStatus: 'ACTIVE',
        ownerNameMasked: 'Transporter K.',
        makerModel: 'Tata LPT 3118',
        vehicleClass: 'Heavy Goods Vehicle (HGV)',
        fuelType: 'DIESEL',
        registrationDate: isoDate(-2100),
        fitnessValidUpto: isoDate(320),
        insuranceValidUpto: isoDate(200),
        pucValidUpto: isoDate(120),
        permitType: 'National Permit',
        permitValidUpto: isoDate(280),
        rto: 'RTO-MH12',
        state: 'MH',
        chassisNumberMasked: 'ME****421',
        engineNumberMasked: 'EN****883',
        source: 'vahan_api',
        checkedAt: new Date(now - 2 * DAY).toISOString(),
      },
      fastagStatus: 'Active',
      fastagUpdatedAt: new Date(now - 1 * DAY),
    },
  });

  const truck2 = await prisma.truck.create({
    data: {
      userId: truckDriver2.id,
      registrationNumber: 'MH 09 DT 5112',
      bodyType: TruckType.Open,
      lengthFt: 28,
      heightFt: 8,
      tonnageCapacity: 25.0,
      serviceableRadiusKm: 60,
      preferredDestinations: ['Bangalore', 'Hubballi', 'Belagavi'],
      verificationStatus: VerificationStatus.Verified,
      verifiedAt: new Date(now - 5 * DAY),
      vahanValidatedAt: new Date(now - 5 * DAY),
      vahanDetails: {
        registrationNumber: 'MH09DT5112',
        registrationStatus: 'ACTIVE',
        ownerNameMasked: 'Transporter S.',
        makerModel: 'Ashok Leyland 2820',
        vehicleClass: 'Heavy Goods Vehicle (HGV)',
        fuelType: 'DIESEL',
        registrationDate: isoDate(-1500),
        fitnessValidUpto: isoDate(95),
        insuranceValidUpto: isoDate(30),
        pucValidUpto: isoDate(-10), // expired — demonstrates the action-required path
        permitType: 'National Permit',
        permitValidUpto: isoDate(150),
        rto: 'RTO-MH09',
        state: 'MH',
        chassisNumberMasked: 'MB****107',
        engineNumberMasked: 'EE****542',
        source: 'sandbox',
        checkedAt: new Date(now - 5 * DAY).toISOString(),
      },
      fastagStatus: 'LowBalance',
      fastagUpdatedAt: new Date(now - 3 * 60 * 60 * 1000),
    },
  });

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(74.2237, 16.7050), 4326)::geography WHERE id = '${truck1.id}'` // Near Kolhapur
    );
    await prisma.$executeRawUnsafe(
      `UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography WHERE id = '${truck2.id}'` // Pune City
    );
  } catch (err) {
    console.log('⚠️ PostGIS truck location update deferred');
  }

  console.log('✅ Trucks seeded');

  // 5. KYC Documents
  await prisma.document.create({
    data: {
      truckId: truck1.id,
      type: DocumentType.RC,
      docNumber: 'RC-MH12QW8842-2023',
      s3Url: 'https://minio.lorrycarry.local/lorrycarry-kyc/rc_mh12qw8842.pdf',
      s3Key: 'kyc/rc_mh12qw8842.pdf',
      verificationStatus: VerificationStatus.Verified,
      isVerified: true,
      verifiedBy: adminUser.id,
      verifiedAt: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // RC fitness valid 1 year out
    },
  });

  await prisma.document.create({
    data: {
      truckId: truck1.id,
      type: DocumentType.Insurance,
      docNumber: 'INS-ICICI-994821',
      s3Url: 'https://minio.lorrycarry.local/lorrycarry-kyc/ins_mh12qw8842.pdf',
      s3Key: 'kyc/ins_mh12qw8842.pdf',
      verificationStatus: VerificationStatus.Verified,
      isVerified: true,
      verifiedBy: adminUser.id,
      verifiedAt: new Date(),
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Documents seeded');

  // 6. Bookings & Checkpoints (Pune -> Satara -> Kolhapur -> Belagavi -> Hubballi -> Tumakuru -> Bangalore)
  const booking1 = await prisma.booking.create({
    data: {
      loadId: load1.id,
      truckId: truck1.id,
      factoryOwnerId: factoryOwner1.id,
      truckDriverId: truckDriver1.id,
      agreedPrice: 62000,
      advanceConfirmed: true,
      balanceConfirmed: false,
      ewayBillNumber: '381234567890',
      ewayBillStatus: 'Active',
      ewayBillValidUpto: new Date(now + 2 * DAY),
      ewayBillUpdatedAt: new Date(now - 12 * 60 * 60 * 1000),
      liabilityAccepted: true,
      liabilityAcceptedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      status: BookingStatus.InTransit,
      whatsappTriggerStatus: 'Delivered',
      whatsappTriggeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  });

  // Highway Checkpoints along NH48
  const checkpointsData = [
    { seq: 1, name: 'Origin - Pune MIDC Chakan', lat: 18.5204, lng: 73.8567, eta: 0, crossed: true },
    { seq: 2, name: 'Satara Toll Plaza (NH48)', lat: 17.6805, lng: 74.0183, eta: 120, crossed: true },
    { seq: 3, name: 'Kolhapur Bypass Toll', lat: 16.7050, lng: 74.2237, eta: 240, crossed: true },
    { seq: 4, name: 'Belagavi Industrial Border', lat: 15.8497, lng: 74.4977, eta: 360, crossed: false },
    { seq: 5, name: 'Hubballi Bypass Plaza', lat: 15.3647, lng: 75.1240, eta: 480, crossed: false },
    { seq: 6, name: 'Tumakuru Toll Plaza', lat: 13.3409, lng: 77.1006, eta: 720, crossed: false },
    { seq: 7, name: 'Destination - Peenya Bangalore', lat: 12.9716, lng: 77.5946, eta: 840, crossed: false },
  ];

  const checkpoints = await prisma.checkpoint.createManyAndReturn({
    data: checkpointsData.map((cp) => ({
      id: randomUUID(),
      bookingId: booking1.id,
      seq: cp.seq,
      name: cp.name,
      lat: cp.lat,
      lng: cp.lng,
      radiusM: 500,
      crossedAt: cp.crossed ? new Date(Date.now() - (7 - cp.seq) * 2 * 60 * 60 * 1000) : null,
      etaMinutes: cp.eta,
    })),
  });

  try {
    if (checkpoints.length > 0) {
      const valuesClause = checkpoints
        .map((cp) => `('${cp.id}'::uuid, ${cp.lng}::numeric, ${cp.lat}::numeric)`)
        .join(', ');
      const bulkUpdateQuery = `
        UPDATE checkpoints AS c
        SET location = ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
        FROM (VALUES ${valuesClause}) AS v(id, lng, lat)
        WHERE c.id = v.id
      `;
      await prisma.$executeRawUnsafe(bulkUpdateQuery);
    }
  } catch (e) {
    // Ignored if raw PostGIS unavailable during offline seed preview
  }

  console.log('✅ Booking & NH48 Checkpoints seeded');

  // 7. Payments & Notifications
  await prisma.payment.create({
    data: {
      userId: factoryOwner1.id,
      amount: 20000,
      purpose: PaymentPurpose.booking_advance,
      provider: 'cashfree',
      providerTxnId: 'CF_TXN_884920194',
      status: PaymentStatus.Success,
    },
  });

  await prisma.notification.create({
    data: {
      userId: truckDriver1.id,
      channel: NotificationChannel.whatsapp,
      recipient: '+919876543220',
      template: 'ADVANCE_PAYMENT_CONFIRMED',
      status: NotificationStatus.Delivered,
    },
  });

  console.log('🏁 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
