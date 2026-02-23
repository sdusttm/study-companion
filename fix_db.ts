import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.book.update({
    where: { id: 'cmlxa2vf30000xm5db5xorpt8' },
    data: { lastPage: 205 }
  });
  console.log('Fixed:', result.lastPage);
}

main().catch(console.error).finally(() => prisma.$disconnect());
