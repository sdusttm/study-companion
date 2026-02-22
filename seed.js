const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'sdusttm@gmail.com' } })
    if (!user) {
        console.log("Admin user not found, create one first or register in browser.")
        return;
    }

    // Create a dummy book
    const book = await prisma.book.create({
        data: {
            userId: user.id,
            title: 'Global Search Test Document',
            fileName: 'test.pdf',
            filePath: '/dummy/path',
            uploadedAt: new Date()
        }
    })

    // Create a dummy note
    await prisma.note.create({
        data: {
            userId: user.id,
            bookId: book.id,
            pageNumber: 1,
            content: 'This is a test note to verify the Admin Global Search functionality.',
        }
    })

    console.log('Seed successful')
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect())
