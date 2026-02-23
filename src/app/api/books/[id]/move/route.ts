import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const resolvedParams = await params;
        const bookId = resolvedParams.id;

        const body = await request.json();
        const { folderId } = body;

        // Verify book belongs to user
        const book = await prisma.book.findFirst({
            where: { id: bookId, userId }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        // Verify folder belongs to user if folderId is provided
        if (folderId) {
            const folder = await prisma.folder.findFirst({
                where: { id: folderId, userId }
            });
            if (!folder) {
                return NextResponse.json({ error: "Folder not found" }, { status: 404 });
            }
        }

        // Calculate order for the book in the new destination
        const lastBook = await prisma.book.findFirst({
            where: { userId, folderId: folderId || null },
            orderBy: { order: 'desc' }
        });
        const newOrder = lastBook ? lastBook.order + 1 : 0;

        const updatedBook = await prisma.book.update({
            where: { id: bookId },
            data: {
                folderId: folderId || null,
                order: newOrder
            },
        });

        return NextResponse.json(updatedBook);

    } catch (error) {
        console.error("Error moving book:", error);
        return NextResponse.json({ error: "Failed to move book" }, { status: 500 });
    }
}
