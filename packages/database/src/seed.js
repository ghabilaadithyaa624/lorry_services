import { prisma, UserRole, TruckType, LoadStatus, VerificationStatus } from './client';
async function main() {
    console.log('🌱 Seeding database...');
    // Clean existing data
    await prisma.checkpoint.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.document.deleteMany();
    await prisma.truck.deleteMany();
    await prisma.load.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    // Create users
    const loadOwner1 = await prisma.user.create({
        data: {
            phone: '+919876543210',
            name: 'Rajesh Sharma',
            role: UserRole.load_owner,
        }
    });
    const loadOwner2 = await prisma.user.create({
        data: {
            phone: '+919876543211',
            name: 'Priya Manufacturing',
            role: UserRole.load_owner,
        }
    });
    const truckOwner1 = await prisma.user.create({
        data: {
            phone: '+919876543220',
            name: 'Kumar Transports',
            role: UserRole.truck_owner,
        }
    });
    const truckOwner2 = await prisma.user.create({
        data: {
            phone: '+919876543221',
            name: 'Singh Logistics',
            role: UserRole.truck_owner,
        }
    });
    const admin = await prisma.user.create({
        data: {
            phone: '+919876543200',
            name: 'Admin User',
            role: UserRole.admin,
        }
    });
    // Create trucks with Pune location (18.5204, 73.8567)
    const truck1 = await prisma.truck.create({
        data: {
            userId: truckOwner1.id,
            registrationNumber: 'MH12AB1234',
            bodyType: TruckType.Open,
            lengthFt: 20,
            heightFt: 8,
            tonnageCapacity: 16.0,
            currentLat: 18.5204,
            currentLng: 73.8567,
            serviceableRadiusKm: 50,
            preferredDestinations: ['Bangalore', 'Mumbai', 'Hyderabad'],
            verificationStatus: VerificationStatus.Verified,
            verifiedAt: new Date(),
        }
    });
    const truck2 = await prisma.truck.create({
        data: {
            userId: truckOwner2.id,
            registrationNumber: 'KA01CD5678',
            bodyType: TruckType.Container,
            lengthFt: 32,
            heightFt: 10,
            tonnageCapacity: 25.0,
            currentLat: 12.9716, // Bangalore
            currentLng: 77.5946,
            serviceableRadiusKm: 75,
            preferredDestinations: ['Pune', 'Chennai', 'Hyderabad'],
            verificationStatus: VerificationStatus.Verified,
            verifiedAt: new Date(),
        }
    });
    // Create loads
    const load1 = await prisma.load.create({
        data: {
            userId: loadOwner1.id,
            tonnageRequired: 15.0,
            loadingAddress: 'MIDC Industrial Area, Pune',
            loadingPin: '411018',
            loadingLat: 18.5204,
            loadingLng: 73.8567,
            unloadingAddress: 'Electronic City, Bangalore',
            unloadingPin: '560100',
            unloadingLat: 12.8399,
            unloadingLng: 77.6770,
            truckType: TruckType.Open,
            minLengthFt: 18,
            minHeightFt: 7,
            urgent: true,
            maxPrice: 45000.00,
            expectedDeliveryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
            advancePayable: 22500.00,
            status: LoadStatus.Open,
        }
    });
    const load2 = await prisma.load.create({
        data: {
            userId: loadOwner2.id,
            tonnageRequired: 22.0,
            loadingAddress: 'Warehouse District, Bangalore',
            loadingPin: '560066',
            loadingLat: 12.9716,
            loadingLng: 77.5946,
            unloadingAddress: 'Navi Mumbai Industrial Area',
            unloadingPin: '400701',
            unloadingLat: 19.0330,
            unloadingLng: 73.0297,
            truckType: TruckType.Container,
            minLengthFt: 28,
            minHeightFt: 9,
            urgent: false,
            maxPrice: 52000.00,
            expectedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            advancePayable: 26000.00,
            status: LoadStatus.Open,
        }
    });
    // Create documents
    await prisma.document.create({
        data: {
            truckId: truck1.id,
            type: 'RC',
            docNumber: 'MH12AB1234RC',
            s3Url: 'https://placeholder.com/rc1.pdf',
            s3Key: 'kyc/user1/rc1.pdf',
            verificationStatus: VerificationStatus.Verified,
            verifiedBy: admin.id,
            verifiedAt: new Date(),
        }
    });
    await prisma.document.create({
        data: {
            truckId: truck1.id,
            type: 'Insurance',
            docNumber: 'INS123456',
            s3Url: 'https://placeholder.com/ins1.pdf',
            s3Key: 'kyc/user1/ins1.pdf',
            verificationStatus: VerificationStatus.Verified,
            verifiedBy: admin.id,
            verifiedAt: new Date(),
        }
    });
    console.log('✅ Seeded:');
    console.log(`  - ${await prisma.user.count()} users (1 admin, 2 load owners, 2 truck owners)`);
    console.log(`  - ${await prisma.truck.count()} verified trucks`);
    console.log(`  - ${await prisma.load.count()} open loads`);
    console.log(`  - ${await prisma.document.count()} verified documents`);
    console.log('');
    console.log('📍 Test data locations:');
    console.log('  - Truck 1: Pune (18.52, 73.86) - MH12AB1234, 16-ton Open');
    console.log('  - Truck 2: Bangalore (12.97, 77.59) - KA01CD5678, 25-ton Container');
    console.log('  - Load 1: Pune → Bangalore, 15-ton, urgent');
    console.log('  - Load 2: Bangalore → Mumbai, 22-ton');
    console.log('');
    console.log('🔐 Login with any of these phone numbers:');
    console.log('  Load Owners: +919876543210, +919876543211');
    console.log('  Truck Owners: +919876543220, +919876543221');
    console.log('  Admin: +919876543200');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map