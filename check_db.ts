import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Looking up user sdusttm@gmail.com...");
    const user = await prisma.user.findUnique({
        where: { email: 'sdusttm@gmail.com' },
        include: { books: true }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log(`User: ${user.name} (${user.email}), Role: ${user.role}`);
    console.log(`Has ${user.books.length} books.`);

    user.books.forEach(b => {
        console.log(`- Book ID: ${b.id}`);
        console.log(`  Title: ${b.title}`);
        console.log(`  FileName: ${b.fileName}`);
        console.log(`  FilePath: ${b.filePath}`);
        console.log(`  LastPage: ${b.lastPage}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
