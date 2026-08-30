import { PrismaClient, UserRole } from '@prisma/client';

async function mock() {
  const prisma = new PrismaClient();
  const start = performance.now();
  console.log("Mock benchmark for getActivity");
  const end = performance.now();
  console.log(`Time: ${end - start} ms`);
}

mock();
