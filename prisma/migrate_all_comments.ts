import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrate() {
    console.log("Starting final data integrity migration...");

    const highlights = await prisma.highlight.findMany({
        where: {
            NOT: { comment: null }
        },
        include: {
            notes: true
        }
    });

    console.log(`Found ${highlights.length} highlights with comments.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const highlight of highlights) {
        if (highlight.comment && highlight.notes.length === 0) {
            await prisma.note.create({
                data: {
                    content: highlight.comment,
                    highlightId: highlight.id,
                    createdAt: highlight.createdAt, // Preserve original timestamp
                    updatedAt: highlight.updatedAt
                }
            });
            migratedCount++;
        } else {
            skippedCount++;
        }
    }

    console.log(`Migration complete: ${migratedCount} notes created, ${skippedCount} notes already existed.`);
}

migrate()
    .catch((e) => {
        console.error("Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
