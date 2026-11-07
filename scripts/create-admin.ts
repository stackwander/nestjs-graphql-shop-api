import '../src/common/environment';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12-128 characters).');
  }
  const prisma = new PrismaClient();
  try {
    // Create only: never silently promote an existing customer account.
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role: 'ADMIN',
      },
    });
    console.log('Administrator account created.');
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    'Administrator creation failed; check inputs, email uniqueness, and database connectivity.',
  );
  process.exitCode = 1;
});
