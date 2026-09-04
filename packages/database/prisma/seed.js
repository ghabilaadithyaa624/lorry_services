import { PrismaClient, UserRole, SubscriptionStatus, TruckType, VerificationStatus, DocumentType, LoadStatus, BookingStatus, PaymentPurpose, PaymentStatus, NotificationChannel } from '@prisma/client';
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
    const loadOwner1 = await prisma.user.create({
        data: {
            phone: '+919876543210',
            name: 'Pune Auto Components Ltd (Ramesh Patil)',
            role: UserRole.factory_owner,
        },
    });
    const loadOwner2 = await prisma.user.create({
        data: {
            phone: '+919876543211',
            name: 'Sahyadri Agri Products (Sanjay Deshmukh)',
            role: UserRole.factory_owner,
        },
    });
    const truckOwner1 = await prisma.user.create({
        data: {
            phone: '+919876543220',
            name: 'Deccan Express Logistics (Vijay Pawar)',
            role: UserRole.truck_driver,
        },
    });
    const truckOwner2 = await prisma.user.create({
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
            userId: truckOwner1.id,
            plan: 'Fleet Pro Unlimited',
            status: SubscriptionStatus.active,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
    });
    await prisma.subscription.create({
        data: {
            userId: truckOwner2.id,
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
            userId: loadOwner1.id,
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
            userId: loadOwner2.id,
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
        await prisma.$executeRawUnsafe(`UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography WHERE id = '${load1.id}'`);
        await prisma.$executeRawUnsafe(`UPDATE loads SET loading_point = ST_SetSRID(ST_MakePoint(73.9260, 18.5089), 4326)::geography, unloading_point = ST_SetSRID(ST_MakePoint(77.5450, 13.0280), 4326)::geography WHERE id = '${load2.id}'`);
    }
    catch (err) {
        console.log('⚠️ PostGIS geometry update deferred (ensure PostGIS extension is active on Postgres connection)');
    }
    console.log('✅ Loads seeded');
    // 4. Create Trucks
    const truck1 = await prisma.truck.create({
        data: {
            userId: truckOwner1.id,
            registrationNumber: 'MH 12 QW 8842',
            bodyType: TruckType.Container,
            lengthFt: 32,
            heightFt: 9,
            tonnageCapacity: 20.0,
            serviceableRadiusKm: 100,
            preferredDestinations: ['Bangalore', 'Chennai', 'Hyderabad'],
            verificationStatus: VerificationStatus.Verified,
        },
    });
    const truck2 = await prisma.truck.create({
        data: {
            userId: truckOwner2.id,
            registrationNumber: 'MH 09 DT 5112',
            bodyType: TruckType.Open,
            lengthFt: 28,
            heightFt: 8,
            tonnageCapacity: 25.0,
            serviceableRadiusKm: 60,
            preferredDestinations: ['Bangalore', 'Hubballi', 'Belagavi'],
            verificationStatus: VerificationStatus.Verified,
        },
    });
    try {
        await prisma.$executeRawUnsafe(`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(74.2237, 16.7050), 4326)::geography WHERE id = '${truck1.id}'` // Near Kolhapur
        );
        await prisma.$executeRawUnsafe(`UPDATE trucks SET current_location = ST_SetSRID(ST_MakePoint(73.8567, 18.5204), 4326)::geography WHERE id = '${truck2.id}'` // Pune City
        );
    }
    catch (err) {
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
            verificationStatus: VerificationStatus.Verified,
            verifiedBy: adminUser.id,
        },
    });
    await prisma.document.create({
        data: {
            truckId: truck1.id,
            type: DocumentType.Insurance,
            docNumber: 'INS-ICICI-994821',
            s3Url: 'https://minio.lorrycarry.local/lorrycarry-kyc/ins_mh12qw8842.pdf',
            verificationStatus: VerificationStatus.Verified,
            verifiedBy: adminUser.id,
        },
    });
    console.log('✅ Documents seeded');
    // 6. Bookings & Checkpoints (Pune -> Satara -> Kolhapur -> Belagavi -> Hubballi -> Tumakuru -> Bangalore)
    const booking1 = await prisma.booking.create({
        data: {
            loadId: load1.id,
            truckId: truck1.id,
            agreedPrice: 62000,
            advanceConfirmed: true,
            balanceConfirmed: false,
            ewayBillNumber: 'EWAY-384910293841',
            liabilityAccepted: true,
            liabilityAcceptedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
            status: BookingStatus.InTransit,
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
    for (const cp of checkpointsData) {
        const checkpoint = await prisma.checkpoint.create({
            data: {
                bookingId: booking1.id,
                seq: cp.seq,
                name: cp.name,
                radiusM: 500,
                crossedAt: cp.crossed ? new Date(Date.now() - (7 - cp.seq) * 2 * 60 * 60 * 1000) : null,
                etaMinutes: cp.eta,
            },
        });
        try {
            await prisma.$executeRawUnsafe(`UPDATE checkpoints SET location = ST_SetSRID(ST_MakePoint(${cp.lng}, ${cp.lat}), 4326)::geography WHERE id = '${checkpoint.id}'`);
        }
        catch (e) {
            // Ignored if raw PostGIS unavailable during offline seed preview
        }
    }
    console.log('✅ Booking & NH48 Checkpoints seeded');
    // 7. Payments & Notifications
    await prisma.payment.create({
        data: {
            userId: loadOwner1.id,
            amount: 20000,
            purpose: PaymentPurpose.booking_advance,
            provider: 'cashfree',
            providerTxnId: 'CF_TXN_884920194',
            status: PaymentStatus.Success,
        },
    });
    await prisma.notification.create({
        data: {
            userId: truckOwner1.id,
            channel: NotificationChannel.whatsapp,
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
//# sourceMappingURL=seed.js.map