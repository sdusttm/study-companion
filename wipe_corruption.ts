import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const corrupt = await prisma.book.findMany({ where: { lastPage: { gte: 1000 } } });
  console.log("Found very large lastPages:", corrupt.map((b) => ({ id: b.id, lastPage: b.lastPage })));

  if (corrupt.length > 0) {
    const result = await prisma.book.updateMany({ where: { lastPage: { gte: 1000 } }, data: { lastPage: 205 } });
    console.log("Fixed them to 205. Updated count:", result.count);
  } else {
    console.log("No corruptions found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
