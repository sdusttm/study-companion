import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration of Notes to Highlights...');

    const notes = await prisma.note.findMany();
    console.log(`Found ${notes.length} legacy notes to migrate.`);

    for (const note of notes) {
        try {
            await prisma.highlight.create({
                data: {
                    bookId: note.bookId,
                    userId: note.userId,
                    content: 'Migrated Note',
                    color: 'gray',
                    position: [], // Empty array for synthetic highlight
                    comment: note.content,
                    pageNumber: note.pageNumber,
                    createdAt: note.createdAt,
                },
            });
            console.log(`Successfully migrated note ${note.id} on page ${note.pageNumber}`);
        } catch (e) {
            console.error(`Error migrating note ${note.id}:`, e);
        }
    }

    console.log('Migration complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
