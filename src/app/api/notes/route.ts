import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bookId, pageNumber, content, paragraphContext } = body;

        if (!bookId || typeof pageNumber !== "number" || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify book ownership
        const book = await prisma.book.findUnique({
            where: {
                id: bookId,
                userId: (session.user as any).id,
            }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        const note = await prisma.note.create({
            data: {
                bookId,
                pageNumber,
                content,
                paragraphContext,
                userId: (session.user as any).id,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}
