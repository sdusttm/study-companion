import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const books = await prisma.book.findMany({
        take: 5,
        select: {
            id: true,
            title: true,
            lastPage: true,
        },
    });
    console.log("Books:", JSON.stringify(books, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
